import {Component, DataflowSymbol} from "./Component";
import {Sink} from "./Sink";
import {Source} from "./Source";
import {Through} from "./Through";

/**
 * Type check and type guard for Source
 *
 * @param o - Object to check if it is a Source
 * @returns true if object is a Source
 */
export function isSource(o: unknown): o is Source {
    return isComponent(o) && o.isReadable && !o.isWritable && o instanceof Source;
}

/**
 * Type check and type guard for Through
 *
 * @param o - Object to check if it is a Through
 * @returns true if object is a Through
 */
export function isThrough(o: unknown): o is Through {
    return isComponent(o) && o.isReadable && o.isWritable && o instanceof Through;
}

/**
 * Type check and type guard for Sink
 *
 * @param o - Object to check if it is a Sink
 * @returns true if object is a Sink
 */
export function isSink(o: unknown): o is Sink {
    return isComponent(o) && !o.isReadable && o.isWritable && o instanceof Sink;
}

/**
 * Type check and type guard for Component
 *
 * @param o - Object to check if it is a Component
 * @returns true if object is a Component
 */
export function isComponent(o: unknown): o is Component {
    if (typeof o !== "object" || o === null) {
        return false;
    }

    return o instanceof Component && (o as any)[DataflowSymbol] === true;
}
