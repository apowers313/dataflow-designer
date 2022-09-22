import type {Component} from "./Component";
import type {ReadableType} from "./Readable";
import type {WritableType} from "./Writable";

/**
 * Indicates whether the specified componant can be read from (provides data).
 * Is also a TypeScript type guard for the ReadableType.
 *
 * @param c - A Component (Source, Sink, or Through)
 * @returns True if the Component is Readable, false otherwise
 */
export function isReadable(c: Component): c is ReadableType {
    return c.isReadable;
}

/**
 * Indicates whether the specified componant can be written to (consumes data).
 * Is also a TypeScript type guard for the WritableType.
 *
 * @param c - A Component (Source, Sink, or Through)
 * @returns True if the Component is Writable, false otherwise
 */
export function isWritable(c: Component): c is WritableType {
    return c.isWritable;
}

class WalkContext {
    history: Set<Component> = new Set();
    remaining: Set<Component> = new Set();

    // alreadyDone(c: Component): boolean {
    //     return this.history.has(c);
    // }

    done(c: Component): void {
        this.history.add(c);
    }

    add(component: Component | Array<Component>): void {
        if (!Array.isArray(component)) {
            component = [component];
        }

        component.forEach((c) => {
            if (!this.history.has(c)) {
                this.remaining.add(c);
            }
        });
    }

    get(): Component | null {
        const [ret] = this.remaining;

        if (!ret) {
            return null;
        }

        this.remaining.delete(ret);
        return ret;
    }
}

export type WalkCallbackFn = (c: Component) => void;

/**
 * Iterates all the components in the stream -- both upstream and downstream -- calling the specified calback for each.
 *
 * @param c - The starting component for iterating the stream. The first callback will be for this component.
 * @param cb - The callback that will be called for each component.
 * @param ctx - Used internally for tracking state throughout recursion.
 */
export function walkStream(c: Component, cb: WalkCallbackFn, ctx?: WalkContext): void {
    if (!ctx) {
        ctx = new WalkContext();
    }

    if (isReadable(c)) {
        ctx.add(c.dests);
    }

    if (isWritable(c)) {
        ctx.add(c.srcs);
    }

    cb(c);
    ctx.done(c);

    const next = ctx.get();
    if (!next) {
        return;
    }

    walkStream(next, cb, ctx);
}

type DeferredResolveFn<T> = (data: T) => void;
type DeferredRejectFn = (err: Error) => void;

/**
 * Contains a Promise that has not yet fulfilled, and the resolve / reject methodes for finalizing it.
 */
export class DeferredPromise<T> {
    /** The pending promise */
    promise: Promise<T>;
    /** The resolve function for the pending Promise */
    resolve!: DeferredResolveFn<T>;
    /** The reject function for the pending Promise */
    reject!: DeferredRejectFn;

    /**
     * Creates the new deferred Promise
     */
    constructor() {
        this.promise = new Promise<T>((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
}

export type PromiseState = "pending" | "fulfilled" | "rejected";

/**
 * Takes a Promise and indicates the state of it: pending, fulfilled, or rejected
 *
 * @param p - Promise to get the state of
 * @returns The state of the Promise: "pending" if it hasn't settled, "fulfilled" if it was resolved and "rejected" if it errored
 */
export function promiseState(p: Promise<unknown>): Promise<PromiseState> {
    const t = {};
    return Promise.race([p, t])
        .then((v) => (v === t) ? "pending" : "fulfilled", () => "rejected");
}

export const inspectSymbol = Symbol.for("nodejs.util.inspect.custom");

/**
 * Error class for internal dataflow errors
 */
export class DataflowError extends Error {}

export type ContextConstructor<T> = new (... args: any[]) => T;

type ResolveFn = (... args: any[]) => void;

/**
 * Creates a read / write exchange between a WritableStream and a ReadableStream, like creating a ThroughStream but when
 * the pieces are in the wrong order.
 */
export class Interlock<T> {
    #writeDone!: Promise<T>;
    #writeResolve!: ResolveFn;
    #readDone!: Promise<void>;
    #readResolve!: ResolveFn;

    /**
     * Creates a new Interlock
     */
    constructor() {
        this.reset();
    }

    /**
     * Sends data to the listening stream
     *
     * @param data - The data to send
     */
    async send(data: T | null): Promise<void> {
        this.#writeResolve(data);
        await this.#readDone;
    }

    /**
     * Receives data from the writing stream
     *
     * @returns a Promise that resolves with the data, or null if the stream has completed
     */
    async recv(): Promise<T | null> {
        const data = await this.#writeDone;
        this.#readResolve();
        this.reset();
        return data;
    }

    /**
     * Called after a single send / recv cycle, indicating that it is okay for the sender to send more data
     */
    reset(): void {
        this.#writeDone = new Promise((resolve) => {
            this.#writeResolve = resolve;
        });

        this.#readDone = new Promise((resolve) => {
            this.#readResolve = resolve;
        });
    }
}
