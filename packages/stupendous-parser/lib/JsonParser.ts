import {Readable, Writable} from "node:stream";
import {Parser} from "./Parser";
import {TransformStream} from "node:stream/web";
import {parser} from "stream-json";
import {pick} from "stream-json/filters/Pick";
import {streamArray} from "stream-json/streamers/StreamArray";
import {streamObject} from "stream-json/streamers/StreamObject";
import {streamValues} from "stream-json/streamers/StreamValues";

export type JsonSelectorFn = (path: ReadonlyArray<number | string | null>) => boolean;

interface JsonEncodeOpts {
    foo?: string;
}

interface JsonDecodeOpts {
    path: string | RegExp | JsonSelectorFn;
    outputType?: "array" | "object" | "values";
}

export class JsonParser extends Parser {
    type = "json";

    encode(_opt: JsonEncodeOpts): TransformStream {
        return new TransformStream();
    }

    decode(opt: JsonDecodeOpts): TransformStream {
        let outputTransform: typeof streamArray | typeof streamObject | typeof streamValues;
        switch (opt.outputType) {
        case "array":
            outputTransform = streamArray;
            break;
        case "object":
            outputTransform = streamObject;
            break;
        case "values":
            outputTransform = streamValues;
            break;
        default:
            outputTransform = streamArray;
        }
        const pipelineInput = parser();
        const pipelineOutput = pipelineInput.pipe(pick({filter: opt.path})).pipe(outputTransform());

        return {
            writable: Writable.toWeb(pipelineInput),
            readable: Readable.toWeb(pipelineOutput),
        };
    }
}
