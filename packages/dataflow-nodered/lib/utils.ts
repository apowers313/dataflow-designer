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

/**
 * Determines if the specified object is a Node-RED dataflow node
 *
 * @param o - any object
 * @returns true if the object is a Node-RED dataflow node
 */
export function isRedDataflowNode(o: unknown): boolean {
    if (typeof o !== "object" || o === null) {
        return false;
    }

    return (o as Record<symbol, unknown>)[RedDataflowSymbol] === true;
}

/**
 * Fetches a Dataflow Component from a Node-RED dataflow node
 *
 * @param node - The node to retrieve the Dataflow Component for
 * @returns a Dataflow Component or null if the node is not a Node-RED Dataflow node
 */
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

/**
 * Indicates if a Node-RED node is a sink
 *
 * @param node - The Node-RED node to evaluate
 * @returns true if the specified node is the terminal node in a flow (i.e. has no outputs), false otherwise
 */
export function isSinkNode(node: MonkeyPatchNode): boolean {
    if (node.wires.length === 0) {
        return true;
    }

    return false;
}

/**
 * Returns the output nodes for the specified node
 *
 * @param RED - The Node-RED API
 * @param node - The Node-RED node to fetch the outputs for
 * @returns an array of Node-RED nodes or an empty array if the specified node has no outputs
 */
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

/**
 * Tests to see if a description of wires contains a specific node ID
 *
 * @param wires - A double-array containing strings of node IDs
 * @param id - The ID to find in the wires description
 * @returns true if the ID exists in the wires description, false otherwise
 */
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

/**
 * Returns the input nodes for the specified node
 *
 * @param RED - The Node-RED API
 * @param matchNode - The Node-RED node to search for
 * @returns an array of input nodes that feed into the specified node, or an empty array if the node has no input
 */
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

/**
 * Returns the types of the nodes feeding into the specified node
 *
 * @param RED - The Node-RED API
 * @param iMatchNode - The node to get the input types for
 * @param summary - Whether to summarize the input nodes or not (default false).
 */
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
