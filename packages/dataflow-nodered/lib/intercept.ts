/* eslint-disable jsdoc/require-jsdoc, @typescript-eslint/no-explicit-any */
import * as NodeRed from "node-red";
import {Chunk, ChunkData, Component, ThroughMethods, WriteMethods, isSink} from "@dataflow-designer/dataflow-core";

interface InterceptCfg {
    node: NodeRed.Node;
    component: Component;
    methods: ThroughMethods | WriteMethods;
}

export function incerceptNode(cfg: InterceptCfg): NodeRed.Node {
    return new Proxy(cfg.node, {
        get(target, prop, receiver): any {
            if (prop === "send") {
                return interceptedSend.bind(cfg);
            }

            return Reflect.get(target, prop, receiver);
        },
    });
}

function interceptedSend(this: InterceptCfg, msg?: NodeRed.NodeMessage | Array<NodeRed.NodeMessage | NodeRed.NodeMessage[] | null>): void {
    if (isSink(this.component)) {
        throw new Error("attempting to send data from Sink");
    }

    let data = msg;
    if (!data) {
        return;
    }

    if (!Array.isArray(data)) {
        data = [data];
    }

    data.forEach((grp, chNum) => {
        let msgGroup: Array<NodeRed.NodeMessage | null>;
        if (!Array.isArray(grp)) {
            msgGroup = [grp];
        } else {
            msgGroup = grp;
        }

        msgGroup.forEach((data) => {
            // TODO: sucks that we can't await here
            data = data ?? {};
            (this.methods as ThroughMethods).send(chNum, Chunk.create({type: "data", data: data as ChunkData}))
                .catch((err: Error) => {
                    console.log("ERROR", err);
                    throw err;
                });
        });
    });
}
