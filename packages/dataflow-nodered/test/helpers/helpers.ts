/* eslint-disable jsdoc/require-jsdoc */
import * as NodeRed from "node-red";
import {Chunk, Component, Sink, Source, SourceMethods, ThroughMethods} from "@dataflow-designer/dataflow-core";
import Sinon, {spy} from "sinon";
import helper from "node-red-node-test-helper";
import {nodeFactoryCreator} from "../../index";

export async function through(chunk: Chunk, methods: ThroughMethods): Promise<void> {
    await methods.send(0, chunk);
}
// eslint-disable-next-line @typescript-eslint/no-empty-function
export async function push(): Promise<void> { }
// eslint-disable-next-line @typescript-eslint/no-empty-function
export async function pull(): Promise<void> { }

export function timeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export interface TestSourceOpts {
    countBy?: number;
    delay?: number;
    sendNum?: number;
    enableLogging?: boolean;
}

export class TestSource extends Source {
    countBy: number;
    delay: number;
    sendNum: number;
    count: number;
    enableLogging: boolean;

    constructor(opt: TestSourceOpts = {}) {
        super({
            pull: (methods) => {
                return this.testPull.call(this, methods);
            },
            name: "test-source",
        });

        this.enableLogging = opt.enableLogging ?? false;
        this.countBy = opt.countBy ?? 1;
        this.delay = opt.delay ?? 0;
        this.sendNum = opt.sendNum ?? 10;
        if (opt.countBy === undefined) {
            this.count = 0;
        } else {
            this.count = opt.countBy;
        }
    }

    async testPull(this: TestSource, methods: SourceMethods): Promise<void> {
        if (this.delay) {
            await timeout(this.delay);
        }

        if (this.count > (this.sendNum * this.countBy)) {
            await methods.finished();
            return;
        }

        const next = Chunk.create({type: "data", data: {count: this.count}});
        this.count += this.countBy;

        if (this.enableLogging) {
            this.logger.log("TestSource sending:", (next as any).data);
        }

        await methods.send(0, next);
    }

    async init(): Promise<void> {
        await super.init();
    }
}

interface TestSourceConfig extends NodeRed.NodeDef {
    enableLogging?: boolean;
}

export const testSourceNodeFactory = nodeFactoryCreator(function testSourceFactory(_node, nodeCfg): Component {
    const cfg = (nodeCfg ?? {}) as TestSourceConfig;
    return new TestSource({
        enableLogging: cfg.enableLogging ?? false,
    });
}, {register: "test-source"});

export const sinkSpy = spy();
export const testSinkNodeFactory = nodeFactoryCreator(function testSinkFactory(): Component {
    // return new Sink({
    //     push: async(chunk: Chunk | ChunkCollection): Promise<void> => {
    //         console.log("chunk", chunk);
    //     },
    // });
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
