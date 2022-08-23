import {CsvParser, GzParser, JsonParser, Parser, ZipParser} from "../index";
import {ParserDecodeOpts} from "../lib/ParserOpts";
import {Readable} from "node:stream";
import {WritableStream} from "node:stream/web";
import {assert} from "chai";
import {createReadStream} from "fs";
import {spy} from "sinon";

describe("Parser", function() {
    it("is function", function() {
        assert.isFunction(Parser);
    });

    it("getParser", function() {
        let p = Parser.getParser("csv")?.parser;
        assert.strictEqual(p, CsvParser);
        p = Parser.getParser("zip")?.parser;
        assert.strictEqual(p, ZipParser);
        p = Parser.getParser("gzip")?.parser;
        assert.strictEqual(p, GzParser);
        p = Parser.getParser("json")?.parser;
        assert.strictEqual(p, JsonParser);
        p = Parser.getParser("asfdadsf")?.parser;
        assert.isUndefined(p);
    });

    it("getParserList", function() {
        assert.deepEqual(Parser.getParserList(), ["csv", "json", "ndjson", "jsonl", "gzip", "zip", "tar"]);
    });

    it("findExtForPath", function() {
        let p = Parser.findExtForPath("foo.csv.zip");
        assert.strictEqual(p, ".zip");
        p = Parser.findExtForPath("areallylongfilename-foo_bar.json.zip");
        assert.strictEqual(p, ".zip");
        p = Parser.findExtForPath("areallylongfilename-foo_bar.json");
        assert.strictEqual(p, ".json");
        p = Parser.findExtForPath("video.mpeg");
        assert.isUndefined(p);
    });

    it("getParsersForExt", function() {
        let e = Parser.getParsersForExt(".zip");
        assert.deepEqual(e, ["zip"]);
        e = Parser.getParsersForExt(".csv");
        assert.deepEqual(e, ["csv"]);
        e = Parser.getParsersForExt(".json");
        assert.deepEqual(e, ["json"]);
        e = Parser.getParsersForExt("asdfasdasdf");
        assert.isUndefined(e);
    });

    it("getParserStreamForExt");

    describe("getParserStreamForPath", function() {
        it(".csv.zip", async function() {
            const filename = "test/helpers/test1.csv.zip";
            const opts: ParserDecodeOpts = {zip: {parserOpts: {csv: {header: true}}}};
            const p = Parser.getParserStreamForPath(filename, "decode", opts);
            if (!p) {
                throw new Error("couldn't find parser");
            }

            const src = Readable.toWeb(createReadStream(filename));
            const writeSpy = spy();
            const dest = new WritableStream({write: writeSpy});
            await src
                .pipeThrough(p)
                .pipeTo(dest);

            assert.strictEqual(writeSpy.callCount, 100);
            assert.deepEqual(writeSpy.args[0][0], {
                "Region": "Australia and Oceania",
                "Country": "Tuvalu",
                "Item Type": "Baby Food",
                "Sales Channel": "Offline",
                "Order Priority": "H",
                "Order Date": "5/28/2010",
                "Order ID": "669165933",
                "Ship Date": "6/27/2010",
                "Units Sold": "9925",
                "Unit Price": "255.28",
                "Unit Cost": "159.42",
                "Total Revenue": "2533654.00",
                "Total Cost": "1582243.50",
                "Total Profit": "951410.50",
            });
            assert.deepEqual(writeSpy.args[99][0], {
                "Region": "Sub-Saharan Africa",
                "Country": "Mozambique",
                "Item Type": "Household",
                "Sales Channel": "Offline",
                "Order Priority": "L",
                "Order Date": "2/10/2012",
                "Order ID": "665095412",
                "Ship Date": "2/15/2012",
                "Units Sold": "5367",
                "Unit Price": "668.27",
                "Unit Cost": "502.54",
                "Total Revenue": "3586605.09",
                "Total Cost": "2697132.18",
                "Total Profit": "889472.91",
            });
        });

        it(".json", async function() {
            this.timeout(250);
            this.slow(250);

            const filename = "./test/helpers/congress.json";
            const p = Parser.getParserStreamForPath(filename, "decode", {
                json: {path: "objects", outputType: "array", includeKeys: true},
            });
            if (!p) {
                throw new Error("couldn't find parser");
            }

            const inputFile = Readable.toWeb(createReadStream(filename));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile.pipeThrough(p).pipeTo(testWritable);

            assert.strictEqual(writeSpy.callCount, 436);
            assert.strictEqual(writeSpy.args[0][0].key, 0);
            assert.strictEqual(writeSpy.args[0][0].value.person.name, "Rep. Robert Aderholt [R-AL4]");
            assert.strictEqual(writeSpy.args[435][0].key, 435);
            assert.strictEqual(writeSpy.args[435][0].value.person.name, "Rep. Mike Flood [R-NE1]");
        });
    });
});
