import {Sink, helpers} from "@dataflow-designer/dataflow-core";
import chai, {assert} from "chai";
import {ValidateSchema} from "../index";
const {objectSource} = helpers;
import {spy} from "sinon";
chai.config.truncateThreshold = 0;

describe("ValidateSchema", function() {
    it("is function", function() {
        assert.isFunction(ValidateSchema);
    });

    it("validates a simple schema", async function() {
        const src = objectSource([
            {foo: 1, bar: "yup"},
            {foo: 2, bar: "whee"},
            {foo: "nope", bar: "whee"},
            {foo: 3, bar: 4},
            {foo: 5, bar: "again"},
            {bar: "boom"},
            {foo: 7, bar: "again", baz: "ugh"},
        ]);
        // const src = objectSource([{one: 1}, {two: 2}, {three: 3}]);
        const thru = new ValidateSchema({
            schema: {
                type: "object",
                properties: {
                    foo: {type: "integer"},
                    bar: {type: "string"},
                },
                required: ["foo"],
                additionalProperties: false,
            },
        });
        const okSpy = spy();
        const okSink = new Sink({push: okSpy, writeAll: true});
        const errorSpy = spy();
        const errorSink = new Sink({push: errorSpy, writeAll: true});
        src.channels[0].pipe(thru);
        thru.channels[0].pipe(okSink);
        thru.channels[1].pipe(errorSink);
        await src.complete();

        console.log("okSpy", okSpy.args);
        console.log("okSpy", okSpy.callCount);
        console.log("errorSpy", errorSpy.args);
        console.log("errorSpy", errorSpy.callCount);
        assert.strictEqual(okSpy.callCount, 5);
        assert.isTrue(okSpy.args[0][0].isMetadata());
        assert.isTrue(okSpy.args[1][0].isData());
        assert.isTrue(okSpy.args[2][0].isData());
        assert.isTrue(okSpy.args[3][0].isData());
        assert.isTrue(okSpy.args[4][0].isMetadata());
        assert.deepEqual(okSpy.args[1][0].data, {foo: 1, bar: "yup"});
        assert.deepEqual(okSpy.args[2][0].data, {foo: 2, bar: "whee"});
        assert.deepEqual(okSpy.args[3][0].data, {foo: 5, bar: "again"});

        assert.strictEqual(errorSpy.callCount, 6);
        assert.isTrue(errorSpy.args[0][0].isMetadata());
        assert.isTrue(errorSpy.args[1][0].isError());
        assert.isTrue(errorSpy.args[2][0].isError());
        assert.isTrue(errorSpy.args[3][0].isError());
        assert.isTrue(errorSpy.args[4][0].isError());
        assert.isTrue(errorSpy.args[5][0].isMetadata());
        console.log("errorSpy.args[1][0]", errorSpy.args[1][0]);
        console.log("errorSpy.args[1][0].error.validationErrors", errorSpy.args[1][0].error.validationErrors);
        assert.strictEqual(errorSpy.args[1][0].error.message, "JSON Schema Validation Error");
        assert.strictEqual(errorSpy.args[1][0].error.validationErrors.length, 1);
        assert.deepEqual(errorSpy.args[1][0].error.validationErrors[0], {
            keyword: "type",
            instancePath: "/foo",
            schemaPath: "#/properties/foo/type",
            params: {type: "integer"},
            message: "must be integer",
        });
        assert.deepEqual(errorSpy.args[1][0].data.data, {foo: "nope", bar: "whee"});
        assert.deepEqual(errorSpy.args[2][0].data.data, {foo: 3, bar: 4});
        assert.deepEqual(errorSpy.args[3][0].data.data, {bar: "boom"});
        assert.deepEqual(errorSpy.args[4][0].data.data, {foo: 7, bar: "again", baz: "ugh"});
    });
});
