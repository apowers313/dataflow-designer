import {ContextConstructor} from "./utils";
// import {format} from "node:util";

type StatusFn<TCtx> = (this: TCtx, type: string, ... args: any[]) => void
type StatusReporterRegistryIndexType<T> = ContextConstructor<T> | undefined;
// eslint-disable-next-line @typescript-eslint/ban-types
type ContextClassInstance = Record<"constructor", Function> | undefined;
export type StatusReporterConstructor<T> = new (context: T) => StatusReporter<T>

const statusRegistry: Map<StatusReporterRegistryIndexType<any>, StatusReporterConstructor<any>> = new Map();

export interface StatusReporterCfg<TCtx> {
    context?: TCtx;
    status: StatusFn<TCtx>;
}

export class StatusReporter<TCtx> {
    context!: TCtx;
    #statusFn: StatusFn<TCtx>

    constructor(cfg: StatusReporterCfg<TCtx>) {
        if (cfg.context) {
            this.context = cfg.context;
        }

        this.#statusFn = cfg.status;
    }

    status(type: string, ... args: any[]): void {
        this.#statusFn.call(this.context, type, ... args);
    }

    static getStatusReporterForType<T>(ctx: ContextClassInstance): StatusReporter<T> {
        let lkup = undefined;
        if (typeof ctx === "object" && typeof ctx.constructor === "function") {
            lkup = ctx.constructor as ContextConstructor<T>;
        }

        let ret = statusRegistry.get(lkup);
        if (!ret) {
            ret = statusRegistry.get(undefined) as StatusReporterConstructor<T>;
        }

        return new ret(ctx);
    }

    static setStatusReporterForType<T>(t: StatusReporterRegistryIndexType<T>, gen: StatusReporterConstructor<T>): void {
        statusRegistry.set(t, gen);
    }
}

export class DefaultStatusReporter extends StatusReporter<undefined> {
    constructor(ctx: undefined) {
        super({
            context: ctx,
            status: function(type: string, ... args: any[]) {
                console.log(`[${type.toUpperCase()}]:`, ... args);
            },
        });
    }
}
StatusReporter.setStatusReporterForType(undefined, DefaultStatusReporter);
