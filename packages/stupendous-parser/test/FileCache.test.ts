import {FileCache} from "../lib/FileCache";
import {WritableStream} from "node:stream/web";
import {assert} from "chai";
import {spy} from "sinon";

describe("FileCache", function() {
    it("stores and recovers single file", async function() {
        const writeSpy = spy();
        const outputFile = new WritableStream({
            write: writeSpy,
        });
        const fc = new FileCache();
        await fc.write("file1.json", {foo: "bar"});
        await fc.write("file1.json", {foo: "baz"});
        await fc.write("file1.json", {foo: "bat"});
        const cacheEntries = [... fc];
        assert.strictEqual(cacheEntries.length, 1);
        await cacheEntries[0].toStream().pipeTo(outputFile);

        assert.strictEqual(writeSpy.args.length, 3);
        assert.deepEqual(writeSpy.args[0][0], {foo: "bar"});
        assert.deepEqual(writeSpy.args[1][0], {foo: "baz"});
        assert.deepEqual(writeSpy.args[2][0], {foo: "bat"});
    });

    it("stores in memory and recovers single file", async function() {
        const writeSpy = spy();
        const outputFile = new WritableStream({
            write: writeSpy,
        });
        const fc = new FileCache({inMemory: true});
        await fc.write("file1.json", {foo: "bar"});
        await fc.write("file1.json", {foo: "baz"});
        await fc.write("file1.json", {foo: "bat"});
        const cacheEntries = [... fc];
        assert.strictEqual(cacheEntries.length, 1);
        await cacheEntries[0].toStream().pipeTo(outputFile);

        assert.strictEqual(writeSpy.args.length, 3);
        assert.deepEqual(writeSpy.args[0][0], {foo: "bar"});
        assert.deepEqual(writeSpy.args[1][0], {foo: "baz"});
        assert.deepEqual(writeSpy.args[2][0], {foo: "bat"});
    });

    it("stores and recovers multiple files", async function() {
        const writeSpy1 = spy();
        const writeSpy2 = spy();
        const writeSpy3 = spy();
        const output1 = new WritableStream({write: writeSpy1});
        const output2 = new WritableStream({write: writeSpy2});
        const output3 = new WritableStream({write: writeSpy3});

        const fc = new FileCache();
        await fc.write("file1.json", {foo: "bar"});
        await fc.write("file2.json", {foo: "baz"});
        await fc.write("file3.json", {foo: "bat"});
        const cacheEntries = [... fc];
        assert.strictEqual(cacheEntries.length, 3);
        await cacheEntries[0].toStream().pipeTo(output1);
        await cacheEntries[1].toStream().pipeTo(output2);
        await cacheEntries[2].toStream().pipeTo(output3);

        assert.strictEqual(writeSpy1.args.length, 1);
        assert.strictEqual(writeSpy2.args.length, 1);
        assert.strictEqual(writeSpy3.args.length, 1);
        assert.deepEqual(writeSpy1.args[0][0], {foo: "bar"});
        assert.deepEqual(writeSpy2.args[0][0], {foo: "baz"});
        assert.deepEqual(writeSpy3.args[0][0], {foo: "bat"});
    });

    it("closes files over fdLimit", async function() {
        const writeSpy1 = spy();
        const writeSpy2 = spy();
        const writeSpy3 = spy();
        const output1 = new WritableStream({write: writeSpy1});
        const output2 = new WritableStream({write: writeSpy2});
        const output3 = new WritableStream({write: writeSpy3});

        const fc = new FileCache({fdLimit: 1});
        for (let i = 0; i < 30; i++) {
            await fc.write(`file${(i % 3) + 1}.json`, {count: i});
        }

        const cacheEntries = [... fc];
        assert.strictEqual(cacheEntries.length, 3);
        await cacheEntries[0].toStream().pipeTo(output1);
        await cacheEntries[1].toStream().pipeTo(output2);
        await cacheEntries[2].toStream().pipeTo(output3);

        assert.strictEqual(writeSpy1.args.length, 10);
        assert.strictEqual(writeSpy2.args.length, 10);
        assert.strictEqual(writeSpy3.args.length, 10);
        assert.deepEqual(writeSpy1.args[0][0], {count: 0});
        assert.deepEqual(writeSpy2.args[0][0], {count: 1});
        assert.deepEqual(writeSpy3.args[0][0], {count: 2});
        assert.deepEqual(writeSpy1.args[9][0], {count: 27});
        assert.deepEqual(writeSpy2.args[9][0], {count: 28});
        assert.deepEqual(writeSpy3.args[9][0], {count: 29});
    });

    it("pretends to close files over fdLimit in memory", async function() {
        const writeSpy1 = spy();
        const writeSpy2 = spy();
        const writeSpy3 = spy();
        const output1 = new WritableStream({write: writeSpy1});
        const output2 = new WritableStream({write: writeSpy2});
        const output3 = new WritableStream({write: writeSpy3});

        const fc = new FileCache({fdLimit: 1, inMemory: true});
        for (let i = 0; i < 60; i++) {
            await fc.write(`file${(i % 3) + 1}.json`, {count: i});
        }

        const cacheEntries = [... fc];
        assert.strictEqual(cacheEntries.length, 3);
        await cacheEntries[0].toStream().pipeTo(output1);
        await cacheEntries[1].toStream().pipeTo(output2);
        await cacheEntries[2].toStream().pipeTo(output3);

        assert.strictEqual(writeSpy1.args.length, 20);
        assert.strictEqual(writeSpy2.args.length, 20);
        assert.strictEqual(writeSpy3.args.length, 20);
        assert.deepEqual(writeSpy1.args[0][0], {count: 0});
        assert.deepEqual(writeSpy2.args[0][0], {count: 1});
        assert.deepEqual(writeSpy3.args[0][0], {count: 2});
        assert.deepEqual(writeSpy1.args[19][0], {count: 57});
        assert.deepEqual(writeSpy2.args[19][0], {count: 58});
        assert.deepEqual(writeSpy3.args[19][0], {count: 59});
    });
});
