import {TestInputCb, helperInit, sinkSpy, testNodeFactoryCreator, testSinkNodeFactory, testSourceNodeFactory} from "./helpers/helpers";
import Sinon from "sinon";
import {assert} from "chai";
import {dataflowComplete} from "../lib/nodeFactoryCreator";
import helper from "node-red-node-test-helper";
import {nodeFactoryCreator} from "../index";
import stdMocks from "std-mocks";

describe("nodeFactoryCreator", function() {
    before(function() {
        helperInit();
    });

    beforeEach(function() {
        sinkSpy.resetHistory();
    });

    afterEach(async function() {
        await helper.unload();
    });

    it("is function", function() {
        assert.isFunction(nodeFactoryCreator);
    });

    it("gets created", async function() {
        const flow = [{id: "src", type: "test-source", name: "test name"}];
        await helper.load(testSourceNodeFactory, flow, function() {
            const srcNode = helper.getNode("src");
            srcNode.should.have.property("name", "test name");
        });
    });

    it("streams data", async function() {
        const flow = [
            {id: "n1", type: "test-source", name: "Test Source", wires: [["n2"]]},
            {id: "n2", type: "test-sink"},
        ];

        await helper.load([testSourceNodeFactory, testSinkNodeFactory], flow);

        const srcNode = helper.getNode("n1");
        assert.isNotNull(srcNode);
        srcNode.should.have.property("name", "Test Source");
        const sinkNode = helper.getNode("n2");
        assert.isNotNull(sinkNode);

        // srcNode.receive({payload: {testTrigger: "true"}});

        await dataflowComplete(srcNode);

        assert.strictEqual(sinkSpy.callCount, 11);
        assert.deepEqual(sinkSpy.firstCall.args[0], {type: "data", data: {count: 0}});
        assert.deepEqual(sinkSpy.lastCall.args[0], {type: "data", data: {count: 10}});
    });

    it("source without input");
    it("source input called multiple times");
    it("coerces sink");
    it("coerces through");
    it("set multiple output channels");
    describe("coercion", function() {
        it("intercepts data", async function() {
            const flow = [
                {id: "n1", type: "test-source", name: "Test Source", wires: [["n2"]]},
                {id: "n2", type: "test-node", wires: [["n3"]]},
                {id: "n3", type: "test-sink"},
            ];

            const inputFn: TestInputCb = function(msg, send, done) {
                const {count} = msg as any;
                send({payload: {doubleCount: count * 2}});
                done();
            };

            const testNodeFactory = testNodeFactoryCreator(inputFn);
            await helper.load([testSourceNodeFactory, testNodeFactory, testSinkNodeFactory], flow);
            const srcNode = helper.getNode("n1");
            assert.isNotNull(srcNode);
            const testNode = helper.getNode("n2");
            assert.isNotNull(testNode);
            const sinkNode = helper.getNode("n3");
            assert.isNotNull(sinkNode);
            srcNode.receive({payload: {testTrigger: "true"}});
            await dataflowComplete(sinkNode);

            assert.strictEqual(sinkSpy.callCount, 11);
            assert.deepEqual(sinkSpy.args[0][0], {type: "data", data: {payload: {doubleCount: 0}}});
            assert.deepEqual(sinkSpy.args[1][0], {type: "data", data: {payload: {doubleCount: 2}}});
            assert.deepEqual(sinkSpy.args[10][0], {type: "data", data: {payload: {doubleCount: 20}}});
        });

        describe("this", function() {
            it("logs", async function() {
                const flow = [
                    {id: "n1", type: "test-source", name: "Test Source", wires: [["n2"]]},
                    {id: "n2", type: "test-node", wires: [["n3"]]},
                    {id: "n3", type: "test-sink"},
                ];

                const inputFn: TestInputCb = function(msg, send, done) {
                    const {count} = msg as any;
                    send({payload: {doubleCount: count * 2}});
                    this.log(`msg: ${msg}`);
                    done();
                };

                const testNodeFactory = testNodeFactoryCreator(inputFn);
                await helper.load([testSourceNodeFactory, testNodeFactory, testSinkNodeFactory], flow);
                const srcNode = helper.getNode("n1");
                assert.isNotNull(srcNode);
                const testNode = helper.getNode("n2");
                assert.isNotNull(testNode);
                srcNode.receive({payload: {testTrigger: "true"}});
                await dataflowComplete(srcNode);

                assert.strictEqual(sinkSpy.callCount, 11);
                assert.strictEqual((testNode.log as Sinon.SinonSpy).callCount, 11);
            });

            it("status");
            it("send");
            it("receive");
            it("close");
        });
    });
    it("callbacks");
    it("this");

    describe("logging", function() {
        it.only("uses default logger", async function() {
            const flow = [
                {id: "n1", type: "test-source", name: "Test Source", enableLogging: true, switchLogger: true, wires: [["n2"]]},
                {id: "n2", type: "test-sink"},
            ];

            await helper.load([testSourceNodeFactory, testSinkNodeFactory], flow);

            const srcNode = helper.getNode("n1");
            assert.isNotNull(srcNode);
            srcNode.should.have.property("name", "Test Source");
            const sinkNode = helper.getNode("n2");
            assert.isNotNull(sinkNode);

            stdMocks.use();
            srcNode.receive({payload: {testTrigger: "true"}});

            await dataflowComplete(srcNode);
            stdMocks.restore();

            const output = stdMocks.flush();
            // console.log("output", output);
            assert.strictEqual(output.stderr.length, 0);
            assert.strictEqual(output.stdout.length, 11);
            assert.strictEqual(output.stdout[0], "[log] TestSource sending: { count: 0 }\n");
            assert.strictEqual(output.stdout[1], "[error] TestSource sending: { count: 1 }\n");
            assert.strictEqual(output.stdout[2], "[warn] TestSource sending: { count: 2 }\n");
            assert.strictEqual(output.stdout[3], "[trace] TestSource sending: { count: 3 }\n");
            assert.strictEqual(output.stdout[4], "[debug] TestSource sending: { count: 4 }\n");
            assert.strictEqual(output.stdout[5], "[log] TestSource sending: { count: 5 }\n");
            assert.strictEqual(output.stdout[6], "[error] TestSource sending: { count: 6 }\n");
            assert.strictEqual(output.stdout[7], "[warn] TestSource sending: { count: 7 }\n");
            assert.strictEqual(output.stdout[8], "[trace] TestSource sending: { count: 8 }\n");
            assert.strictEqual(output.stdout[9], "[debug] TestSource sending: { count: 9 }\n");
            assert.strictEqual(output.stdout[10], "[log] TestSource sending: { count: 10 }\n");
        });

        it("can specify logger");
    });

    describe("status reporting", function() {
        it("uses default status reporting");
        it("can specify status reporter");
    });
});
