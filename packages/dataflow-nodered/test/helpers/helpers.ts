/* eslint-disable jsdoc/require-jsdoc */
import * as NodeRed from "node-red";
import {Component, Sink, helpers as coreHelpers} from "@dataflow-designer/dataflow-core";
import type {MonkeyPatchNode} from "../../lib/types";
import {assert} from "chai";
import helper from "node-red-node-test-helper";
import {nodeFactoryCreator} from "../../index";
import {spy} from "sinon";
export const {through, push, pull, timeout, TestSource} = coreHelpers;

interface TestSourceConfig extends NodeRed.NodeDef {
    enableLogging?: boolean;
    switchLogger?: boolean;
}

export const testSourceNodeFactory = nodeFactoryCreator(function testSourceFactory(_node, nodeCfg): Component {
    const cfg = (nodeCfg ?? {}) as TestSourceConfig;
    return new TestSource({
        enableLogging: cfg.enableLogging ?? false,
        switchLogger: cfg.switchLogger ?? false,
    });
}, {register: "test-source"});

export const sinkSpy = spy();
export const testSinkNodeFactory = nodeFactoryCreator(function testSinkFactory(): Component {
    return new Sink({push: sinkSpy});
}, {register: "test-sink"});

export function helperInit(): void {
    helper.init(require.resolve("node-red"));
}

export type TestInputCb = (
        this: NodeRed.Node,
        msg: NodeRed.NodeMessageInFlow,
        send: (msg: NodeRed.NodeMessage | Array<NodeRed.NodeMessage | NodeRed.NodeMessage[] | null>) => void,
        done: (err?: Error) => void,
    ) => void;

export function testNodeFactoryCreator(inputCb: TestInputCb) {
    return function testNodeFactory(RED: NodeRed.NodeAPI): void {
        function testNode(this: NodeRed.Node, config: NodeRed.NodeDef): void {
            RED.nodes.createNode(this, config);
            this.on("input", inputCb);
        }
        RED.nodes.registerType("test-node", testNode);
    };
}

export function assertNodeSameish(n1: NodeRed.Node, n2: NodeRed.Node): void {
    assert.strictEqual(n1.name, n2.name);
    assert.strictEqual(n1.id, n2.id);
    assert.strictEqual(n1.type, n2.type);
    assert.deepEqual((n1 as MonkeyPatchNode).wires, (n2 as MonkeyPatchNode).wires);
}

export function assertNodeArrayIncludes(nodeArray: Array<NodeRed.Node>, n: NodeRed.Node): void {
    for (let i = 0; i < nodeArray.length; i++) {
        if (nodeArray[i].id === n.id) {
            assertNodeSameish(nodeArray[i], n);
            return;
        }
    }

    assert.fail("no matching node found");
}
