import {CsvParser, ZipParser} from "../index";
import {Readable} from "node:stream";
import {assert} from "chai";
import {createReadStream} from "node:fs";
import {spy} from "sinon";
import compressing from "compressing";
import {once} from "node:events";

describe("ZipParser", function() {
    it("is function", function() {
        assert.isFunction(ZipParser);
    });

    it("delete me", async function() {
        function handleFinish(): void {
            console.log("finished!");
        }

        function handleError(... args: any[]): void {
            console.log(... args);
        }

        function onEntry(header: any, stream: any, next: any): void {
            console.log("onEntry");
            stream.on("end", next);

            // header.type => file | directory
            // header.name => path name

            if (header.type === "file") {
                console.log("file");
                stream.pipe(process.stdout);
            } else { // directory
                console.log("directory");
                // mkdirp(path.join(destDir, header.name), (err) => {
                //     if (err) {
                //         return handleError(err);
                //     }

                // });
            }
        }

        const inputFile = createReadStream("test/helpers/test1.csv.zip");
        const p1 = once(inputFile, "error");
        const compressor = inputFile.pipe(new compressing.zip.UncompressStream());
        const pList = [
            // p1,
            // once(compressor, "error"),
            // once(compressor, "finish"), // uncompressing is done
            once(compressor, "entry"),
        ];
        // const res = await Promise.race(pList.map((p) => p.then(() => [p])));
        const res = await Promise.race(pList);
        console.log("res", res);
        const fin = await res;
        console.log("fin.length", fin.length);
        console.log("fin[0]", fin[0]);
        console.log("fin[1]", fin[1]);
        console.log("fin[2]", fin[2]);
    });

    it("delete me 1", function() {
        function handleFinish(): void {
            console.log("finished!");
        }

        function handleError(... args: any[]): void {
            console.log(... args);
        }

        function onEntry(header: any, stream: any, next: any): void {
            console.log("onEntry");
            stream.on("end", next);

            // header.type => file | directory
            // header.name => path name

            if (header.type === "file") {
                console.log("file");
                stream.pipe(process.stdout);
            } else { // directory
                console.log("directory");
                // mkdirp(path.join(destDir, header.name), (err) => {
                //     if (err) {
                //         return handleError(err);
                //     }

                // });
            }
        }

        createReadStream("test/helpers/test1.csv.zip")
            .on("error", handleError)
            .pipe(new compressing.zip.UncompressStream())
            .on("error", handleError)
            .on("finish", handleFinish) // uncompressing is done
            .on("entry", onEntry);
    });

    it.only("decode", async function() {
        // this.timeout(60 * 1000);
        // this.slow(60 * 1000);

        const cp = new CsvParser();
        console.log("new zip parser");
        const zp = new ZipParser();
        const inputFile = Readable.toWeb(createReadStream("test/helpers/test1.csv.zip"));
        const writeSpy = spy();
        const testWritable = new WritableStream({write: writeSpy});
        console.log("running pipe");
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
