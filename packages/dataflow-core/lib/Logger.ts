/* eslint-disable jsdoc/require-jsdoc */
import {ContextConstructor} from "./utils";

type LogFn<TCtx> = (this: TCtx, data: any, ... args: any[]) => void
type MetricFn = () => boolean;
type LoggerRegistryIndexType<T> = ContextConstructor<T> | undefined;
type LoggerConstructor<T> = new (context: T) => Logger<T>

const loggerRegistry: Map<LoggerRegistryIndexType<any>, LoggerConstructor<any>> = new Map();

interface LoggerCfg<TCtx> {
    context?: TCtx,
    log: LogFn<TCtx>
    trace?: LogFn<TCtx>
    debug?: LogFn<TCtx>
    info?: LogFn<TCtx>
    warn?: LogFn<TCtx>
    error?: LogFn<TCtx>
    fatal?: LogFn<TCtx>
    audit?: LogFn<TCtx>
    metric?: MetricFn;
}

export class Logger<TCtx> {
    context!: TCtx;
    cfg: LoggerCfg<TCtx>;
    // audit: LogFn<TCtx>;
    // metric?: MetricFn;

    constructor(cfg: LoggerCfg<TCtx>) {
        if (cfg.context) {
            this.context = cfg.context;
        }

        this.cfg = cfg;
        // this.audit = cfg.audit?.bind(this.context) ?? this.log;
        // this.metric = cfg.metric;
    }

    log(data: any, ... args: any[]): void {
        this.cfg.log.call(this.context, data, ... args);
    }

    trace(data: any, ... args: any[]): void {
        (this.cfg.trace ?? this.cfg.log).call(this.context, data, ... args);
    }

    debug(data: any, ... args: any[]): void {
        (this.cfg.debug ?? this.cfg.log).call(this.context, data, ... args);
    }

    info(data: any, ... args: any[]): void {
        (this.cfg.info ?? this.cfg.log).call(this.context, data, ... args);
    }

    warn(data: any, ... args: any[]): void {
        (this.cfg.warn ?? this.cfg.log).call(this.context, data, ... args);
    }

    error(data: any, ... args: any[]): void {
        (this.cfg.error ?? this.cfg.log).call(this.context, data, ... args);
    }

    fatal(data: any, ... args: any[]): void {
        (this.cfg.fatal ?? this.cfg.log).call(this.context, data, ... args);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    static getLoggerForType<T>(ctx: Record<"constructor", Function> | undefined): Logger<T> {
        let lkup = undefined;
        if (typeof ctx === "object" && typeof ctx.constructor === "function") {
            lkup = ctx.constructor as ContextConstructor<T>;
        }

        let ret = loggerRegistry.get(lkup);
        if (!ret) {
            ret = loggerRegistry.get(undefined) as LoggerConstructor<T>;
        }

        return new ret(ctx);
    }

    static setLoggerForType<T>(t: LoggerRegistryIndexType<T>, gen: LoggerConstructor<T>): void {
        loggerRegistry.set(t, gen);
    }

    // static clone<T>(l: Logger<T>): Logger<T> {
    //     return new Logger(l.cfg);
    // }
}

class DefaultLogger extends Logger<undefined> {
    constructor(context: undefined) {
        super({
            context,
            log: function(data, ... args): void {
                console.log(data, ... args);
            },
        });
    }
}

Logger.setLoggerForType(undefined, DefaultLogger);
