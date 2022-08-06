import {DeferredPromise, walkStream} from "./utils";

export const DataflowSymbol = Symbol();

export interface ComponentOpts {
    name?: string
    log?: {
        error: typeof console.error
        warn: typeof console.warn,
        info: typeof console.info,
        debug: typeof console.debug,
        trace: typeof console.trace,
    }
}

/**
 * The base component
 */
export abstract class Component {
    readonly isReadable: boolean = false;
    readonly isWritable: boolean = false;
    initialized = false;
    initDone: Promise<unknown>;
    resolveInit: () => void;
    name = "<undefined>";
    log = {
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
        trace: console.trace,
    }

    /**
     * Creates a new component
     *
     * @param opts - Options for the new component
     */
    constructor(opts: ComponentOpts = {}) {
        this.name = opts.name ?? this.name;
        this.log = opts.log ?? this.log;
        const dp = new DeferredPromise<void>();
        this.initDone = dp.promise;
        this.resolveInit = dp.resolve;
        Object.defineProperty(this, DataflowSymbol, {
            configurable: false,
            enumerable: false,
            value: true,
        });
    }

    /**
     * initializes the component
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async init(): Promise<void> {
        console.log("Component.init()");
        this.initialized = true;
        this.resolveInit();
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
