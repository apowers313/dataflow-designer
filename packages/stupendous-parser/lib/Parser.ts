import {TransformStream} from "node:stream/web";

export abstract class Parser {
    abstract type: string;

    abstract encode(... args: any[]): TransformStream;

    // async abstract decode(... args: any[]): TransformStream;
}
