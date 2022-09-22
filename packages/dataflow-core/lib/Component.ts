import {ContextConstructor, DeferredPromise, walkStream} from "./utils";
import {Logger} from "./Logger";
import {StatusReporter} from "./Status";

export const DataflowSymbol = Symbol();

export interface ComponentOpts {
    name?: string;
    context?: ContextConstructor<any>;
}

/**
 * The base component
 */
export abstract class Component {
    readonly isReadable: boolean = false;
    readonly isWritable: boolean = false;
    initialized = false;
    started: Promise<unknown>;
    initFinished?: Promise<void>;
    resolveInit: () => void;
    name = "<undefined>";
    logger!: Logger<any>;
    status!: StatusReporter<any>;

    /**
     * Creates a new component
     *
     * @param opts - Options for the new component
     */
    constructor(opts: ComponentOpts) {
        opts = opts ?? {};
        this.name = opts.name ?? this.name;
        const dp = new DeferredPromise<void>();
        this.started = dp.promise;
        this.resolveInit = dp.resolve;
        Object.defineProperty(this, DataflowSymbol, {
            configurable: false,
            enumerable: false,
            value: true,
        });

        this.context = opts.context;
    }

    /**
     * initializes the component
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async init(): Promise<void> {
        this.initialized = true;
        this.resolveInit();
    }

    /**
     * Sets the operating context for the component. Passed to logger and status.
     */
    set context(c: any | undefined) {
        this.logger = Logger.getLoggerForType(c);
        this.status = StatusReporter.getStatusReporterForType(c);
    }

    /**
     * Waits for a dataflow to finish sending all data
     */
    async complete(): Promise<void> {
        const initPromises: Array<Promise<void>> = [];
        walkStream(this, (c) => {
            const p = c.init();
            initPromises.push(p);
        });

        await Promise.all(initPromises);
    }
}
