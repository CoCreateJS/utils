const MAGIC = new Uint8Array([0x43, 0x43, 0x53, 0x31]); // CCS1
const SINGLE = 0;
const CHUNK = 1;
const HEADER_SIZE = 25;
const MAX_TRANSFER_SIZE = 256 * 1024 * 1024;
const MAX_BUFFERED_SIZE = 512 * 1024 * 1024;
const MAX_CONCURRENT_TRANSFERS = 16;
const TRANSFER_TIMEOUT = 60_000;
let nextTransferId = 1;

export const DEFAULT_FRAME_SIZE = 64 * 1024;

export function toUint8Array(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    throw new TypeError("Segment payload must be binary");
}

function frame(payload, type, id = 0, offset = 0, total = payload.byteLength) {
    const result = new Uint8Array(HEADER_SIZE + payload.byteLength);
    result.set(MAGIC);
    result[4] = type;
    const view = new DataView(result.buffer);
    view.setUint32(5, id);
    view.setBigUint64(9, BigInt(offset));
    view.setBigUint64(17, BigInt(total));
    result.set(payload, HEADER_SIZE);
    return result;
}

/** Split a byte payload into transportable frames. Small payloads pass through unchanged. */
export function createSegmentId() {
    const id = nextTransferId++ >>> 0;
    if (nextTransferId > 0xffffffff) nextTransferId = 1;
    return id || createSegmentId();
}

export function* createFrames(payload, frameSize = DEFAULT_FRAME_SIZE, options = {}) {
    payload = toUint8Array(payload);
    if (!Number.isSafeInteger(frameSize) || frameSize <= 0) {
        throw new RangeError("frameSize must be a positive safe integer");
    }
    if (payload.byteLength > MAX_TRANSFER_SIZE) {
        throw new RangeError(`Segment transfer exceeds ${MAX_TRANSFER_SIZE} bytes`);
    }
    const requestedId = options?.id;
    if (requestedId !== undefined && (!Number.isInteger(requestedId) || requestedId <= 0 || requestedId > 0xffffffff)) {
        throw new RangeError("Segment id must be a nonzero uint32");
    }
    if (payload.byteLength <= frameSize && requestedId === undefined) {
        yield payload;
        return;
    }

    const id = requestedId ?? createSegmentId();
    if (payload.byteLength <= frameSize) {
        yield frame(payload, SINGLE, id);
        return;
    }
    for (let offset = 0; offset < payload.byteLength; offset += frameSize) {
        yield frame(
            payload.subarray(offset, Math.min(offset + frameSize, payload.byteLength)),
            CHUNK,
            id,
            offset,
            payload.byteLength
        );
    }
}

/** Reconstruct complete byte payloads from direct messages or ordered CCS1 frames. */
export class SegmentReceiver {
    constructor() {
        this.transfers = new Map();
        this.leases = new WeakMap();
        this.bufferedBytes = 0;
    }

    clear() {
        for (const transfer of this.transfers.values()) clearTimeout(transfer.timeout);
        this.transfers.clear();
        this.bufferedBytes = 0;
    }

    push(value) {
        const bytes = toUint8Array(value);
        if (bytes.byteLength < HEADER_SIZE || !MAGIC.every((byte, i) => bytes[i] === byte)) {
            if (!bytes.byteLength || bytes.byteLength > MAX_TRANSFER_SIZE ||
                this.bufferedBytes + bytes.byteLength > MAX_BUFFERED_SIZE) {
                throw new RangeError("Invalid or oversized segment payload");
            }
            this.bufferedBytes += bytes.byteLength;
            this.leases.set(bytes, bytes.byteLength);
            return bytes;
        }
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const type = bytes[4];
        const id = view.getUint32(5);
        const offset = Number(view.getBigUint64(9));
        const total = Number(view.getBigUint64(17));
        const data = bytes.subarray(HEADER_SIZE);

        if (!Number.isSafeInteger(total) || total > MAX_TRANSFER_SIZE ||
            !Number.isSafeInteger(offset) || offset + data.byteLength > total) {
            throw new RangeError("Invalid segment transfer bounds");
        }
        if (type === SINGLE) {
            if (offset || total !== data.byteLength) throw new TypeError("Invalid single segment frame");
            if (this.bufferedBytes + total > MAX_BUFFERED_SIZE) {
                throw new RangeError("Segment aggregate buffer capacity exceeded");
            }
            this.bufferedBytes += total;
            this.leases.set(data, total);
            return data;
        }
        if (type !== CHUNK || total === 0) throw new TypeError("Invalid segment frame type");

        let transfer = this.transfers.get(id);
        if (!transfer) {
            if (offset !== 0 || this.transfers.size >= MAX_CONCURRENT_TRANSFERS ||
                this.bufferedBytes + total > MAX_BUFFERED_SIZE) {
                throw new RangeError("Segment capacity exceeded or first frame missing");
            }
            transfer = { total, buffer: new Uint8Array(total), received: 0, timeout: null };
            transfer.timeout = setTimeout(() => this.delete(id), TRANSFER_TIMEOUT);
            this.transfers.set(id, transfer);
            this.bufferedBytes += total;
        }
        if (transfer.total !== total || offset !== transfer.received) {
            this.delete(id);
            throw new TypeError("Segments are invalid, duplicated, or out of order");
        }
        transfer.buffer.set(data, offset);
        transfer.received += data.byteLength;
        if (transfer.received < total) return null;
        if (transfer.received !== total) {
            this.delete(id);
            throw new TypeError("Segment transfer length mismatch");
        }
        const result = transfer.buffer;
        clearTimeout(transfer.timeout);
        this.transfers.delete(id);
        this.leases.set(result, transfer.total);
        return result;
    }

    /** Push a frame and retain its transfer id with the reconstructed payload. */
    pushSegment(value) {
        const bytes = toUint8Array(value);
        const framed = bytes.byteLength >= HEADER_SIZE && MAGIC.every((byte, i) => bytes[i] === byte);
        const id = framed ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(5) : null;
        const payload = this.push(bytes);
        return payload ? { id, payload } : null;
    }

    release(payload) {
        const size = this.leases.get(payload);
        if (size === undefined) return;
        this.leases.delete(payload);
        this.bufferedBytes -= size;
    }

    delete(id) {
        const transfer = this.transfers.get(id);
        if (!transfer) return;
        clearTimeout(transfer.timeout);
        this.transfers.delete(id);
        this.bufferedBytes -= transfer.total;
    }
}

export { SegmentReceiver as BinaryReceiver };
