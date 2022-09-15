/* eslint-disable jsdoc/require-jsdoc */
import {Chunk, DataChunk, MetadataType, Source, SourceMethods, ThroughMethods} from "../../index";

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
    includeId?: boolean;
    enableLogging?: boolean;
    switchLogger?: boolean;
}

let cnt = 0;
export class TestSource extends Source {
    countBy: number;
    delay: number;
    sendNum: number;
    count: number;
    enableLogging: boolean;
    switchLogger: boolean;
    id: number;
    includeId: boolean;

    constructor(opt: TestSourceOpts = {}) {
        super({
            pull: (methods) => {
                return this.testPull.call(this, methods);
            },
            name: "test-source",
        });

        this.id = cnt++;
        this.includeId = opt.includeId ?? false;
        this.enableLogging = opt.enableLogging ?? false;
        this.switchLogger = opt.switchLogger ?? false;
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
        if (this.includeId) {
            next.data.id = this.id;
        }

        this.count += this.countBy;
        this.tryLog(next);

        await methods.send(0, next);
    }

    tryLog(next: any): void {
        if (!this.enableLogging) {
            return;
        }

        if (this.switchLogger) {
            switch (next.data.count % 5) {
            case 0:
                this.logger.log(`[log] TestSource sending: ${next.data.count}`);
                return;
            case 1:
                this.logger.error(`[error] TestSource sending: ${next.data.count}`);
                return;
            case 2:
                this.logger.warn(`[warn] TestSource sending: ${next.data.count}`);
                return;
            case 3:
                this.logger.trace(`[trace] TestSource sending: ${next.data.count}`);
                return;
            case 4:
                this.logger.debug(`[debug] TestSource sending: ${next.data.count}`);
                return;
            default: break;
            }
        }

        this.logger.log("TestSource sending:", next.data);
    }
}

export interface TestRouteOpts {
    numChannels?: number;
    outputChan?: number;
    outputType?: TestRouteTypes;
}

export type TestRouteTypes = "round-robin" | "single-chan" | "broadcast";

export class TestRoute extends Source {
    count: number;
    outputChan: number;
    outputType: TestRouteTypes;

    constructor(cfg: TestRouteOpts = {}) {
        super({
            name: "test-route",
            numChannels: cfg.numChannels ?? 3,
            pull: async(methods: SourceMethods) => {
                await this.testPull.call(this, methods);
            },
        });

        this.count = 0;
        this.outputChan = cfg.outputChan ?? 0;
        this.outputType = cfg.outputType ?? "single-chan";
    }

    async testPull(this: TestRoute, methods: SourceMethods): Promise<void> {
        if (this.count > 10) {
            return methods.finished();
        }

        if (this.outputType === "round-robin") {
            return this.roundRobinPull(methods);
        }

        if (this.outputType === "broadcast") {
            return this.broadcastPull(methods);
        }

        return this.normalPull(methods);
    }

    async roundRobinPull(this: TestRoute, methods: SourceMethods): Promise<void> {
        const chNum = this.count % this.numChannels;

        const next = {count: this.count};
        this.count++;
        await methods.send(chNum, Chunk.create({type: "data", data: next}));
    }

    async normalPull(this: TestRoute, methods: SourceMethods): Promise<void> {
        const next = {count: this.count};
        this.count++;
        await methods.send(this.outputChan, Chunk.create({type: "data", data: next}));
    }

    async broadcastPull(this: TestRoute, methods: SourceMethods): Promise<void> {
        for (let i = 0; i < this.numChannels; i++) {
            const next = {count: `${i}-${this.count}`};
            await methods.send(i, Chunk.create({type: "data", data: next}));
            // TODO: methods.sendMulti
        }
        this.count++;
    }
}

export class TestMetadata extends MetadataType {
    value = "testy";

    constructor() {
        super({namespace: "testspace", name: "test"});
    }
}

export function objectSource(objs: Array<Record<any, any>>): Source {
    let curr = 0;
    return new Source({
        name: "object-source",
        pull: async(methods): Promise<void> => {
            if (curr > (objs.length - 1)) {
                await methods.finished();
                return;
            }

            const next = objs[curr];
            curr++;

            const chunk = Chunk.create({type: "data", data: next});
            await methods.send(0, chunk);
        },
    });
}

