import {Duplex, Readable, Transform, Writable} from "node:stream";
import {Parser} from "./Parser";
import {ReadableStream, TransformStream, WritableStream} from "node:stream/web";
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

export class JsonParser extends Parser {
    type = "json";

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
                    console.log("JsonParser decode transform");
                    controller.enqueue(chunk.value);
                },
                flush: () => {
                    console.log("JsonParser decode transform flush");
                },
            }));
        }

        let chunkCnt = 0;
        // let firstThrow = true;
        readable = readable.pipeThrough(new TransformStream({
            transform: (chunk, controller): void => {
                // console.log("JsonParser saftey check");
                chunkCnt++;
                controller.enqueue(chunk);
            },
            flush: () => {
                console.log("JsonParser saftey check done");
                // if (chunkCnt === 0 && firstThrow) {
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
