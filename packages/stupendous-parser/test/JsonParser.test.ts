import {CsvParser, JsonParser} from "../index";
import {Readable, Writable} from "node:stream";
import {buf2str, objectStream} from "./helpers/helpers";
import {createReadStream, createWriteStream, readFileSync} from "node:fs";
import {WritableStream} from "node:stream/web";
import {assert} from "chai";
import path from "node:path";
import {spy} from "sinon";
import temp from "temp";

describe("JsonParser", function() {
    it("is function", function() {
        assert.isFunction(JsonParser);
    });

    describe("encode", function() {
        it("ndjson", async function() {
            this.timeout(250);
            this.slow(250);

            const jp = new JsonParser();
            const inputStream = objectStream([
                {foo: "bar"},
                {foo: "baz"},
                {foo: "bat"},
            ]);

            const tempFile = temp.path();
            const outputFile = Writable.toWeb(createWriteStream(tempFile, {encoding: "utf8"}));
            await inputStream.pipeThrough(jp.encode({ndjson: true})).pipeTo(outputFile);

            const testBuf = Buffer.from(
                "{\"foo\":\"bar\"}\n" +
                "{\"foo\":\"baz\"}\n" +
                "{\"foo\":\"bat\"}",
            );
            const tempBuf = readFileSync(tempFile);
            assert.isTrue(testBuf.equals(tempBuf));
        });

        it("json", async function() {
            const jp = new JsonParser();

            const inputStream = objectStream([
                {foo: "bar"},
                {foo: "baz"},
                {foo: "bat"},
            ]);

            const tempFile = temp.path();
            const outputFile = Writable.toWeb(createWriteStream(tempFile, {encoding: "utf8"}));
            await inputStream.pipeThrough(jp.encode({makeArray: true})).pipeTo(outputFile);

            const testBuf = Buffer.from(
                "[{\"foo\":\"bar\"}," +
                "{\"foo\":\"baz\"}," +
                "{\"foo\":\"bat\"}]",
            );
            const tempBuf = readFileSync(tempFile);
            assert.isTrue(testBuf.equals(tempBuf));
        });

        it("csv to ndjson", async function() {
            const test1File = path.resolve(__dirname, "helpers/data/test1.csv");

            const cp = new CsvParser();
            const jp = new JsonParser();
            const inputFile = Readable.toWeb(createReadStream(test1File));
            const writeSpy = spy();
            const outputStream = new WritableStream({write: writeSpy});
            await inputFile
                .pipeThrough(cp.decode({columns: true}))
                .pipeThrough(jp.encode({ndjson: true}))
                .pipeTo(outputStream);

            assert.strictEqual(writeSpy.callCount, 100);
            assert.strictEqual(buf2str(writeSpy.args[0][0]), "{\"Region\":\"Australia and Oceania\",\"Country\":\"Tuvalu\",\"Item Type\":\"Baby Food\",\"Sales Channel\":\"Offline\",\"Order Priority\":\"H\",\"Order Date\":\"5/28/2010\",\"Order ID\":\"669165933\",\"Ship Date\":\"6/27/2010\",\"Units Sold\":\"9925\",\"Unit Price\":\"255.28\",\"Unit Cost\":\"159.42\",\"Total Revenue\":\"2533654.00\",\"Total Cost\":\"1582243.50\",\"Total Profit\":\"951410.50\"}");
            assert.strictEqual(buf2str(writeSpy.args[99][0]), "\n{\"Region\":\"Sub-Saharan Africa\",\"Country\":\"Mozambique\",\"Item Type\":\"Household\",\"Sales Channel\":\"Offline\",\"Order Priority\":\"L\",\"Order Date\":\"2/10/2012\",\"Order ID\":\"665095412\",\"Ship Date\":\"2/15/2012\",\"Units Sold\":\"5367\",\"Unit Price\":\"668.27\",\"Unit Cost\":\"502.54\",\"Total Revenue\":\"3586605.09\",\"Total Cost\":\"2697132.18\",\"Total Profit\":\"889472.91\"}");
        });

        it("csv to json", async function() {
            this.slow(1000);

            const test1File = path.resolve(__dirname, "helpers/data/test1.csv");
            function buf2str(buf: Uint8Array): string {
                return new TextDecoder().decode(buf);
            }

            const cp = new CsvParser();
            const jp = new JsonParser();
            const inputFile = Readable.toWeb(createReadStream(test1File));
            let resStr = "";
            const outputStream = new WritableStream({write: (chunk): void => {
                resStr += buf2str(chunk);
            }});
            await inputFile
                .pipeThrough(cp.decode({columns: true}))
                .pipeThrough(jp.encode({}))
                .pipeTo(outputStream);

            const resObjs = resStr.split("},{").map((str) => {
                if (str[0] !== "[") {
                    str = `{${str}`;
                }

                if (str[str.length - 1] !== "]") {
                    str = `${str}}`;
                }

                return str;
            });

            assert.strictEqual(resStr.split("},{").length, 100);
            assert.strictEqual(resObjs[0], "[{\"Region\":\"Australia and Oceania\",\"Country\":\"Tuvalu\",\"Item Type\":\"Baby Food\",\"Sales Channel\":\"Offline\",\"Order Priority\":\"H\",\"Order Date\":\"5/28/2010\",\"Order ID\":\"669165933\",\"Ship Date\":\"6/27/2010\",\"Units Sold\":\"9925\",\"Unit Price\":\"255.28\",\"Unit Cost\":\"159.42\",\"Total Revenue\":\"2533654.00\",\"Total Cost\":\"1582243.50\",\"Total Profit\":\"951410.50\"}");
            assert.strictEqual(resObjs[1], "{\"Region\":\"Central America and the Caribbean\",\"Country\":\"Grenada\",\"Item Type\":\"Cereal\",\"Sales Channel\":\"Online\",\"Order Priority\":\"C\",\"Order Date\":\"8/22/2012\",\"Order ID\":\"963881480\",\"Ship Date\":\"9/15/2012\",\"Units Sold\":\"2804\",\"Unit Price\":\"205.70\",\"Unit Cost\":\"117.11\",\"Total Revenue\":\"576782.80\",\"Total Cost\":\"328376.44\",\"Total Profit\":\"248406.36\"}");
            assert.strictEqual(resObjs[98], "{\"Region\":\"North America\",\"Country\":\"Mexico\",\"Item Type\":\"Personal Care\",\"Sales Channel\":\"Offline\",\"Order Priority\":\"M\",\"Order Date\":\"7/30/2015\",\"Order ID\":\"559427106\",\"Ship Date\":\"8/8/2015\",\"Units Sold\":\"5767\",\"Unit Price\":\"81.73\",\"Unit Cost\":\"56.67\",\"Total Revenue\":\"471336.91\",\"Total Cost\":\"326815.89\",\"Total Profit\":\"144521.02\"}");
            assert.strictEqual(resObjs[99], "{\"Region\":\"Sub-Saharan Africa\",\"Country\":\"Mozambique\",\"Item Type\":\"Household\",\"Sales Channel\":\"Offline\",\"Order Priority\":\"L\",\"Order Date\":\"2/10/2012\",\"Order ID\":\"665095412\",\"Ship Date\":\"2/15/2012\",\"Units Sold\":\"5367\",\"Unit Price\":\"668.27\",\"Unit Cost\":\"502.54\",\"Total Revenue\":\"3586605.09\",\"Total Cost\":\"2697132.18\",\"Total Profit\":\"889472.91\"}]");
        });
    });

    describe("decode", function() {
        it("ndjson", async function() {
            this.timeout(250);
            this.slow(250);

            const jp = new JsonParser();
            const inputFile = Readable.toWeb(createReadStream(path.resolve(__dirname, "helpers/data/yelp.ndjson")));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile.pipeThrough(jp.decode({ndjson: true, includeKeys: true})).pipeTo(testWritable);

            assert.strictEqual(writeSpy.callCount, 5);
            assert.strictEqual(writeSpy.args[0][0].key, 0);
            assert.strictEqual(writeSpy.args[0][0].value.url, "https://www.yelp.com/search?find_desc=Desserts&find_loc=San+Jose,+CA&start=0");
            assert.strictEqual(writeSpy.args[0][0].value.result.extractorData.data[0].group[0].Business[0].text, "Milk & Wood");
            assert.strictEqual(writeSpy.args[4][0].value.url, "https://www.yelp.com/search?find_desc=Desserts&find_loc=San+Jose,+CA&start=40");
            assert.strictEqual(writeSpy.args[4][0].value.result.extractorData.data[0].group[0].Business[0].text, "The Sweet Corner");
        });

        it("congress.json", async function() {
            this.slow(500);

            const jp = new JsonParser();
            const inputFile = Readable.toWeb(createReadStream(path.resolve(__dirname, "helpers/data/congress.json")));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile.pipeThrough(jp.decode({
                includeKeys: true,
                path: "objects",
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
            const inputFile = Readable.toWeb(createReadStream(path.resolve(__dirname, "helpers/data/emoji.json")));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile.pipeThrough(jp.decode({
                includeKeys: true,
                path: "",
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
            const inputFile = Readable.toWeb(createReadStream(path.resolve(__dirname, "helpers/data/sample.json")));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile.pipeThrough(jp.decode({
                includeKeys: true,
                path: "0.data",
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
