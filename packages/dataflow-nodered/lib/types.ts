import type * as NodeRed from "node-red";
import type {Component} from "dataflow-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RedEventCallback = (this: NodeRed.Node, ... args: any[]) => unknown;
export type GenericFactoryFn = (this: null, node: NodeRed.Node, config: NodeRed.NodeDef | null) => Component;
export type RedMsg = Record<string | number | symbol, unknown>;
export type RedChannelizedOutput = Array<RedMsg>;
export type RedChannelizedMultiOutput = Array<RedMsg | Array<RedMsg>>;
export type RedSendData = RedMsg | RedChannelizedOutput | RedChannelizedMultiOutput;
export type ComponentResolveFn = (c: Component) => void

export interface DataflowComponentMsg extends NodeRed.NodeMessage {
    payload: DataflowPipingMsg;
}

export interface DataflowPipingMsg {
    component: Component;
    channel: number;
}

export interface MonkeyPatchNode extends NodeRed.Node {
    wires: Array<Array<string>>;
    _flow: FakeNode;
    _inputCallback: RedEventCallback | null;
    _inputCallbacks: Array<RedEventCallback> | null;
}

export interface FakeNode {
    getNode: (nodeId: string) => MonkeyPatchNode;
}

// namespace NodeRed {
//     export interface Node {
//         wires: Array<Array<string>>,
//         _flow: Record<any, any>,
//         _inputCallback: unknown,
//         _inputCallbacks: Array<unknown>;
//     }
// }
