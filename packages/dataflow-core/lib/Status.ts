import {ContextConstructor} from "./utils";
// import {format} from "node:util";

type StatusFn<TCtx> = (this: TCtx, type: string, ... args: any[]) => void

const statusRegistry: Map<ContextConstructor<any> | undefined, StatusGenerator<any>> = new Map();

export interface StatusGeneratorCfg {
    name: string;
}

export class StatusGenerator<TCtx> {
    name: string;
    collection: Map<string, StatusFn<TCtx>> = new Map();

    constructor(cfg: StatusGeneratorCfg) {
        this.name = cfg.name;
    }

    register(type: string, fn: StatusFn<TCtx>): void {
        this.collection.set(type, fn);
    }

    get(type: string): StatusFn<TCtx> | undefined {
        return this.collection.get(type);
    }

    static getGeneratorForType<T>(t: Record<"constructor", Function> | undefined): StatusGenerator<T> | undefined {
        let lkup = undefined;
        if (typeof t === "object" && typeof t.constructor === "function") {
            lkup = t.constructor as ContextConstructor<T>;
        }

        return statusRegistry.get(lkup) ?? undefined;
    }

    static setGeneratorForType<T>(t: ContextConstructor<T> | undefined, gen: StatusGenerator<T>): void {
        statusRegistry.set(t, gen);
    }
}

export interface StatusReporterCfg<TCtx> {
    context?: TCtx;
}

export class StatusReporter<TCtx = undefined> {
    context!: TCtx;
    generator: StatusGenerator<TCtx>;

    constructor(cfg: StatusReporterCfg<TCtx> = {}) {
        if (cfg.context) {
            this.context = cfg.context;
        }

        let gen: StatusGenerator<TCtx> | undefined = StatusGenerator.getGeneratorForType(this.context);
        if (!gen) {
            gen = StatusGenerator.getGeneratorForType(undefined) as StatusGenerator<TCtx>;
        }

        this.generator = gen;
    }

    status(type: string, ... args: any[]): void {
        const statusFn = this.generator.get(type);
        if (!statusFn) {
            return;
        }

        statusFn.call(this.context, type, ... args);
    }
}

const textStatusGenerator = new StatusGenerator<undefined>({name: "text"});
textStatusGenerator.register("idle", function(type: string, ... args: any[]) {
    console.log(`[${type.toUpperCase()}]:`, ... args);
});
StatusGenerator.setGeneratorForType(undefined, textStatusGenerator);

// class Node{
//     name = "foo"
//     status(s: Record<any, any> | string): void {
//         console.log(`${s}`);
//     }
// }

// const nodeStatusGenerator = new StatusGenerator<Node>({name: "node"});
// nodeStatusGenerator.register("idle", function(this: Node, type: string, ... args: any[]) {
//     const txt = format(... args);
//     this.status({fill: "red", shape: "ring", text: txt});
//     // console.log(`[${this.name}:${type.toUpperCase()}]:`, ... args);
// });

// const tg = new StatusReporter({context: undefined});
// const ng = new StatusReporter({context: new Node()});
// ng.context;
// ng.generator;

// StatusGenerator.setGeneratorForType(Node, nodeStatusGenerator);
