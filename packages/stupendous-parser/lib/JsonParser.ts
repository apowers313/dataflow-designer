import {Duplex, Readable, Transform, Writable} from "node:stream";
import {ReadableStream, TransformStream, WritableStream} from "node:stream/web";
import {Parser} from "./Parser";
import {disassembler} from "stream-json/Disassembler";
import {parser as jsonParser} from "stream-json";
import {stringer as jsonStringer} from "stream-json/Stringer";
import {parser as jsonlParser} from "stream-json/jsonl/Parser";
import {stringer as jsonlStringer} from "stream-json/jsonl/Stringer";
import {pick} from "stream-json/filters/Pick";
import {streamArray} from "stream-json/streamers/StreamArray";
import {streamObject} from "stream-json/streamers/StreamObject";
import {streamValues} from "stream-json/streamers/StreamValues";

export type JsonSelectorFn = (path: ReadonlyArray<number | string | null>) => boolean;

export interface JsonEncodeOpts extends JsonCommonOpts {
    makeArray?: boolean;
}

export interface JsonDecodeOpts extends JsonCommonOpts {
    path?: string | RegExp | JsonSelectorFn;
    outputType?: "array" | "object" | "values";
    includeKeys?: boolean;
}

export interface JsonCommonOpts {
    ndjson?: boolean;
}

/**
 * A encoder and decoder for JSON files. Supports both JSON streams and NDJSON / JSONL files or streams.
 */
export class JsonParser extends Parser {
    type = "json";

    /**
     * Encodes a stream of objects into a JSON file
     *
     * @param opt - Options for encoding the JSON file
     * @returns a byte stream representing a JSON file
     */
    encode(opt: JsonEncodeOpts = {}): TransformStream {
        let writable: WritableStream;
        let readable: ReadableStream;

        if (opt.ndjson) {
            ({readable, writable} = (Duplex as any).toWeb(jsonlStringer()));
        } else {
            const objToJsonStream = disassembler();
            writable = Writable.toWeb(objToJsonStream);
            readable = Readable.toWeb(objToJsonStream.pipe(jsonStringer({makeArray: opt.makeArray ?? true})));
        }

        return {writable, readable};
    }

    /**
     * Decodes a byte stream representing a JSON file into a stream of objects
     *
     * @param opt - The options for decoding the JSON file
     * @returns a TransformStream that consumes a byte stream of a JSON file and emits a stream of decoded objects
     */
    decode(opt: JsonDecodeOpts = {}): TransformStream {
        let writable: WritableStream;
        let readable: ReadableStream<Record<any, any>>;
        const path = opt.path ?? "";
        const includeKeys = opt.includeKeys ?? false;

        if (opt.ndjson) {
            ({readable, writable} = (Duplex as any).toWeb(jsonlParser()));
        } else {
            const jsonParserStream = jsonParser();
            writable = Writable.toWeb(jsonParserStream);
            readable = Readable.toWeb(jsonParserStream
                .pipe(pick({filter: path}))
                .pipe(outputTypeToTransform(opt.outputType)));
        }

        if (!includeKeys) {
            readable = readable.pipeThrough(new TransformStream({
                transform: function(chunk: Record<any, any>, controller): void {
                    controller.enqueue(chunk.value);
                },
            }));
        }

        let chunkCnt = 0;
        // let firstThrow = true;
        readable = readable.pipeThrough(new TransformStream({
            transform: (chunk, controller): void => {
                chunkCnt++;
                controller.enqueue(chunk);
            },
            // eslint-disable-next-line jsdoc/require-jsdoc
            flush: (): void => {
                if (chunkCnt === 0) {
                    // firstThrow = false;
                    console.warn("Stream ending and no chunks sent. Did you specify the right JSON path?");
                    // throw new Error("Stream ending and no chunks sent. Did you specify the right JSON path?");
                }
            },
        }));

        return {writable, readable};
    }
}

function outputTypeToTransform(type?: string): Transform {
    switch (type) {
    case "array":
        return streamArray();
    case "object":
        return streamObject();
    case "values":
        return streamValues();
    default:
        return streamValues();
    }
}
