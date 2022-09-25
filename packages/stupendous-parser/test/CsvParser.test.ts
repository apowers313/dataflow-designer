import {Readable, Writable} from "node:stream";
import {createReadStream, createWriteStream, readFileSync} from "node:fs";
import {CsvParser} from "../index";
import {WritableStream} from "node:stream/web";
import {assert} from "chai";
import path from "node:path";
import {spy} from "sinon";
import temp from "temp";

describe("CsvParser", function() {
    it("is function", function() {
        assert.isFunction(CsvParser);
    });

    describe("decode", function() {
        it("test1.csv", async function() {
            this.timeout(250);
            this.slow(250);
            const test1File = path.resolve(__dirname, "helpers/data/test1.csv");

            const cp = new CsvParser();
            const inputFile = Readable.toWeb(createReadStream(test1File));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile.pipeThrough(cp.decode({columns: true})).pipeTo(testWritable);

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

        it("airline.csv", async function() {
            this.timeout(250);
            this.slow(250);

            const cp = new CsvParser();
            const inputFile = Readable.toWeb(createReadStream(path.resolve(__dirname, "helpers/data/airtravel.csv")));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile.pipeThrough(cp.decode({header: true, skipEmptyLines: true, trim: true})).pipeTo(testWritable);

            assert.strictEqual(writeSpy.callCount, 12);
            assert.deepEqual(writeSpy.args[0][0], {1958: "340", 1959: "360", 1960: "417", Month: "JAN"});
            assert.deepEqual(writeSpy.args[11][0], {1958: "337", 1959: "405", 1960: "432", Month: "DEC"});
        });
    });

    it("encode", async function() {
        const test1File = path.resolve(__dirname, "helpers/data/test1.csv");

        const cp = new CsvParser();
        const inputFile = Readable.toWeb(createReadStream(test1File));
        const tempFile = temp.path();
        const outputFile = Writable.toWeb(createWriteStream(tempFile, {encoding: "utf8"}));
        await inputFile
            .pipeThrough(cp.decode({columns: true}))
            .pipeThrough(cp.encode({header: true}))
            .pipeTo(outputFile);

        let expectedBuf = readFileSync(test1File);
        let outputBuf = readFileSync(tempFile);

        if (process.platform === "win32") {
            assert.strictEqual(
                expectedBuf.toString().replaceAll("\r\n", "\n"),
                outputBuf.toString(),
            );
            expectedBuf = expectedBuf.slice(0, expectedBuf.length - 2);
            outputBuf = outputBuf.slice(0, outputBuf.length - 1);
        } else {
            assert.isTrue(expectedBuf.equals(outputBuf));
        }
    });
});
