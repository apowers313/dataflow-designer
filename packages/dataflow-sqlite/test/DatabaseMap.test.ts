/* eslint-disable camelcase */
import {Sink, helpers} from "@dataflow-designer/dataflow-core";
import {DatabaseMap} from "../index";
import {assert} from "chai";
import {spy} from "sinon";
const {objectSource} = helpers;
import Database from "better-sqlite3";

describe("DatabaseMap", function() {
    it("is function", function() {
        assert.isFunction(DatabaseMap);
    });

    describe("add", function() {
        it("adds mapping", function() {
            const dbm = new DatabaseMap();
            dbm.add({
                dbCol: "foo",
                objPath: "foo",
                type: "text",
                attributes: [],
            });
        });

        it("from constructor");
    });

    describe("tableDesc", function() {
        it("describes fields", function() {
            const dbm = new DatabaseMap([
                {dbCol: "id", objPath: "id", type: "integer", attributes: ["required", "unique"]},
                {dbCol: "first_name", objPath: "firstName", type: "text", attributes: ["required"]},
                {dbCol: "last_name", objPath: "lastName", type: "text", attributes: ["required"]},
                {dbCol: "badge_number", objPath: "badgeNo", type: "integer", attributes: []},
            ]);
            const tableDesc = dbm.tableDesc();
            assert.strictEqual(tableDesc, "id integer NOT NULL UNIQUE, first_name text NOT NULL, last_name text NOT NULL, badge_number integer");
        });
    });

    describe("size", function() {
        it("is zero", function() {
            const dbm = new DatabaseMap();
            assert.strictEqual(dbm.size, 0);
        });

        it("equals added colums", function() {
            const dbm = new DatabaseMap([
                {dbCol: "id", objPath: "id", type: "integer", attributes: ["required", "unique"]},
                {dbCol: "first_name", objPath: "firstName", type: "text", attributes: ["required"]},
                {dbCol: "last_name", objPath: "lastName", type: "text", attributes: ["required"]},
                {dbCol: "badge_number", objPath: "badgeNo", type: "integer", attributes: []},
            ]);
            assert.strictEqual(dbm.size, 4);
        });
    });

    describe("paramsDesc", function() {
        it("creates parameter string", function() {
            const dbm = new DatabaseMap([
                {dbCol: "id", objPath: "id", type: "integer", attributes: ["required", "unique"]},
                {dbCol: "first_name", objPath: "firstName", type: "text", attributes: ["required"]},
                {dbCol: "last_name", objPath: "lastName", type: "text", attributes: ["required"]},
                {dbCol: "badge_number", objPath: "badgeNo", type: "integer", attributes: []},
            ]);
            assert.strictEqual(dbm.paramsDesc(), ":id, :first_name, :last_name, :badge_number");
        });
    });

    describe("objToParams", function() {
        it("creates parameter object", function() {
            const dbm = new DatabaseMap([
                {dbCol: "id", objPath: "id", type: "integer", attributes: ["required", "unique"]},
                {dbCol: "first_name", objPath: "firstName", type: "text", attributes: ["required"]},
                {dbCol: "last_name", objPath: "lastName", type: "text", attributes: ["required"]},
                {dbCol: "badge_number", objPath: "badgeNo", type: "integer", attributes: []},
            ]);
            assert.deepEqual(
                dbm.objToParams({id: 0, firstName: "Bob", lastName: "Smith", badgeNo: "ABC123"}),
                {id: 0, first_name: "Bob", last_name: "Smith", badge_number: "ABC123"},
            );
        });

        it("creates parameter object using object paths", function() {
            const dbm = new DatabaseMap([
                {dbCol: "id", objPath: "some.val.id", type: "integer", attributes: ["required", "unique"]},
                {dbCol: "first_name", objPath: "person.firstName", type: "text", attributes: ["required"]},
                {dbCol: "last_name", objPath: "person.lastName", type: "text", attributes: ["required"]},
                {dbCol: "badge_number", objPath: "hidden.badgeNo", type: "integer", attributes: []},
            ]);
            assert.deepEqual(
                dbm.objToParams({some: {val: {id: 0}}, person: {firstName: "Bob", lastName: "Smith"}, hidden: {badgeNo: "ABC123"}}),
                {id: 0, first_name: "Bob", last_name: "Smith", badge_number: "ABC123"},
            );
        });
    });

    describe("rowToObj", function() {
        it("creates a result object", function() {
            const dbm = new DatabaseMap([
                {dbCol: "id", objPath: "id", type: "integer", attributes: ["required", "unique"]},
                {dbCol: "first_name", objPath: "firstName", type: "text", attributes: ["required"]},
                {dbCol: "last_name", objPath: "lastName", type: "text", attributes: ["required"]},
                {dbCol: "badge_number", objPath: "badgeNo", type: "integer", attributes: []},
            ]);
            assert.deepEqual(
                dbm.rowToObj({id: 0, first_name: "Bob", last_name: "Smith", badge_number: "ABC123"}),
                {id: 0, firstName: "Bob", lastName: "Smith", badgeNo: "ABC123"},
            );
        });

        it("sets objects based on object path", function() {
            const dbm = new DatabaseMap([
                {dbCol: "id", objPath: "some.val.id", type: "integer", attributes: ["required", "unique"]},
                {dbCol: "first_name", objPath: "person.firstName", type: "text", attributes: ["required"]},
                {dbCol: "last_name", objPath: "person.lastName", type: "text", attributes: ["required"]},
                {dbCol: "badge_number", objPath: "hidden.badgeNo", type: "integer", attributes: []},
            ]);
            assert.deepEqual(
                dbm.rowToObj({id: 0, first_name: "Bob", last_name: "Smith", badge_number: "ABC123"}),
                {some: {val: {id: 0}}, person: {firstName: "Bob", lastName: "Smith"}, hidden: {badgeNo: "ABC123"}},
            );
        });
    });
});
