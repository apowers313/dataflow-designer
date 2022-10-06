// eslint-disable-next-line @typescript-eslint/no-require-imports
const {{camelCase fclass}}Factory = require("../dataflow-{{nodeName}}/dataflow-{{nodeName}}");
import { assert } from "chai";
import helper from "node-red-node-test-helper";
import { testHelpers } from "@dataflow-designer/dataflow-nodered";
const { helperInit, sinkSpy } = testHelpers;

describe("dataflow-{{nodeName}}", function () {
    before(function () {
        helperInit();
    });

    beforeEach(function () {
        sinkSpy.resetHistory();
    });

    afterEach(async function () {
        await helper.unload();
    });

    it("is function", function () {
        assert.isFunction({{camelCase fclass}}Factory);
    });

    it("gets created", async function () {
        const flow = [{ id: "test-node", type: "dataflow-{{nodeName}}", name: "Testy" }];
        await helper.load({{camelCase fclass}}Factory, flow);
        const srcNode = helper.getNode("test-node");
        srcNode.should.have.property("id", "test-node");
        srcNode.should.have.property("name", "Testy");
        srcNode.should.have.property("type", "dataflow-{{nodeName}}");
    });
});
