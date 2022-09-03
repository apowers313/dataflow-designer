import type * as NodeRed from "node-red";
import {getInputNodes, getInputNodesTypes, getOutputNodes, isRedDataflowNode} from "../lib/utils";
import {helperInit, testSourceNodeFactory} from "./helpers/helpers";
import type {MonkeyPatchNode} from "../lib/types";
import {assert} from "chai";
import helper from "node-red-node-test-helper";

let RED: NodeRed.NodeAPI;
function captureRedApi(r: NodeRed.NodeAPI): void {
    RED = r;
}

function assertNodeSameish(n1: NodeRed.Node, n2: NodeRed.Node): void {
    assert.strictEqual(n1.name, n2.name);
    assert.strictEqual(n1.id, n2.id);
    assert.strictEqual(n1.type, n2.type);
    assert.deepEqual((n1 as MonkeyPatchNode).wires, (n2 as MonkeyPatchNode).wires);
}

function assertNodeArrayIncludes(nodeArray: Array<NodeRed.Node>, n: NodeRed.Node): void {
    for (let i = 0; i < nodeArray.length; i++) {
        if (nodeArray[i].id === n.id) {
            assertNodeSameish(nodeArray[i], n);
            return;
        }
    }

    assert.fail("no matching node found");
}

describe("utils", function() {
    before(function() {
        helperInit();
    });

    afterEach(async function() {
        await helper.unload();
    });

    describe("getOutputNodes", function() {
        it("finds none", async function() {
            const testFlows: helper.TestFlows = [
                {id: "source", type: "helper", wires: [[]]},
            ];
            await helper.load(captureRedApi, testFlows);
            const source = helper.getNode("source");
            assert.isNotNull(source);
            assert.isObject(RED);

            const nodes = getOutputNodes(RED, source as MonkeyPatchNode);
            assert.isArray(nodes);
            assert.strictEqual(nodes.length, 1);
            assert.isArray(nodes[0]);
            assert.strictEqual(nodes[0].length, 0);
        });

        it("finds one", async function() {
            const testFlows: helper.TestFlows = [
                {id: "source", type: "helper", wires: [["o1"]]},
                {id: "o1", type: "helper", name: "output1"},
            ];
            await helper.load(captureRedApi, testFlows);
            const source = helper.getNode("source");
            const o1 = helper.getNode("o1");
            assert.isNotNull(source);
            assert.isNotNull(o1);
            assert.isObject(RED);

            const nodes = getOutputNodes(RED, source as MonkeyPatchNode);
            assert.isArray(nodes);
            assert.strictEqual(nodes.length, 1);
            assert.isArray(nodes[0]);
            assert.strictEqual(nodes[0][0], o1);
        });

        it("finds multiple", async function() {
            const testFlows: helper.TestFlows = [
                {id: "source", type: "helper", wires: [["o1", "o2", "o3"]]},
                {id: "o1", type: "helper", name: "output1"},
                {id: "o2", type: "helper", name: "output2"},
                {id: "o3", type: "helper", name: "output3"},

            ];
            await helper.load(captureRedApi, testFlows);
            const source = helper.getNode("source");
            const o1 = helper.getNode("o1");
            const o2 = helper.getNode("o2");
            const o3 = helper.getNode("o3");
            assert.isNotNull(source);
            assert.isNotNull(o1);
            assert.isNotNull(o2);
            assert.isNotNull(o3);
            assert.isObject(RED);

            const nodes = getOutputNodes(RED, source as MonkeyPatchNode);
            assert.isArray(nodes);
            assert.strictEqual(nodes.length, 1);
            assert.isArray(nodes[0]);
            assert.strictEqual(nodes[0][0], o1);
            assert.strictEqual(nodes[0][1], o2);
            assert.strictEqual(nodes[0][2], o3);
        });

        it("finds multiple across ports", async function() {
            const testFlows: helper.TestFlows = [
                {id: "source", type: "helper", wires: [["o1", "o2"], ["o3", "o4"], ["o5"]]},
                {id: "o1", type: "helper", name: "output1"},
                {id: "o2", type: "helper", name: "output2"},
                {id: "o3", type: "helper", name: "output3"},
                {id: "o4", type: "helper", name: "output4"},
                {id: "o5", type: "helper", name: "output5"},

            ];
            await helper.load(captureRedApi, testFlows);
            const source = helper.getNode("source");
            const o1 = helper.getNode("o1");
            const o2 = helper.getNode("o2");
            const o3 = helper.getNode("o3");
            const o4 = helper.getNode("o4");
            const o5 = helper.getNode("o5");
            assert.isNotNull(source);
            assert.isNotNull(o1);
            assert.isNotNull(o2);
            assert.isNotNull(o3);
            assert.isNotNull(o4);
            assert.isNotNull(o5);
            assert.isObject(RED);

            const nodes = getOutputNodes(RED, source as MonkeyPatchNode);
            assert.isArray(nodes);
            assert.strictEqual(nodes.length, 3);
            assert.isArray(nodes[0]);
            assert.strictEqual(nodes[0][0], o1);
            assert.strictEqual(nodes[0][1], o2);
            assert.strictEqual(nodes[1][0], o3);
            assert.strictEqual(nodes[1][1], o4);
            assert.strictEqual(nodes[2][0], o5);
        });
    });

    describe("getInputNodes", function() {
        it("finds none", async function() {
            const testFlows: helper.TestFlows = [
                {id: "sink", type: "helper"},
            ];
            await helper.load(captureRedApi, testFlows);
            const sink = helper.getNode("sink");
            assert.isNotNull(sink);
            assert.isObject(RED);

            const nodes = getInputNodes(RED, sink as MonkeyPatchNode);
            assert.isArray(nodes);
            assert.strictEqual(nodes.length, 0);
        });

        it("finds one", async function() {
            const testFlows: helper.TestFlows = [
                {id: "i1", type: "helper", name: "input1", wires: [["sink"]]},
                {id: "sink", type: "helper"},
            ];
            await helper.load(captureRedApi, testFlows);
            const i1 = helper.getNode("i1");
            const sink = helper.getNode("sink");
            assert.isNotNull(i1);
            assert.isNotNull(sink);
            assert.isObject(RED);

            const nodes = getInputNodes(RED, sink as MonkeyPatchNode);
            assert.isArray(nodes);
            assert.strictEqual(nodes.length, 1);
            assertNodeSameish(nodes[0], i1);
        });

        it("finds multiple", async function() {
            const testFlows: helper.TestFlows = [
                {id: "i1", type: "helper", name: "input1", wires: [["sink"]]},
                {id: "i2", type: "helper", name: "input2", wires: [["sink"]]},
                {id: "i3", type: "helper", name: "input3", wires: [["sink"]]},
                {id: "sink", type: "helper"},
            ];
            await helper.load(captureRedApi, testFlows);
            const i1 = helper.getNode("i1");
            const i2 = helper.getNode("i2");
            const i3 = helper.getNode("i3");
            const sink = helper.getNode("sink");
            assert.isNotNull(i1);
            assert.isNotNull(i2);
            assert.isNotNull(i3);
            assert.isNotNull(sink);
            assert.isObject(RED);

            const nodes = getInputNodes(RED, sink as MonkeyPatchNode);
            assert.isArray(nodes);
            assert.strictEqual(nodes.length, 3);
            assertNodeArrayIncludes(nodes, i1);
            assertNodeArrayIncludes(nodes, i2);
            assertNodeArrayIncludes(nodes, i3);
        });

        it("doesn't get confused by other wires", async function() {
            const testFlows: helper.TestFlows = [
                {id: "i1", type: "helper", name: "input1", wires: [["sink", "i2", "i3"]]},
                {id: "i2", type: "helper", name: "input2", wires: [["sink", "i3"]]},
                {id: "i3", type: "helper", name: "input3", wires: [["sink", "i1"]]},
                {id: "sink", type: "helper"},
            ];
            await helper.load(captureRedApi, testFlows);
            const i1 = helper.getNode("i1");
            const i2 = helper.getNode("i2");
            const i3 = helper.getNode("i3");
            const sink = helper.getNode("sink");
            assert.isNotNull(i1);
            assert.isNotNull(i2);
            assert.isNotNull(i3);
            assert.isNotNull(sink);
            assert.isObject(RED);

            const nodes = getInputNodes(RED, sink as MonkeyPatchNode);
            assert.isArray(nodes);
            assert.strictEqual(nodes.length, 3);
            assertNodeArrayIncludes(nodes, i1);
            assertNodeArrayIncludes(nodes, i2);
            assertNodeArrayIncludes(nodes, i3);
        });
    });

    describe("getInputNodesTypes", function() {
        it("returns correct list", async function() {
            const testFlows: helper.TestFlows = [
                {id: "i1", type: "test-source", name: "input1", wires: [["sink"]]},
                {id: "i2", type: "helper", name: "input2", wires: [["sink"]]},
                {id: "i3", type: "test-source", name: "input3", wires: [["sink"]]},
                {id: "sink", type: "helper"},
            ];
            await helper.load([captureRedApi, testSourceNodeFactory], testFlows);
            const i1 = helper.getNode("i1");
            const i2 = helper.getNode("i2");
            const i3 = helper.getNode("i3");
            const sink = helper.getNode("sink");
            assert.isNotNull(i1);
            assert.isNotNull(i2);
            assert.isNotNull(i3);
            assert.isNotNull(sink);
            assert.isObject(RED);
            assert.isTrue(isRedDataflowNode(i1));
            assert.isFalse(isRedDataflowNode(i2));
            assert.isTrue(isRedDataflowNode(i3));

            const types = getInputNodesTypes(RED, sink, false);
            assert.deepEqual(types, ["dataflow", "nodered", "dataflow"]);
        });

        it("returns none", async function() {
            const testFlows: helper.TestFlows = [
                {id: "sink", type: "helper"},
            ];
            await helper.load([captureRedApi, testSourceNodeFactory], testFlows);
            const sink = helper.getNode("sink");
            assert.isNotNull(sink);
            assert.isObject(RED);

            const types = getInputNodesTypes(RED, sink, true);
            assert.deepEqual(types, "none");
        });

        it("returns dataflow", async function() {
            const testFlows: helper.TestFlows = [
                {id: "i1", type: "test-source", name: "input1", wires: [["sink"]]},
                {id: "i2", type: "test-source", name: "input2", wires: [["sink"]]},
                {id: "i3", type: "test-source", name: "input3", wires: [["sink"]]},
                {id: "sink", type: "helper"},
            ];
            await helper.load([captureRedApi, testSourceNodeFactory], testFlows);
            const i1 = helper.getNode("i1");
            const i2 = helper.getNode("i2");
            const i3 = helper.getNode("i3");
            const sink = helper.getNode("sink");
            assert.isNotNull(i1);
            assert.isNotNull(i2);
            assert.isNotNull(i3);
            assert.isNotNull(sink);
            assert.isObject(RED);
            assert.isTrue(isRedDataflowNode(i1));
            assert.isTrue(isRedDataflowNode(i2));
            assert.isTrue(isRedDataflowNode(i3));

            const types = getInputNodesTypes(RED, sink, true);
            assert.deepEqual(types, "dataflow");
        });

        it("returns nodered", async function() {
            const testFlows: helper.TestFlows = [
                {id: "i1", type: "helper", name: "input1", wires: [["sink"]]},
                {id: "i2", type: "helper", name: "input2", wires: [["sink"]]},
                {id: "i3", type: "helper", name: "input3", wires: [["sink"]]},
                {id: "sink", type: "helper"},
            ];
            await helper.load([captureRedApi, testSourceNodeFactory], testFlows);
            const i1 = helper.getNode("i1");
            const i2 = helper.getNode("i2");
            const i3 = helper.getNode("i3");
            const sink = helper.getNode("sink");
            assert.isNotNull(i1);
            assert.isNotNull(i2);
            assert.isNotNull(i3);
            assert.isNotNull(sink);
            assert.isObject(RED);
            assert.isFalse(isRedDataflowNode(i1));
            assert.isFalse(isRedDataflowNode(i2));
            assert.isFalse(isRedDataflowNode(i3));

            const types = getInputNodesTypes(RED, sink, true);
            assert.deepEqual(types, "nodered");
        });

        it("returns mixed", async function() {
            const testFlows: helper.TestFlows = [
                {id: "i1", type: "test-source", name: "input1", wires: [["sink"]]},
                {id: "i2", type: "helper", name: "input2", wires: [["sink"]]},
                {id: "i3", type: "test-source", name: "input3", wires: [["sink"]]},
                {id: "sink", type: "helper"},
            ];
            await helper.load([captureRedApi, testSourceNodeFactory], testFlows);
            const i1 = helper.getNode("i1");
            const i2 = helper.getNode("i2");
            const i3 = helper.getNode("i3");
            const sink = helper.getNode("sink");
            assert.isNotNull(i1);
            assert.isNotNull(i2);
            assert.isNotNull(i3);
            assert.isNotNull(sink);
            assert.isObject(RED);
            assert.isTrue(isRedDataflowNode(i1));
            assert.isFalse(isRedDataflowNode(i2));
            assert.isTrue(isRedDataflowNode(i3));

            const types = getInputNodesTypes(RED, sink, true);
            assert.deepEqual(types, "mixed");
        });
    });
});
