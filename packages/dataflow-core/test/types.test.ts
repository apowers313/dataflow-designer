import {Sink, Source, Through, isComponent, isSink, isSource, isThrough} from "../index";
import {pull, push, through} from "./helpers/helpers";
import {assert} from "chai";

const src = new Source({pull});
const sink = new Sink({push});
const thru = new Through({through});

describe("types", function() {
    it("are functions", function() {
        assert.isFunction(isSource);
        assert.isFunction(isSink);
        assert.isFunction(isThrough);
        assert.isFunction(isComponent);
    });

    describe("isSource", function() {
        it("Source", function() {
            assert.isTrue(isSource(src));
        });

        it("Sink", function() {
            assert.isFalse(isSource(sink));
        });

        it("Through", function() {
            assert.isFalse(isSource(thru));
        });
    });

    describe("isSink", function() {
        it("Sink", function() {
            assert.isTrue(isSink(sink));
        });

        it("Source", function() {
            assert.isFalse(isSink(src));
        });

        it("Through", function() {
            assert.isFalse(isSink(thru));
        });
    });

    describe("isThrough", function() {
        it("Through", function() {
            assert.isTrue(isThrough(thru));
        });

        it("Source", function() {
            assert.isFalse(isThrough(src));
        });

        it("Sink", function() {
            assert.isFalse(isThrough(sink));
        });
    });

    describe("isComponent", function() {
        it("Source", function() {
            assert.isTrue(isComponent(src));
        });

        it("Sink", function() {
            assert.isTrue(isComponent(sink));
        });

        it("Through", function() {
            assert.isTrue(isComponent(thru));
        });

        it("null", function() {
            assert.isFalse(isComponent(null));
        });

        it("empty object", function() {
            assert.isFalse(isComponent({}));
        });
    });
});
