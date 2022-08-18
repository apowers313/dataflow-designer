import {TransformStream} from "node:stream/web";
import {parser} from "stream-json";

type ParserConstructor = new (... args: any[]) => Parser

interface SpecificParser {
    parser: ParserConstructor;
    parserOpts?: Record<any, any>;
}

export abstract class Parser {
    abstract type: string;

    abstract encode(... args: any[]): TransformStream;

    abstract decode(... args: any[]): TransformStream;

    static registerParser(type: string, parser: ParserConstructor, parserOpts?: Record<any, any>): void {
        const sp: SpecificParser = {parser, parserOpts};
        parserRegistry.set(type, sp);
    }

    static getParser(type: string): SpecificParser | undefined {
        return parserRegistry.get(type);
    }

    static getParserList(): Array<string> {
        return [... parserRegistry.keys()];
    }

    // XXX: parsers must be in ENCODE order
    static registerFileExt(ext: string, parsers: Array<string>): void {
        // make sure parsers exist
        parsers.forEach((p) => {
            if (!Parser.getParser(p)) {
                throw new Error(`parser '${p}' does not exist in registry`);
            }
        });

        fileExtRegistry.set(ext, parsers);
    }

    static findExtForPath(path: string): string | undefined {
        const matches: Array<string> = [];
        fileExtRegistry.forEach((_value, ext) => {
            if (path.endsWith(ext)) {
                matches.push(ext);
            }
        });

        if (matches.length === 0) {
            return undefined;
        }

        // if we have two matches like ".zip" and ".csv.zip" return the longer (more specific) match
        let ret = "";
        matches.forEach((str) => {
            if (str.length > ret.length) {
                ret = str;
            }
        });

        return ret;
    }

    static getParsersForExt(ext: string): Array<string> | undefined {
        const ret = fileExtRegistry.get(ext);
        if (!ret) {
            return ret;
        }

        return [... ret];
    }

    static getParserStreamForExt(ext: string, type: "encode" | "decode", userOpts: Record<any, any> = {}): TransformStream | undefined {
        const parserStrList = fileExtRegistry.get(ext);
        if (!parserStrList) {
            return undefined;
        }

        function mergeOpts(base: Record<any, any>, add: Record<any, any> | undefined): Record<any, any> {
            if (!add) {
                return base;
            }

            return Object.assign(base, add);
        }

        const parserList = parserStrList.map((str) => {
            const p = Parser.getParser(str);
            if (!p) {
                throw new Error(`parser not found: '${str}'`);
            }

            const parser = new (p.parser)();

            let opts: Record<any, any> = {};
            opts = mergeOpts(opts, userOpts[str]);
            opts = mergeOpts(opts, p.parserOpts);

            if (type === "decode") {
                return parser.decode(opts);
            }

            return parser.encode(opts);
        });

        if (type === "decode") {
            parserList.reverse();
        }

        let prev: TransformStream;
        parserList.forEach((curr) => {
            if (!prev) {
                prev = curr;
                return;
            }

            prev.readable.pipeThrough(curr);
            prev = curr;
        });

        const last = parserList.length - 1;
        return {
            writable: parserList[0].writable,
            readable: parserList[last].readable,
        };
    }

    static getParserStreamForPath(path: string, type: "encode" | "decode", parserOpts: Record<any, any> = {}): TransformStream | undefined {
        const ext = Parser.findExtForPath(path);
        if (!ext) {
            return undefined;
        }

        return Parser.getParserStreamForExt(ext, type, parserOpts);
    }
}

const parserRegistry: Map<string, SpecificParser> = new Map();

const fileExtRegistry: Map<string, Array<string>> = new Map();
