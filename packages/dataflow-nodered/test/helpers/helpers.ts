/* eslint-disable jsdoc/require-jsdoc */
import * as NodeRed from "node-red";
import {Chunk, Component, Sink, Source, SourceMethods, ThroughMethods, helpers as coreHelpers} from "@dataflow-designer/dataflow-core";
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
