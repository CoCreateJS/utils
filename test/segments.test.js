import assert from 'node:assert/strict';
import test from 'node:test';
import { SegmentReceiver, createFrames } from '../src/modules/segments.js';

test('segments pass small byte payloads through unchanged', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    const frames = [...createFrames(bytes, 16)];
    const receiver = new SegmentReceiver();
    assert.equal(frames.length, 1);
    assert.equal(frames[0], bytes);
    const complete = receiver.push(frames[0]);
    assert.equal(complete, bytes);
    receiver.release(complete);
    assert.equal(receiver.bufferedBytes, 0);
});

test('segments preserve byte boundaries and reconstruct interleaved transfers', () => {
    const first = Uint8Array.from({ length: 101 }, (_, index) => index & 255);
    const second = Uint8Array.from({ length: 79 }, (_, index) => 255 - index);
    const firstFrames = [...createFrames(first, 17)];
    const secondFrames = [...createFrames(second, 13)];
    const receiver = new SegmentReceiver();
    let firstResult;
    let secondResult;
    for (let index = 0; index < Math.max(firstFrames.length, secondFrames.length); index++) {
        if (firstFrames[index]) firstResult = receiver.push(firstFrames[index]) || firstResult;
        if (secondFrames[index]) secondResult = receiver.push(secondFrames[index]) || secondResult;
    }
    assert.deepEqual(firstResult, first);
    assert.deepEqual(secondResult, second);
    receiver.release(firstResult);
    receiver.release(secondResult);
    assert.equal(receiver.transfers.size, 0);
    assert.equal(receiver.bufferedBytes, 0);
});

test('segment receiver rejects missing, duplicated and out-of-order frames', () => {
    const payload = new Uint8Array(40).fill(9);
    const [first, second] = createFrames(payload, 20);
    const receiver = new SegmentReceiver();
    assert.throws(() => receiver.push(second), /first frame missing/);
    receiver.push(first);
    assert.throws(() => receiver.push(first), /out of order/);
    receiver.clear();
    assert.equal(receiver.bufferedBytes, 0);
});
