import {DatabaseMap, SQLiteSource} from "../index";
import {Sink, helpers} from "@dataflow-designer/dataflow-core";
import {assert} from "chai";
import path from "node:path";
import {spy} from "sinon";

describe("SQLiteSource", function() {
    it("is function", function() {
        assert.isFunction(SQLiteSource);
    });

    it("simple read without mapping", async function() {
        const dbPath = path.resolve(__dirname, "./helpers/data/simple.db");
        const src = new SQLiteSource({databaseFile: dbPath, tableName: "simple_write"});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 3);
        assert.deepEqual(sinkSpy.args[0][0].data, {drnk: "beer", fud: "burger", num: 3.14159});
        assert.deepEqual(sinkSpy.args[1][0].data, {drnk: "wine", fud: "steak", num: 2.71828});
        assert.deepEqual(sinkSpy.args[2][0].data, {drnk: "vodka", fud: "borscht", num: 1.41421});
    });

    it("simple read with mapping", async function() {
        const dbPath = path.resolve(__dirname, "./helpers/data/simple.db");
        const src = new SQLiteSource({
            databaseFile: dbPath,
            tableName: "simple_write",
            mapping: new DatabaseMap([
                {dbCol: "drnk", objPath: "drink", type: "text"},
                {dbCol: "fud", objPath: "food", type: "text"},
                {dbCol: "num", objPath: "number", type: "float"},
            ]),
        });
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 3);
        assert.deepEqual(sinkSpy.args[0][0].data, {drink: "beer", food: "burger", number: 3.14159});
        assert.deepEqual(sinkSpy.args[1][0].data, {drink: "wine", food: "steak", number: 2.71828});
        assert.deepEqual(sinkSpy.args[2][0].data, {drink: "vodka", food: "borscht", number: 1.41421});
    });
});
