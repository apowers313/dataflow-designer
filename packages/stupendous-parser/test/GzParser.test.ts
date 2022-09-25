import {CsvParser, GzParser} from "../index";
import {Readable} from "node:stream";
import {WritableStream} from "node:stream/web";
import {assert} from "chai";
import {createReadStream} from "node:fs";
import path from "node:path";
import {spy} from "sinon";

describe("GzParser", function() {
    it("is function", function() {
        assert.isFunction(GzParser);
    });

    it("decode", async function() {
        this.timeout(250);
        this.slow(250);

        const cp = new CsvParser();
        const zp = new GzParser();
        const inputFile = Readable.toWeb(createReadStream(path.resolve(__dirname, "helpers/data/test1.csv.gz")));
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
