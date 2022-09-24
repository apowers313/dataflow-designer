import {FileStat, t} from "tar";
import {TarParser} from "../index";
import {Writable} from "node:stream";
import {assert} from "chai";
import {createWriteStream} from "node:fs";
import {objectStream} from "./helpers/helpers";
import {path as tempPath} from "temp";

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

            const tempFile = tempPath();
            const outputFile = Writable.toWeb(createWriteStream(tempFile, {encoding: "utf8"}));
            await inputStream.pipeThrough(tp.encode()).pipeTo(outputFile);

            const entries: Array<FileStat> = [];
            await t({
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

            const tempFile = tempPath();
            const outputFile = Writable.toWeb(createWriteStream(tempFile, {encoding: "utf8"}));
            await inputStream.pipeThrough(tp.encode()).pipeTo(outputFile);

            const entries: Array<FileStat> = [];
            await t({
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
