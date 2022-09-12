import {Sink, helpers} from "@dataflow-designer/dataflow-core";
import {Limit} from "../index";
import {assert} from "chai";
import {spy} from "sinon";
const {TestSource} = helpers;

describe("Limit", function() {
    it("is function", function() {
        assert.isFunction(Limit);
    });

    it("naturally ends after 50", async function() {
        const src = new TestSource({sendNum: 49});
        const limit = new Limit();
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(limit);
        limit.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 50);
        assert.deepEqual(sinkSpy.args[0][0].data, {count: 0});
        assert.deepEqual(sinkSpy.args[49][0].data, {count: 49});
    });

    it("stops sending after 100", async function() {
        const src = new TestSource({sendNum: 1000});
        const limit = new Limit();
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(limit);
        limit.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 100);
        assert.deepEqual(sinkSpy.args[0][0].data, {count: 0});
        assert.deepEqual(sinkSpy.args[99][0].data, {count: 99});
    });

    it("stops sending after max", async function() {
        const src = new TestSource({sendNum: 1000});
        const limit = new Limit({max: 500});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(limit);
        limit.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 500);
        assert.deepEqual(sinkSpy.args[0][0].data, {count: 0});
        assert.deepEqual(sinkSpy.args[499][0].data, {count: 499});
    });

    it("aborts after 100");
    it("aborts after max");
});
