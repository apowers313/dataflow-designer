import {CsvParser, ZipParser} from "../index";
import {Readable} from "node:stream";
import {assert} from "chai";
import {createReadStream} from "node:fs";
import {spy} from "sinon";

describe("ZipParser", function() {
    it("is function", function() {
        assert.isFunction(ZipParser);
    });

    describe("decode", function() {
        it.only("two csvs", async function() {
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
            console.log("writeSpy.args[0][0]", writeSpy.args[0][0]);
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
            const cp = new CsvParser();
            const zp = new ZipParser();
            const inputFile = Readable.toWeb(createReadStream("test/helpers/test1.csv.zip"));
            const writeSpy = spy();
            const testWritable = new WritableStream({write: writeSpy});
            await inputFile
                .pipeThrough(zp.decode())
                .pipeThrough(cp.decode({columns: true}))
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
});
