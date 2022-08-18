import {Duplex, Readable, Transform, Writable} from "node:stream";
import {Parser} from "./Parser";
import {TransformStream} from "node:stream/web";
import {disassembler} from "stream-json/Disassembler";
import {parser as jsonParser} from "stream-json";
import {stringer as jsonStringer} from "stream-json/Stringer";
import {parser as jsonlParser} from "stream-json/jsonl/Parser";
import {stringer as jsonlStringer} from "stream-json/jsonl/Stringer";
import {pick} from "stream-json/filters/Pick";
import {replace} from "stream-json/filters/Replace";
import {streamArray} from "stream-json/streamers/StreamArray";
import {streamObject} from "stream-json/streamers/StreamObject";
import {streamValues} from "stream-json/streamers/StreamValues";
import {Token} from "stream-json/filters/FilterBase";

export type JsonSelectorFn = (path: ReadonlyArray<number | string | null>) => boolean;

interface JsonEncodeOpts extends JsonCommonOpts {
    makeArray?: boolean;
}

interface JsonDecodeOpts extends JsonCommonOpts {
    path?: string | RegExp | JsonSelectorFn;
    outputType?: "array" | "object" | "values";
}

interface JsonCommonOpts {
    ndjson?: boolean;
}

export class JsonParser extends Parser {
    type = "json";

    encode(opt: JsonEncodeOpts = {}): TransformStream {
        if (opt.ndjson) {
            return (Duplex as any).toWeb(jsonlStringer());
        }

        const pipelineInput = disassembler();
        const pipelineOutput = pipelineInput.pipe(jsonStringer({makeArray: opt.makeArray ?? true}));

        return {
            writable: Writable.toWeb(pipelineInput),
            readable: Readable.toWeb(pipelineOutput),
        };
    }

    decode(opt: JsonDecodeOpts): TransformStream {
        if (opt.ndjson) {
            return (Duplex as any).toWeb(jsonlParser());
        }

        const typeConverter = outputTypeToTransform(opt.outputType);
        const pipelineInput = jsonParser();
        // TODO: autodetect output
        const path = opt.path ?? "";
        const pipelineOutput = pipelineInput.pipe(pick({filter: path})).pipe(typeConverter);

        return {
            writable: Writable.toWeb(pipelineInput),
            readable: Readable.toWeb(pipelineOutput),
        };
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
        return streamArray();
    }
}
