import * as NodeRed from "node-red";
import {Component, Logger, LoggerConstructor, Sink, StatusReporter, StatusReporterConstructor, Through, isComponent, isSink, isSource, isThrough} from "@dataflow-designer/dataflow-core";
import type {DataflowComponentMsg, DataflowPipingMsg, GenericFactoryFn, MonkeyPatchNode, RedEventCallback} from "./types";
import {getDataflowFromNode, getInputNodes, getOutputNodes, isRedDataflowNode, isSinkNode, setDataflowOnNode, tagAsRedDataflowNode} from "./utils";
import {format} from "node:util";
import {incerceptNode} from "./intercept";

export type DataflowFactory = (node: NodeRed.Node, config: NodeRed.NodeDef | null) => Component;

interface NodeFactoryCreatorOpts {
    register?: string;
    logger?: NonNullable<LoggerConstructor<NodeRed.Node>>;
    statusReporter?: NonNullable<StatusReporterConstructor<NodeRed.Node>>;
}

class NodeStatusReporter extends StatusReporter<NodeRed.Node> {
    constructor(context: NodeRed.Node) {
        super({
            context,
            status: function(type, ... args): void {
                const msg = format(... args);
                switch (type) {
                case "idle":
                    return this.status({fill: "grey", shape: "dot", text: msg});
                default:
                    return this.status({fill: "grey", shape: "dot", text: msg});
                }
            },
        });
    }
}

class NodeLogger extends Logger<NodeRed.Node> {
    constructor(context: NodeRed.Node) {
        super({
            context,
            log(... args) {
                const msg = format(... args);
                this.log(`[LOGGER] ${msg}`);
            },
        });
    }
}

type NodeFactory = (RED: NodeRed.NodeAPI) => void;

/**
 * Call this function and return the result from a module to create a new Node-RED node
 *
 * @param dataflowFactory - Called to create your new dataflow component
 * @param cfg - The configuration for this factory
 * @returns a factory function that creates new Node-RED nodes
 */
export function nodeFactoryCreator(dataflowFactory: DataflowFactory, cfg: NodeFactoryCreatorOpts = {}): NodeFactory {
    return function nodeFactory(RED: NodeRed.NodeAPI): void {
        // eslint-disable-next-line jsdoc/require-jsdoc
        function DataflowNodeConstructor(this: NodeRed.Node, config: NodeRed.NodeDef): void {
            RED.nodes.createNode(this, config);
            attachDataflowToNode({RED, config, node: this, dfFactory: dataflowFactory});
        }

        if (cfg.register) {
            RED.nodes.registerType(cfg.register, DataflowNodeConstructor);
        }

        StatusReporter.setStatusReporterForType(DataflowNodeConstructor as any, cfg.statusReporter ?? NodeStatusReporter);
        Logger.setLoggerForType(DataflowNodeConstructor as any, cfg.logger ?? NodeLogger);
    };
}

/**
 * Call on any node in a dataflow to wait for the entire dataflow to complete
 *
 * @param node - Any node in a dataflow, including nodes that have been coerced to dataflow nodes
 */
export async function dataflowComplete(node: NodeRed.Node): Promise<void> {
    const df = await getDataflowFromNode(node);
    if (df === null) {
        throw new Error("dataflow not found on node");
    }

    await df.started;
    await df.complete();
}

interface AttachConfig {
    RED: NodeRed.NodeAPI;
    node: NodeRed.Node;
    config: NodeRed.NodeDef | null;
    dfFactory: DataflowFactory;
}

function attachDataflowToNode(cfg: AttachConfig): void {
    const {node, config, dfFactory, RED} = cfg;

    tagAsRedDataflowNode(node);
    const componentResolve = setDataflowOnNode(node);

    node.on("input", (msg, send, done) => {
        // TODO
        // if (getDataflowFromNode(node)) {
        //     return;
        // }

        // create a new pipe everytime the flow is run
        const newComponent = dfFactory(node, config);
        componentResolve(newComponent);
        coerceNextNodes(RED, node);

        // if this is a DataflowSource we ignore the input message
        if (isThrough(newComponent) || isSink(newComponent)) {
            const {component: upstreamComponent, channel: upstreamChannel} = msg.payload as DataflowPipingMsg;
            if (!isComponent(upstreamComponent) || typeof upstreamChannel !== "number") {
                throw new Error("expected to receive a dataflow component and a channel number");
            }

            // treat the input mesage as a readable stream
            if (!isSource(upstreamComponent) && !isThrough(upstreamComponent)) {
                throw new TypeError("dataflowEventMonkeypatch expected to receive a DataflowComponent as input");
            }

            // console.log(`PIPE: ${upstreamComponent.constructor.name}[${upstreamChannel}] -> ${newComponent.constructor.name}`);
            upstreamComponent.channels[upstreamChannel].pipe(newComponent);
        }

        if (newComponent.isReadable) { // Source or Through
            const sendMsg: DataflowComponentMsg = {
                payload: {
                    component: newComponent,
                    channel: 0,
                },
            };

            // TODO: send on all outputs
            send(sendMsg);
        } else { // Sink
            newComponent.complete()
                .then(() => {
                    // TODO: _closeCallbacks
                    done();
                })
                .catch((err) => {
                    // eslint-disable-next-line no-console
                    console.error(err);
                    node.error(err);
                    done(err);
                });
        }
    });

    // if the node is a source with no inputs to trigger the flow, trigger ourselves now
    const inputNodes = getInputNodes(RED, node as MonkeyPatchNode);
    if (inputNodes.length === 0) {
        setImmediate(() => {
            node.receive({payload: {autostart: true}});
        });
    }
}

// TODO: make this "walkNodes" with a callback function
// TODO: eachNode()?
function coerceNextNodes(RED: NodeRed.NodeAPI, node: NodeRed.Node): void {
    const nodes = getOutputNodes(RED, node as MonkeyPatchNode);

    nodes.forEach((channel) => {
        channel.forEach((n) => {
            if (!isRedDataflowNode(n)) {
                coerceNode(RED, n);
            }
        });
    });
}

function coerceNode(RED: NodeRed.NodeAPI, node: MonkeyPatchNode): void {
    // XXX: Node-RED's definition of Node inherits EventEmitter, but then overloads ".on" and stores inputCallbacks separately
    let inputCallbacks: Array<RedEventCallback> = node._inputCallback ? [node._inputCallback] : [];
    node._inputCallback = null;
    if (node._inputCallbacks) {
        inputCallbacks = node._inputCallbacks;
        node._inputCallbacks = null;
    }

    let dfFactory: GenericFactoryFn;
    if (isSinkNode(node)) {
        dfFactory = sinkWrapperFactory.bind(null, node, inputCallbacks);
    } else {
        dfFactory = throughWrapperFactory.bind(null, node, inputCallbacks);
    }

    attachDataflowToNode({RED, node, config: null, dfFactory});
}

function sinkWrapperFactory(this: null, _node: NodeRed.Node, _inputCallbacks: Array<RedEventCallback>, _config: unknown): Component {
    return new Sink({push: async(): Promise<void> => {
        // console.log("push:", node, inputCallbacks);
    }});
}

function throughWrapperFactory(this: null, node: NodeRed.Node, inputCallbacks: Array<RedEventCallback>, _config: unknown): Component {
    return new Through({through: async function(this: Through, chunk, methods): Promise<void> {
        function done(err ?: Error): void {
            if (err) {
                throw err;
            }
        }

        const fn = incerceptNode({node, methods, component: this});
        if (chunk.isData()) {
            inputCallbacks.forEach((listener) => {
                // TODO: calling with 'node' at this could be problematic, might need to shim 'node'
                const retData = listener.call(fn, chunk.data, fn.send.bind(fn), done);
                if (retData) {
                    // eslint-disable-next-line no-console
                    console.log("returned data not handled", retData);
                }
            });
        }
    }});
}
