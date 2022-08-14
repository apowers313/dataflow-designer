import {CsvParser} from "../index";
import {assert} from "chai";
// import { spy } from "sinon";

describe("CsvParser", function() {
    it("is function", function() {
        assert.isFunction(CsvParser);
    });

    // it("decode", async function() {
    //     const src = new CsvSource({
    //         filename: test1File,
    //         csvOptions: {
    //             delimiter: ",",
    //             columns: true,
    //         },
    //     });

    //     const tempFile = temp.path();
    //     const sink = new CsvSink({filename: tempFile, stringifierOptions: {header: true}});
    //     src.channels[0].pipe(sink);
    //     await src.complete();
    //     // await timeout(1000);

    //     const testBuf = fs.readFileSync(test1File);
    //     const tempBuf = fs.readFileSync(tempFile);
    //     assert.isTrue(testBuf.equals(tempBuf));
    // });

    // it("encode", async function() {
    //     const src = new CsvSource({
    //         filename: test1File,
    //         csvOptions: {
    //             delimiter: ",",
    //             columns: true,
    //         },
    //     });

    //     const sinkSpy = spy();
    //     const sink = new Sink({push: sinkSpy});
    //     src.channels[0].pipe(sink);
    //     await src.complete();

    //     assert.strictEqual(sinkSpy.callCount, 100);
    //     assert.deepEqual(sinkSpy.args[0][0].data, {
    //         "Region": "Australia and Oceania",
    //         "Country": "Tuvalu",
    //         "Item Type": "Baby Food",
    //         "Sales Channel": "Offline",
    //         "Order Priority": "H",
    //         "Order Date": "5/28/2010",
    //         "Order ID": "669165933",
    //         "Ship Date": "6/27/2010",
    //         "Units Sold": "9925",
    //         "Unit Price": "255.28",
    //         "Unit Cost": "159.42",
    //         "Total Revenue": "2533654.00",
    //         "Total Cost": "1582243.50",
    //         "Total Profit": "951410.50",
    //     });
    //     assert.deepEqual(sinkSpy.args[99][0].data, {
    //         "Region": "Sub-Saharan Africa",
    //         "Country": "Mozambique",
    //         "Item Type": "Household",
    //         "Sales Channel": "Offline",
    //         "Order Priority": "L",
    //         "Order Date": "2/10/2012",
    //         "Order ID": "665095412",
    //         "Ship Date": "2/15/2012",
    //         "Units Sold": "5367",
    //         "Unit Price": "668.27",
    //         "Unit Cost": "502.54",
    //         "Total Revenue": "3586605.09",
    //         "Total Cost": "2697132.18",
    //         "Total Profit": "889472.91",
    //     });
    // });
});
