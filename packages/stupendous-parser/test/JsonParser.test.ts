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

    it("decode", async function() {
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
