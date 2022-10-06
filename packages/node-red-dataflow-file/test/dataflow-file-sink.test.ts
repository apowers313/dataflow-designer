// eslint-disable-next-line @typescript-eslint/no-require-imports
const fileSinkFactory = require("../dataflow-file-sink/dataflow-file-sink");
import {assert} from "chai";
import helper from "node-red-node-test-helper";
import {testHelpers} from "@dataflow-designer/dataflow-nodered";
const {helperInit, sinkSpy} = testHelpers;

describe("dataflow-file-sink", function() {
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
        assert.isFunction(fileSinkFactory);
    });

    it("gets created", async function() {
        const flow = [{id: "test-node", type: "dataflow-file-sink", name: "Testy"}];
        await helper.load(fileSinkFactory, flow);
        const srcNode = helper.getNode("test-node");
        srcNode.should.have.property("id", "test-node");
        srcNode.should.have.property("name", "Testy");
        srcNode.should.have.property("type", "dataflow-file-sink");
    });
});
