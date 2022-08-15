import {JsonParser} from "../index";
import {Readable} from "node:stream";
import {WritableStream} from "node:stream/web";
import {assert} from "chai";
import {createReadStream} from "node:fs";
import {spy} from "sinon";

describe("JsonParser", function() {
    it("is function", function() {
        assert.isFunction(JsonParser);
    });

    describe("decode", function() {
        it("congress.json", async function() {
            this.timeout(250);
            this.slow(250);

            const jp = new JsonParser();
            const inputFile = Readable.toWeb(createReadStream("./test/helpers/congress.json"));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile.pipeThrough(jp.decode({
                // path: /0\.data\.\d+/,
                path: "objects",
                // path: "0.data.0",
                outputType: "array",
            })).pipeTo(testWritable);

            assert.strictEqual(writeSpy.callCount, 436);
            assert.strictEqual(writeSpy.args[0][0].key, 0);
            assert.strictEqual(writeSpy.args[0][0].value.person.name, "Rep. Robert Aderholt [R-AL4]");
            assert.strictEqual(writeSpy.args[435][0].key, 435);
            assert.strictEqual(writeSpy.args[435][0].value.person.name, "Rep. Mike Flood [R-NE1]");
        });

        it("emoji.json", async function() {
            this.timeout(250);
            this.slow(250);

            const jp = new JsonParser();
            const inputFile = Readable.toWeb(createReadStream("./test/helpers/emoji.json"));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile.pipeThrough(jp.decode({
                // path: /0\.data\.\d+/,
                path: "",
                // path: "0.data.0",
                outputType: "object",
            })).pipeTo(testWritable);

            assert.strictEqual(writeSpy.callCount, 1874);
            assert.deepEqual(writeSpy.args[0][0], {
                key: "+1",
                value: "https://github.githubassets.com/images/icons/emoji/unicode/1f44d.png?v8",
            });
            assert.deepEqual(writeSpy.args[1873][0], {
                key: "zzz",
                value: "https://github.githubassets.com/images/icons/emoji/unicode/1f4a4.png?v8",
            });
        });

        it("sample.json", async function() {
            this.timeout(250);
            this.slow(250);

            const jp = new JsonParser();
            const inputFile = Readable.toWeb(createReadStream("./test/helpers/sample.json"));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile.pipeThrough(jp.decode({
                // path: /0\.data\.\d+/,
                path: "0.data",
                // path: "0.data.0",
                outputType: "array",
            })).pipeTo(testWritable);

            assert.strictEqual(writeSpy.callCount, 462);
            assert.deepEqual(writeSpy.args[0][0], {
                key: 0,
                value: {
                    "age": "18-19",
                    "count": 314,
                    "field": "利点がある",
                    "investigation-year": 1987,
                    "sex": "M",
                },
            });
            assert.deepEqual(writeSpy.args[461][0], {
                key: 461,
                value: {
                    "age": "40-44",
                    "count": 11,
                    "field": "不詳",
                    "investigation-year": 2010,
                    "sex": "F",
                },
            });
        });
    });
});
