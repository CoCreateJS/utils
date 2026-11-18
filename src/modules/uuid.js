/********************************************************************************
 * Copyright (C) 2026 CoCreate and Contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 ********************************************************************************/

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * Generates an RFC 9562 compliant UUID Version 7 (Universally Unique Identifier).
 * 
 * UUIDv7 stores the Unix timestamp in its most significant 48 bits, so standard
 * UUID strings sort chronologically at millisecond resolution.
 *
 * @returns {string} A standard 36-character UUIDv7.
 * 
 * @example
 * // Returns standard UUIDv7: "0194f6c0-7c00-7abc-8def-0123456789ab"
 * uuid(); 
 * 
 */
export function uuid() {
    // UUIDv7: 48-bit Unix timestamp, version 7, and 74 random bits.
    const bytes = new Uint8Array(16);
    const cryptoObj = isBrowser ? (window.crypto || window.msCrypto) : globalThis.crypto;
    
    if (cryptoObj && cryptoObj.getRandomValues) {
        cryptoObj.getRandomValues(bytes);
    } else {
        // Fallback for environments without a Web Crypto API.
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }

    let timestamp = Date.now();
    for (let i = 5; i >= 0; i--) {
        bytes[i] = timestamp & 0xff;
        timestamp = Math.floor(timestamp / 256);
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    const fullUuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

    return fullUuid;
}

/**
 * Generates a random hexadecimal unique identifier.
 *
 * @param {number} [length=8] - The desired identifier length (maximum 36).
 * @returns {string} A random hexadecimal identifier.
 */
export function uid(length = 8) {
    const targetLength = Math.max(0, Math.min(Math.floor(Number(length) || 0), 36));
    const bytes = new Uint8Array(Math.ceil(targetLength / 2));
    const cryptoObj = isBrowser ? (window.crypto || window.msCrypto) : globalThis.crypto;

    if (cryptoObj && cryptoObj.getRandomValues) {
        cryptoObj.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }

    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0"))
        .join("")
        .substring(0, targetLength);
}

export default uuid;
