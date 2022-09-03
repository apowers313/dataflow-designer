import type * as NodeRed from "node-red";
import {Component, isComponent} from "@dataflow-designer/dataflow-core";
import type {ComponentResolveFn, MonkeyPatchNode} from "./types";

const RedDataflowSymbol = Symbol("red-dataflow");
const dataflowProperty = "_dataflow";

// eslint-disable-next-line jsdoc/require-jsdoc
export function tagAsRedDataflowNode(node: NodeRed.Node): void {
    Object.defineProperty(node, RedDataflowSymbol, {
        enumerable: false,
        configurable: false,
        value: true,
    });
}

export function isRedDataflowNode(o: unknown): boolean {
    if (typeof o !== "object" || o === null) {
        return false;
    }

    return (o as Record<symbol, unknown>)[RedDataflowSymbol] === true;
}

export async function getDataflowFromNode(node: NodeRed.Node): Promise<Component | null> {
    if (!isRedDataflowNode(node)) {
        return null;
    }

    const prop = Object.getOwnPropertyDescriptor(node, dataflowProperty);
    if (!prop) {
        return null;
    }

    const df = await prop.value;
    if (!isComponent(df)) {
        return null;
    }

    return df;
}

// eslint-disable-next-line jsdoc/require-jsdoc
export function setDataflowOnNode(node: NodeRed.Node): ComponentResolveFn {
    if (!isRedDataflowNode(node)) {
        throw new Error("can't set dataflow on non-dataflow node");
    }

    let componentResolve!: ComponentResolveFn;
    const componentPromise = new Promise<Component>((resolve) => {
        // XXX: don't worry, this is synchronous
        componentResolve = resolve;
    });

    Object.defineProperty(node, dataflowProperty, {
        enumerable: false,
        configurable: false,
        value: componentPromise,
    });

    return componentResolve;
}

export function isSinkNode(node: MonkeyPatchNode): boolean {
    if (node.wires.length === 0) {
        return true;
    }

    return false;
}

export function getOutputNodes(RED: NodeRed.NodeAPI, node: MonkeyPatchNode): Array<Array<MonkeyPatchNode>> {
    const res: Array<Array<MonkeyPatchNode>> = [];
    const channel = node.wires;
    channel.forEach((c) => {
        const chan: Array<MonkeyPatchNode> = c.map((nodeId) => {
            return RED.nodes.getNode(nodeId) as MonkeyPatchNode;
        });
        res.push(chan);
    });

    return res;
}

export function wiresHasId(wires: Array<Array<string>> | undefined, id: string): boolean {
    if (!wires) {
        return false;
    }

    for (let i = 0; i < wires.length; i++) {
        if (wires[i].includes(id)) {
            return true;
        }
    }

    return false;
}

export function getInputNodes(RED: NodeRed.NodeAPI, matchNode: MonkeyPatchNode): Array<MonkeyPatchNode> {
    const res: Array<MonkeyPatchNode> = [];
    RED.nodes.eachNode((cn) => {
        const currNode = cn as MonkeyPatchNode;

        if (wiresHasId(currNode.wires, matchNode.id)) {
            res.push(RED.nodes.getNode(currNode.id) as MonkeyPatchNode);
        }
    });

    return res;
}

type inputNodeTypes = "dataflow" | "nodered";
type summaryType = inputNodeTypes | "mixed" | "none";

export function getInputNodesTypes(RED: NodeRed.NodeAPI, iMatchNode: NodeRed.Node, summary: false): Array<inputNodeTypes>;
export function getInputNodesTypes(RED: NodeRed.NodeAPI, iMatchNode: NodeRed.Node, summary: true): summaryType;
export function getInputNodesTypes(RED: NodeRed.NodeAPI, iMatchNode: NodeRed.Node, summary = false): Array<inputNodeTypes> | summaryType {
    const matchNode = iMatchNode as MonkeyPatchNode;
    const nodeTypes = getInputNodes(RED, matchNode).map((n) => isRedDataflowNode(n) ? "dataflow" : "nodered");

    if (!summary) {
        return nodeTypes;
    }

    if (nodeTypes.length === 0) {
        return "none";
    }

    if (nodeTypes.includes("dataflow") && nodeTypes.includes("nodered")) {
        return "mixed";
    }

    if (nodeTypes.includes("dataflow")) {
        return "dataflow";
    }

    return "nodered";
}
