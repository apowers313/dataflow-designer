import {Logger} from "../lib/Logger";
import {assert} from "chai";
import {format} from "node:util";
import stdMocks from "std-mocks";

class TestCtx {
    name = "foo"
}

describe("Logger", function() {
    // beforeEach(function() {
    //     stdMocks.use();
    // });

    // afterEach(function() {
    //     stdMocks.restore();
    // });

    it("is Function", function() {
        assert.isFunction(Logger);
    });

    it("default logger", function() {
        stdMocks.use();
        const defaultLogger = Logger.getLoggerForType(undefined);
        defaultLogger.log("log");
        defaultLogger.trace("trace");
        defaultLogger.debug("debug");
        defaultLogger.info("info");
        defaultLogger.warn("warn");
        defaultLogger.error("error");
        defaultLogger.fatal("fatal");
        stdMocks.restore();

        const output = stdMocks.flush();
        assert.strictEqual(output.stderr.length, 0);
        assert.strictEqual(output.stdout.length, 7);
        assert.deepEqual(output.stdout, [
            "log\n",
            "trace\n",
            "debug\n",
            "info\n",
            "warn\n",
            "error\n",
            "fatal\n",
        ]);
    });

    it("context", function() {
        const l = new Logger({
            context: new TestCtx(),
            log: function(data, ... args): void {
                const msg = format(data, ... args);
                console.log(`[${this.name}] ${msg}`);
            },
        });
        stdMocks.use();
        l.log("log");
        l.trace("trace");
        l.debug("debug");
        l.info("info");
        l.warn("warn");
        l.error("error");
        l.fatal("fatal");

        stdMocks.restore();

        const output = stdMocks.flush();
        assert.strictEqual(output.stderr.length, 0);
        assert.strictEqual(output.stdout.length, 7);
        assert.deepEqual(output.stdout, [
            "[foo] log\n",
            "[foo] trace\n",
            "[foo] debug\n",
            "[foo] info\n",
            "[foo] warn\n",
            "[foo] error\n",
            "[foo] fatal\n",
        ]);
    });

    it("unique loggers", function() {
        const l = new Logger({
            log: (): void => console.log("LOG"),
            trace: (): void => console.log("TRACE"),
            debug: (): void => console.log("DEBUG"),
            info: (): void => console.log("INFO"),
            warn: (): void => console.log("WARN"),
            error: (): void => console.log("ERROR"),
            fatal: (): void => console.log("FATAL"),

        });
        stdMocks.use();
        l.log("x");
        l.trace("x");
        l.debug("x");
        l.info("x");
        l.warn("x");
        l.error("x");
        l.fatal("x");

        stdMocks.restore();

        const output = stdMocks.flush();
        assert.strictEqual(output.stderr.length, 0);
        assert.strictEqual(output.stdout.length, 7);
        assert.deepEqual(output.stdout, [
            "LOG\n",
            "TRACE\n",
            "DEBUG\n",
            "INFO\n",
            "WARN\n",
            "ERROR\n",
            "FATAL\n",
        ]);
    });

    describe("registry", function() {
        it("set/get", function() {
            class TestLogger extends Logger<TestCtx> {
                constructor(context: TestCtx) {
                    super({
                        context,
                        log: function() {
                            console.log(this.name);
                        },
                    });
                }
            }

            Logger.setLoggerForType(TestCtx, TestLogger);
            const ctx = new TestCtx();
            const logger = Logger.getLoggerForType(ctx);

            assert.instanceOf(logger, Logger);
            assert.instanceOf(logger, TestLogger);
            logger.log("x");
        });

        it("default", function() {
            const l = Logger.getLoggerForType(undefined);
            assert.instanceOf(l, Logger);
        });
    });
});
