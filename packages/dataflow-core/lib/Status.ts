import {ContextConstructor} from "./utils";
// import {format} from "node:util";

type StatusFn<TCtx> = (this: TCtx, type: string, ... args: any[]) => void;
type StatusReporterRegistryIndexType<T> = ContextConstructor<T> | undefined;
// eslint-disable-next-line @typescript-eslint/ban-types
type ContextClassInstance = Record<"constructor", Function> | undefined;
export type StatusReporterConstructor<T> = new (context: T) => StatusReporter<T>;

const statusRegistry: Map<StatusReporterRegistryIndexType<any>, StatusReporterConstructor<any>> = new Map();

export interface StatusReporterCfg<TCtx> {
    context?: TCtx;
    status: StatusFn<TCtx>;
}

/**
 * A pluggable status reporter. Intended to show visual status in Node-RED but may be any other status reporting in
 * non-Node-RED platforms.
 */
export class StatusReporter<TCtx> {
    context!: TCtx;
    #statusFn: StatusFn<TCtx>;

    /**
     * Creates a new status reporter
     *
     * @param cfg - The config for the new status reporter
     */
    constructor(cfg: StatusReporterCfg<TCtx>) {
        if (cfg.context) {
            this.context = cfg.context;
        }

        this.#statusFn = cfg.status;
    }

    /**
     * Sets the status
     *
     * @param type - Type of the status (e.g. "info")
     * @param args - Status description
     */
    status(type: string, ... args: any[]): void {
        this.#statusFn.call(this.context, type, ... args);
    }

    /**
     * Returns a status reporter for a specific context
     *
     * @param ctx - The context to look up
     * @returns a previously registered status reporter
     */
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

    /**
     * Registers a status reporter for the specific status type
     *
     * @param t - The type to register
     * @param gen - The constructor for the status reporter
     */
    static setStatusReporterForType<T>(t: StatusReporterRegistryIndexType<T>, gen: StatusReporterConstructor<T>): void {
        statusRegistry.set(t, gen);
    }
}

/**
 * The default status reporter, uses `console.log` to report status
 */
export class DefaultStatusReporter extends StatusReporter<undefined> {
    /**
     * Creates a new default status reporter
     *
     * @param ctx - The context used to report the status.
     */
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
