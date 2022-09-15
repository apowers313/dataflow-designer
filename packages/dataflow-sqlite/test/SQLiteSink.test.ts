/* eslint-disable camelcase */
import {DatabaseMap, SQLiteSink} from "../index";
import {Sink, helpers} from "@dataflow-designer/dataflow-core";
import {assert} from "chai";
import {spy} from "sinon";
import temp from "temp";
const {objectSource} = helpers;
import Database from "better-sqlite3";

describe("SQLiteSink", function() {
    it("is function", function() {
        assert.isFunction(SQLiteSink);
    });

    it("creates table");

    it("simple write", async function() {
        const src = objectSource([
            {drink: "beer", food: "burger", number: 3.14159},
            {drink: "wine", food: "steak", number: 2.71828},
            {drink: "vodka", food: "borscht", number: 1.41421},
        ]);
        const dbFile = temp.path();
        console.log("dbFile", dbFile);

        // const dbFile = "/tmp/test.db";
        const tableName = "simple_write";
        const sink = new SQLiteSink({
            databaseFile: dbFile,
            tableName,
            mapping: new DatabaseMap([
                {dbCol: "drnk", objPath: "drink", type: "text"},
                {dbCol: "fud", objPath: "food", type: "text"},
                {dbCol: "num", objPath: "number", type: "float"},
            ]),
            fileMustExist: false,
            freshTable: true,
        });
        src.channels[0].pipe(sink);
        await src.complete();

        console.log("dbFile", dbFile);
        const db = new Database(dbFile, {fileMustExist: true});
        const tblDesc = db.pragma(`table_info(${tableName})`);
        console.log("tblDesc", tblDesc);
        assert.deepEqual(tblDesc, [
            {cid: 0, name: "drnk", type: "TEXT", notnull: 0, dflt_value: null, pk: 0},
            {cid: 1, name: "fud", type: "TEXT", notnull: 0, dflt_value: null, pk: 0},
            {cid: 2, name: "num", type: "float", notnull: 0, dflt_value: null, pk: 0},
        ]);
        const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
        console.log("rows", rows);
        assert.strictEqual(rows.length, 3);
        assert.deepEqual(rows, [
            {drnk: "beer", fud: "burger", num: 3.14159},
            {drnk: "wine", fud: "steak", num: 2.71828},
            {drnk: "vodka", fud: "borscht", num: 1.41421},
        ]);
        // console.log("sinkSpy.callCount", sinkSpy.callCount);
        // console.log("sinkSpy.args[0][0]", sinkSpy.args[0][0]);
        // assert.strictEqual(sinkSpy.callCount, 3);
        // assert.deepEqual(sinkSpy.args[0][0].data, {count: 0});
        // assert.deepEqual(sinkSpy.args[10][0].data, {count: 10});
    });

    // it("delete me", async function() {
    //     const db = new Database("/tmp/foobar.db", {fileMustExist: false});
    //     try {
    //         db.exec("DROP TABLE person");
    //         console.log("Table dropped")
    //     } catch(err) {
    //         console.log("Table not dropped");
    //     }
    //     db.exec("CREATE TABLE person (id int NOT NULL, first_name varchar(255) NOT NULL, last_name varchar(255) NOT NULL, phone varchar(32), email varchar(255))");
    //     const newPerson = db.prepare("INSERT INTO person (id, first_name, last_name, phone, email) VALUES (?, ?, ?, ?, ?)");
    //     const args = [0, "Bob", "Smith", "408-555-1212", "bob@gmail.com"]
    //     newPerson.run(... args);
    //     newPerson.run(1, "Jane", "Doe", "925-555-1212", "jane@hotmail.com");
    //     const getPerson = db.prepare("SELECT * FROM person");
    //     const personIter = getPerson.iterate();
    //     const res1 = personIter.next();
    //     console.log("res1", res1);
    //     const res2 = personIter.next();
    //     console.log("res2", res2);
    // });
});
