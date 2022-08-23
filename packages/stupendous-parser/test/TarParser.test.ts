import {Readable, Writable} from "node:stream";
import {createReadStream, createWriteStream} from "node:fs";
import tar from "tar";
import {TarParser} from "../index";
import {assert} from "chai";
import {objectStream} from "./helpers/helpers";
import {spy} from "sinon";
import temp from "temp";
import {finished} from "node:stream/promises";

describe("TarParser", function() {
    it("is function", function() {
        assert.isFunction(TarParser);
    });

    describe("encode", function() {
        it("simple", async function() {
            const tp = new TarParser();

            const inputStream = objectStream([
                {foo: "bar", filename: "file1.json"},
                {foo: "baz", filename: "file1.json"},
                {foo: "bat", filename: "file1.json"},
            ]);

            const tempFile = temp.path();
            const outputFile = Writable.toWeb(createWriteStream(tempFile, {encoding: "utf8"}));
            await inputStream.pipeThrough(tp.encode()).pipeTo(outputFile);

            const entries: Array<tar.FileStat> = [];
            await tar.t({
                file: tempFile,
                onentry: (entry) => {
                    entries.push(entry);
                },
            });
            assert.strictEqual(entries.length, 1);
            assert.strictEqual(entries[0].header.path, "file1.json");
            assert.strictEqual(entries[0].header.size, 43);
        });

        it("multifile", async function() {
            const tp = new TarParser();

            const inputStream = objectStream([
                {foo: "bar", filename: "file1.json"},
                {foo: "baz", filename: "file2.json"},
                {foo: "bat", filename: "file3.json"},
            ]);

            const tempFile = temp.path();
            const outputFile = Writable.toWeb(createWriteStream(tempFile, {encoding: "utf8"}));
            await inputStream.pipeThrough(tp.encode()).pipeTo(outputFile);

            const entries: Array<tar.FileStat> = [];
            await tar.t({
                file: tempFile,
                onentry: (entry) => {
                    entries.push(entry);
                },
            });
            assert.strictEqual(entries.length, 3);
            assert.strictEqual(entries[0].header.path, "file1.json");
            assert.strictEqual(entries[0].header.size, 15);
            assert.strictEqual(entries[1].header.path, "file2.json");
            assert.strictEqual(entries[1].header.size, 15);
            assert.strictEqual(entries[2].header.path, "file3.json");
            assert.strictEqual(entries[2].header.size, 15);
        });
    });
});
