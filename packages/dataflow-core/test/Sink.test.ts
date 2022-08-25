import {Chunk, ChunkCollection, Sink, Source, Through} from "../index";
import {TestSource, push, through} from "./helpers/helpers";
import {assert} from "chai";
import {spy} from "sinon";
import stdMocks from "std-mocks";

describe("Sink", function() {
    it("is a class", function() {
        assert.isFunction(Sink);
    });

    it("is not readable", function() {
        const s = new Sink({push});
        assert.isFalse(s.isReadable);
    });

    it("is writable", function() {
        const s = new Sink({push});
        assert.isTrue(s.isWritable);
    });

    it("merges two streams", async function() {
        this.slow(250);
        this.retries(4);

        const src1 = new TestSource({delay: 5, countBy: 5, sendNum: 5});
        const src2 = new TestSource({delay: 13, countBy: 13, sendNum: 5});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});

        src1.channels[0].pipe(sink);
        src2.channels[0].pipe(sink);
        await src1.complete();
        assert.strictEqual(sinkSpy.callCount, 10);
        const args = sinkSpy.args.map((a) => a[0]);

        assert.deepEqual(args, [
            {type: "data", data: {count: 5}},
            {type: "data", data: {count: 10}},
            {type: "data", data: {count: 13}},
            {type: "data", data: {count: 15}},
            {type: "data", data: {count: 20}},
            {type: "data", data: {count: 26}},
            {type: "data", data: {count: 25}},
            {type: "data", data: {count: 39}},
            {type: "data", data: {count: 52}},
            {type: "data", data: {count: 65}},
        ]);
    });

    it("zipper merges two streams", async function() {
        this.slow(250);
        this.retries(4);

        const src1 = new TestSource({delay: 5, countBy: 5, sendNum: 5});
        const src2 = new TestSource({delay: 13, countBy: 13, sendNum: 5});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy, mode: "zipper"});

        src1.channels[0].pipe(sink);
        src2.channels[0].pipe(sink);
        await src2.complete();
        assert.strictEqual(sinkSpy.callCount, 10);
        const args = sinkSpy.args.map((a) => a[0]);

        assert.deepEqual(args, [
            {type: "data", data: {count: 5}},
            {type: "data", data: {count: 13}},
            {type: "data", data: {count: 10}},
            {type: "data", data: {count: 26}},
            {type: "data", data: {count: 15}},
            {type: "data", data: {count: 39}},
            {type: "data", data: {count: 20}},
            {type: "data", data: {count: 52}},
            {type: "data", data: {count: 25}},
            {type: "data", data: {count: 65}},
        ]);
    });

    it("batch merges two streams", async function() {
        this.slow(250);
        this.retries(4);

        const src1 = new TestSource({delay: 5, countBy: 5, sendNum: 5});
        const src2 = new TestSource({delay: 13, countBy: 13, sendNum: 5});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy, mode: "batch"});

        src1.channels[0].pipe(sink);
        src2.channels[0].pipe(sink);
        await src1.complete();

        const args = sinkSpy.args.map((a) => a[0]);

        const ch0results = [5, 10, 15, 20, 25];
        const ch1results = [13, 26, 39, 52, 65];
        args.forEach((arg, idx) => {
            if (!(arg instanceof ChunkCollection)) {
                throw new Error("expected all args to be a chunk collection");
            }

            assert.strictEqual(arg.size, 2);

            console.log("arg", arg);
            let chunk = Chunk.create({type: "data", data: {count: ch0results[idx]}});
            console.log("arg.get(0)", arg.get(0));
            assert.deepEqual(arg.get(0), chunk);
            chunk = Chunk.create({type: "data", data: {count: ch1results[idx]}});
            console.log("arg.get(1)", arg.get(1));
            assert.deepEqual(arg.get(1), chunk);
        });
    });

    describe("writeAll", function() {
        it("catches metadata", async function() {
            const src = new TestSource();
            const sinkSpy = spy();
            const sink = new Sink({push: sinkSpy, writeAll: true});
            src.channels[0].pipe(sink);
            // await src.init();
            await src.complete();

            assert.strictEqual(sinkSpy.callCount, 13);
            const chunk0 = sinkSpy.args[0][0];
            assert.isTrue(chunk0.isMetadata());
            assert.isTrue(chunk0.metadata.has("dataflow", "start"));
            assert.deepEqual(sinkSpy.args[1][0], {type: "data", data: {count: 0}});
            assert.deepEqual(sinkSpy.args[11][0], {type: "data", data: {count: 10}});
            const chunk12 = sinkSpy.args[12][0];
            assert.isTrue(chunk12.isMetadata());
            assert.isTrue(chunk12.metadata.has("dataflow", "end"));
        });
        it("catches errors");
    });

    describe("complete", function() {
        it("handles simplest of pipes", async function() {
            const src = new TestSource();
            const sinkSpy = spy();
            const sink = new Sink({push: sinkSpy, name: "sink1"});
            src.channels[0].pipe(sink);
            await sink.complete();

            assert.strictEqual(sinkSpy.callCount, 11);
        });

        it("handles multi source", async function() {
            const src1 = new TestSource({includeId: true});
            const src2 = new TestSource({includeId: true});
            const sinkSpy = spy();
            const sink = new Sink({push: sinkSpy, name: "sink1"});
            src1.channels[0].pipe(sink);
            src2.channels[0].pipe(sink);
            await sink.complete();

            assert.strictEqual(sinkSpy.callCount, 22);
        });

        it("handles multi source with delays", async function() {
            const src1 = new TestSource({delay: 3, countBy: 3, sendNum: 11});
            const src2 = new TestSource({delay: 2, countBy: 2, sendNum: 11});
            const sinkSpy = spy();
            const sink = new Sink({push: sinkSpy, name: "sink1"});
            src1.channels[0].pipe(sink);
            src2.channels[0].pipe(sink);
            await sink.complete();

            assert.strictEqual(sinkSpy.callCount, 22);
        });

        it("handles simple tee", async function() {
            const src = new TestSource();
            const sink1 = new Sink({push, name: "sink1"});
            const sink2 = new Sink({push, name: "sink2"});
            const sink3 = new Sink({push, name: "sink3"});
            src.channels[0].pipe([sink1, sink2, sink3]);
            await sink1.complete();
        });

        it("iterates a complex tree", async function() {
            const src = new TestSource();
            const thru1 = new Through({through, name: "thru1"});
            const thru2 = new Through({through, name: "thru2"});
            const thru3 = new Through({through, name: "thru3"});
            const sinkSpy1 = spy();
            const sink1 = new Sink({push: sinkSpy1, name: "sink1"});
            const sinkSpy2 = spy();
            const sink2 = new Sink({push: sinkSpy2, name: "sink2"});
            const sinkSpy3 = spy();
            const sink3 = new Sink({push: sinkSpy3, name: "sink3"});
            const sinkSpy4 = spy();
            const sink4 = new Sink({push: sinkSpy4, name: "sink4"});
            src.channels[0].pipe([sink1, thru1, thru2]);
            thru1.channels[0].pipe(sink2);
            thru2.channels[0].pipe([thru3, sink3]);
            thru3.channels[0].pipe(sink4);
            await sink4.complete();

            // TODO: test results
            assert.strictEqual(sinkSpy1.callCount, 11);
            assert.strictEqual(sinkSpy2.callCount, 11);
            assert.strictEqual(sinkSpy3.callCount, 11);
            assert.strictEqual(sinkSpy4.callCount, 11);
        });

        it("can be called multiple times", async function() {
            const src = new TestSource();
            const thru = new Through({through});
            const sinkSpy = spy();
            const sink = new Sink({push: sinkSpy, name: "sink1"});
            src.channels[0].pipe(thru);
            thru.channels[0].pipe(sink);
            await sink.complete();
            await sink.complete();

            assert.strictEqual(sinkSpy.callCount, 11);
        });
    });

    it("logs uncaught error", async function() {
        let first = true;
        const src = new Source({
            pull: async(methods): Promise<void> => {
                if (first) {
                    first = false;
                    throw new Error("this is an intentional test error");
                }

                await methods.finished();
            },
        });
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy, name: "sink1"});
        src.channels[0].pipe(sink);

        stdMocks.use();
        await sink.complete();
        stdMocks.restore();

        const output = stdMocks.flush();
        assert.strictEqual(output.stdout.length, 1);
        assert.strictEqual(output.stderr.length, 0);
        assert.isTrue(output.stdout[0].startsWith("Unhandled error Chunk in dataflow: Error: this is an intentional test error\n"));
        assert.strictEqual(sinkSpy.callCount, 0);
    });
});
