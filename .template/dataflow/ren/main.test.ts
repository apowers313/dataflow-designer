import { Sink, helpers } from "@dataflow-designer/dataflow-core";
import { {{fclass}} } from "../index";
import { assert } from "chai";
import { spy } from "sinon";
const { TestSource, objectSource } = helpers;

describe("{{fclass}}", function () {
    it("is function", function () {
        assert.isFunction({{fclass}});
    });

    it("example pipeline", async function () {
        const src = new TestSource();
        // const src = objectSource([{one: 1}, {two: 2}, {three: 3}]);
        const sinkSpy = spy();
        const sink = new Sink({ push: sinkSpy });
        src.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 11);
        assert.deepEqual(sinkSpy.args[0][0].data, { count: 0 });
        assert.deepEqual(sinkSpy.args[10][0].data, { count: 10 });
    });
});
