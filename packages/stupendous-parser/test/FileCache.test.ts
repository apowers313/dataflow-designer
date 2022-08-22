import {FileCache} from "../lib/FileCache";
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

        // await inputStream.pipeThrough(zp.encode()).pipeTo(outputFile);
        console.log("writeSpy.args", writeSpy.args);
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

        // await inputStream.pipeThrough(zp.encode()).pipeTo(outputFile);
        console.log("writeSpy.args", writeSpy.args);
        assert.strictEqual(writeSpy.args.length, 3);
        assert.deepEqual(writeSpy.args[0][0], {foo: "bar"});
        assert.deepEqual(writeSpy.args[1][0], {foo: "baz"});
        assert.deepEqual(writeSpy.args[2][0], {foo: "bat"});
    });

    it("multiple file types");

    it("stores and recovers multiple files");
});
