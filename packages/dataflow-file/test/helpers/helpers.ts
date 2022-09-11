import {Chunk, DataChunk, Source, SourceMethods} from "@dataflow-designer/dataflow-core";

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

export async function timeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export interface TestSourceOpts {
    countBy?: number;
    delay?: number;
    sendNum?: number;
    includeId?: boolean;
}

let cnt = 0;
export class TestSource extends Source {
    countBy: number;
    delay: number;
    sendNum: number;
    count: number;
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

        const next = Chunk.create({type: "data", data: {count: this.count}}) as DataChunk;
        if (this.includeId) {
            next.data.id = this.id;
        }

        this.count += this.countBy;
        await methods.send(0, next);
    }
}
