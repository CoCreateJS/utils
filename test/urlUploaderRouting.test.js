import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/modules/file/references/urlUploader.js', import.meta.url), 'utf8');
test('URL uploader sends successful and failed file responses through the coordinator', async () => {
    const sent = [];
    const context = vm.createContext({ Buffer, URL, console,
        server: { send: data => sent.push(data), wsManager: { send() { assert.fail('Raw socket send must not be used'); } } },
        fetch: async () => new Response(Uint8Array.from([1, 2, 3]), { headers: { 'content-type': 'image/png' } }) });
    vm.runInContext(source, context);
    const data = { socket: {}, file: { src: 'https://example.test/image.png' } };
    await context.fetchFileFromURL(data);
    assert.equal(sent[0], data);
    assert.equal(data.file.src, 'AQID');
    const invalid = { socket: {} };
    await context.fetchFileFromURL(invalid);
    assert.equal(sent[1], invalid);
    assert.equal(invalid.error, 'Missing file object or file source URL.');
});
