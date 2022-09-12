import {Sink, helpers} from "@dataflow-designer/dataflow-core";
import {Sample} from "../index";
import {assert} from "chai";
import {spy} from "sinon";
const {TestSource} = helpers;

describe("Sample", function() {
    it("is function", function() {
        assert.isFunction(Sample);
    });

    it("samples every 10th packet", async function() {
        const src = new TestSource({sendNum: 1000});
        const thru = new Sample();
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(thru);
        thru.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 101);
        assert.deepEqual(sinkSpy.args[0][0].data, {count: 0});
        assert.deepEqual(sinkSpy.args[100][0].data, {count: 1000});
    });

    it("samples every 100th packet", async function() {
        const src = new TestSource({sendNum: 1000});
        const thru = new Sample({interval: 100});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(thru);
        thru.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 11);
        assert.deepEqual(sinkSpy.args[0][0].data, {count: 0});
        assert.deepEqual(sinkSpy.args[10][0].data, {count: 1000});
    });

    it("samples every 33rd packet", async function() {
        const src = new TestSource({sendNum: 1000});
        const thru = new Sample({interval: 33});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(thru);
        thru.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 31);
        assert.deepEqual(sinkSpy.args[0][0].data, {count: 0});
        assert.deepEqual(sinkSpy.args[30][0].data, {count: 990});
    });

    it("throws on invalid interval", function() {
        assert.throws(() => {
            new Sample({interval: 0});
        }, RangeError, "interval must be one or larger, got: '0'");

        assert.throws(() => {
            new Sample({interval: -100});
        }, RangeError, "interval must be one or larger, got: '-100'");
    });

    it("samples a random interval that is 10-ish", async function() {
        this.retries(100);

        const src = new TestSource({sendNum: 1000});
        const thru = new Sample({random: true, interval: 10});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(thru);
        thru.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 101);
        // assert.deepEqual(sinkSpy.args[0][0].data, {count: 0});
        // assert.deepEqual(sinkSpy.args[100][0].data, {count: 1000});
    });

    it("samples a random interval that is 100-ish", async function() {
        this.retries(100);

        const src = new TestSource({sendNum: 1000});
        const thru = new Sample({random: true, interval: 100});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(thru);
        thru.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 11);
        // assert.deepEqual(sinkSpy.args[0][0].data, {count: 0});
        // assert.deepEqual(sinkSpy.args[100][0].data, {count: 1000});
    });
});
