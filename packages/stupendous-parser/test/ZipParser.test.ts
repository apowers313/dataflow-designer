import {Readable, Writable} from "node:stream";
import {createReadStream, createWriteStream} from "node:fs";
import AdmZip from "adm-zip";
import {ZipParser} from "../index";
import {assert} from "chai";
import {objectStream} from "./helpers/helpers";
import {spy} from "sinon";
import temp from "temp";

describe("ZipParser", function() {
    it("is function", function() {
        assert.isFunction(ZipParser);
    });

    describe("decode", function() {
        it("two csvs", async function() {
            this.timeout(5 * 1000);
            this.slow(5 * 1000);

            const zp = new ZipParser();
            const inputFile = Readable.toWeb(createReadStream("test/helpers/csvdata.zip"));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile
                .pipeThrough(zp.decode({parserOpts: {csv: {header: true, skipEmptyLines: true, trim: true}}}))
                .pipeTo(testWritable);

            assert.strictEqual(writeSpy.callCount, 112);
            assert.deepEqual(writeSpy.args[0][0], {1958: "340", 1959: "360", 1960: "417", Month: "JAN"});
            assert.deepEqual(writeSpy.args[11][0], {1958: "337", 1959: "405", 1960: "432", Month: "DEC"});
            assert.deepEqual(writeSpy.args[12][0], {
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
            assert.deepEqual(writeSpy.args[111][0], {
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

        it("decode", async function() {
            const zp = new ZipParser();
            const inputFile = Readable.toWeb(createReadStream("test/helpers/test1.csv.zip"));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile
                .pipeThrough(zp.decode({parserOpts: {csv: {header: true}}}))
                .pipeTo(testWritable);

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
    });

    describe("encode", function() {
        it("simple", async function() {
            const zp = new ZipParser();

            const inputStream = objectStream([
                {foo: "bar", filename: "file1.json"},
                {foo: "baz", filename: "file1.json"},
                {foo: "bat", filename: "file1.json"},
            ]);

            const tempFile = temp.path();
            const outputFile = Writable.toWeb(createWriteStream(tempFile, {encoding: "utf8"}));
            await inputStream.pipeThrough(zp.encode()).pipeTo(outputFile);

            const zip = new AdmZip(tempFile);
            const zipEntries = zip.getEntries();
            assert.strictEqual(zipEntries.length, 1);
            assert.strictEqual(zipEntries[0].entryName, "file1.json");
            assert.strictEqual(zipEntries[0].getData().toString(), "[{\"foo\":\"bar\"},{\"foo\":\"baz\"},{\"foo\":\"bat\"}]");
        });

        it("one csv");
        it("one json");
        it.only("multiple files", async function() {
            // this.timeout(10 * 1000);
            const zp = new ZipParser();

            const inputStream = objectStream([
                {foo: "bar", filename: "file1.json"},
                {foo: "baz", filename: "file2.json"},
                {foo: "bat", filename: "file3.json"},
            ]);

            const tempFile = temp.path();
            const outputFile = Writable.toWeb(createWriteStream(tempFile, {encoding: "utf8"}));
            // const writeSpy = spy();
            // const outputFile = new WritableStream({
            //     write: writeSpy,
            // });
            // console.log("tempFile", tempFile);
            await inputStream.pipeThrough(zp.encode()).pipeTo(outputFile);

            const zip = new AdmZip(tempFile);
            const zipEntries = zip.getEntries();
            // console.log("zipEntries", zipEntries[0]);
            // console.log("zipEntries data", zipEntries[0].getData().toString());
            // console.log("zipEntries", zipEntries[0].toJSON());
            // console.log("zipEntries[0].header", zipEntries[0].header.toJSON());
            // assert.strictEqual(zipEntries.length, 3);
            assert.strictEqual(zipEntries[0].entryName, "file1.json");
            assert.strictEqual(zipEntries[0].getData().toString(), "[{\"foo\":\"bar\"}]");
            assert.strictEqual(zipEntries[1].entryName, "file2.json");
            assert.strictEqual(zipEntries[1].getData().toString(), "[{\"foo\":\"baz\"}]");
            assert.strictEqual(zipEntries[2].entryName, "file3.json");
            assert.strictEqual(zipEntries[2].getData().toString(), "[{\"foo\":\"bat\"}]");

            // console.log("writeSpy", writeSpy);
        });
        it("multiple file types");
    });
});
