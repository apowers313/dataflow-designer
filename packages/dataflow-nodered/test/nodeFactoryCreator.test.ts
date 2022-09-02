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
        it.skip("uses default logger", async function() {
            const flow = [
                {id: "n1", type: "test-source", name: "Test Source", enableLogging: true, wires: [["n2"]]},
                {id: "n2", type: "test-sink"},
            ];

            await helper.load([testSourceNodeFactory, testSinkNodeFactory], flow);

            const srcNode = helper.getNode("n1");
            assert.isNotNull(srcNode);
            srcNode.should.have.property("name", "Test Source");
            const sinkNode = helper.getNode("n2");
            assert.isNotNull(sinkNode);

            srcNode.receive({payload: {testTrigger: "true"}});

            await dataflowComplete(srcNode);

            assert.strictEqual(sinkSpy.callCount, 11);
            assert.deepEqual(sinkSpy.firstCall.args[0], {type: "data", data: {count: 0}});
            assert.deepEqual(sinkSpy.lastCall.args[0], {type: "data", data: {count: 10}});
            console.log("log", (srcNode.log as Sinon.SinonSpy).callCount);
            console.log("error", (srcNode.error as Sinon.SinonSpy).callCount);
            console.log("warn", (srcNode.warn as Sinon.SinonSpy).callCount);
            console.log("trace", (srcNode.trace as Sinon.SinonSpy).callCount);
            console.log("debug", (srcNode.debug as Sinon.SinonSpy).callCount);

            console.log("sinkNode log", (sinkNode.log as Sinon.SinonSpy).callCount);
            console.log("sinkNode error", (sinkNode.error as Sinon.SinonSpy).callCount);
            console.log("sinkNode warn", (sinkNode.warn as Sinon.SinonSpy).callCount);
            console.log("sinkNode trace", (sinkNode.trace as Sinon.SinonSpy).callCount);
            console.log("sinkNode debug", (sinkNode.debug as Sinon.SinonSpy).callCount);

            // console.log("info", (srcNode.info as Sinon.SinonSpy).callCount);
            // console.log("fatal", (srcNode.fatal as Sinon.SinonSpy).callCount);

            assert.strictEqual((srcNode.log as Sinon.SinonSpy).callCount, 11);
        });

        it("can specify logger");
    });

    describe("status reporting", function() {
        it("uses default status reporting");
        it("can specify status reporter");
    });
});
