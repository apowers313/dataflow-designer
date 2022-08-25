import {StatusReporter} from "../index";
import {assert} from "chai";
import {format} from "node:util";
import stdMocks from "std-mocks";

class TestContext {
    name = "foo"
}

class TestStatus extends StatusReporter<TestContext> {
    constructor(ctx: TestContext) {
        super({
            context: ctx,
            status: function(type, ... args) {
                const msg = format(... args);
                console.error("MY STATUS:", type, msg);
            },
        });
    }
}

describe("StatusReporter", function() {
    it("is Function", function() {
        assert.isFunction(StatusReporter);
    });

    it("calls default status", function() {
        const sr = StatusReporter.getStatusReporterForType(undefined);
        stdMocks.use();
        sr.status("idle", "this is a test");
        stdMocks.restore();

        const output = stdMocks.flush();
        assert.strictEqual(output.stderr.length, 0);
        assert.strictEqual(output.stdout.length, 1);
        assert.deepEqual(output.stdout, [
            "[IDLE]: this is a test\n",
        ]);
    });

    it("calls specific status", function() {
        const sr = new TestStatus(new TestContext());
        stdMocks.use();
        sr.status("bob", "hi there!");
        stdMocks.restore();

        const output = stdMocks.flush();
        assert.strictEqual(output.stderr.length, 1);
        assert.strictEqual(output.stdout.length, 0);
        assert.deepEqual(output.stderr, [
            "MY STATUS: bob hi there!\n",
        ]);
    });
});
