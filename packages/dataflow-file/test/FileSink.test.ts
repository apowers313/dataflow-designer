import {FileSink} from "../index";
import {assert} from "chai";
import {helpers} from "@dataflow-designer/dataflow-core";
import {readFileSync} from "fs";
import temp from "temp";
const {objectSource} = helpers;

describe("FileSink", function() {
    it("is function", function() {
        assert.isFunction(FileSink);
    });

    it("writes to a json file", async function() {
        const src = objectSource([
            {one: "1"},
            {two: "2"},
            {three: "3"},
        ]);
        const temppath = temp.path({suffix: ".json"});
        const sink = new FileSink({file: temppath});
        src.channels[0].pipe(sink);
        await src.complete();

        const tempBuf = readFileSync(temppath).toString();
        assert.strictEqual(tempBuf, "[{\"one\":\"1\"},{\"two\":\"2\"},{\"three\":\"3\"}]");
    });

    it("writes to a csv file", async function() {
        const src = objectSource([
            {foo: "1", bar: "beer"},
            {foo: "2", bar: "wine"},
            {foo: "3", bar: "tequila!"},
        ]);

        const temppath = temp.path({suffix: ".csv"});
        const sink = new FileSink({file: temppath});
        src.channels[0].pipe(sink);
        await src.complete();

        const tempBuf = readFileSync(temppath).toString();
        assert.strictEqual(tempBuf,
            "foo,bar\n" +
            "1,beer\n" +
            "2,wine\n" +
            "3,tequila!\n",
        );
    });
});
