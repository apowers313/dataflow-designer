import {ParserOpts} from "./ParserOpts";
import {TransformStream} from "node:stream/web";

type ParserConstructor = new (... args: any[]) => Parser;

interface SpecificParser {
    parser: ParserConstructor;
    parserOpts?: Record<any, any>;
}

/**
 * Abstract class for implementing encoders and decoders
 */
export abstract class Parser {
    abstract type: string;

    abstract encode(... args: any[]): TransformStream;

    abstract decode(... args: any[]): TransformStream;

    /**
     * Registers a new parser so that it can be used to automatically parse files
     *
     * @param type - A string representing the name of the parser. e.g. "gzip" or "json"
     * @param parser - The constructor for creating a new Parser
     * @param parserOpts - The Parser-specific options for parsing this specific type of file. Will be passed to the
     * constructor every time a new parser of this type is created.
     */
    static registerParser(type: string, parser: ParserConstructor, parserOpts?: Record<any, any>): void {
        const sp: SpecificParser = {parser, parserOpts};
        parserRegistry.set(type, sp);
    }

    /**
     * Retreives the constructor and options for a parser of the specified type
     *
     * @param type - The type to retrieve
     * @returns an object containing the `parser` constructor and `parserOpts` that were passed in during registration
     */
    static getParser(type: string): SpecificParser | undefined {
        return parserRegistry.get(type);
    }

    /**
     * Returns a list of registered parsers
     *
     * @returns an array of strings of all the parser types
     */
    static getParserList(): Array<string> {
        return [... parserRegistry.keys()];
    }

    /**
     * Returns a list of registered file extensions
     *
     * @returns an array of all the file extensions that are recognized for automatic parsing
     */
    static getFileExtList(): Array<string> {
        return [... fileExtRegistry.keys()];
    }

    /**
     * Returns a list of registered MIME types
     *
     * @returns an array of all the MIME types that are recognized for automatic parsing
     */
    static getMimeTypeList(): Array<string> {
        return [... mimeRegistry.keys()];
    }

    /**
     * Registers a set of parsers for decoding or encoding a specific file type. For example, the `".tgz"` file extension
     * can be encoded with the `["tar", "gzip"]` parsers.
     *
     * @param ext - The file extension to register, including the dot. e.g. ".zip" or ".csv"
     * @param parsers - An array of registered parsers that are used to encode or decode this file type. The parsers
     * must be specified in the order they are used to encode a file. For example encoding a ".tgz" file would require
     * making the tar first and then gzipping it, so the parsers are registered as `["tar", "gzip"]`. The order is
     * automatically reversed when decoding the specified file extension.
     */
    static registerFileExt(ext: string, parsers: Array<string>): void {
        // make sure parsers exist
        parsers.forEach((p) => {
            if (!Parser.getParser(p)) {
                throw new Error(`parser '${p}' does not exist in registry`);
            }
        });

        fileExtRegistry.set(ext, parsers);
    }

    /**
     * Registers parsers for encoding and decoding the specified MIME type
     *
     * @param mimeType - The MIME type that will be automatically decoded
     * @param parsers - The parsers specified for encoding or decoding, listed here in ENCODING order. See `registerFileExt`
     * for details.
     */
    static registerMime(mimeType: string, parsers: Array<string>): void {
        parsers.forEach((p) => {
            if (!Parser.getParser(p)) {
                throw new Error(`parser '${p}' does not exist in registry`);
            }
        });

        mimeRegistry.set(mimeType, parsers);
    }

    /**
     * Find the file extension for a specified string
     *
     * @param path - The string for a URL or file path that a file exentsion will be found for
     * @returns - The string for the file extension to use for encoding or decoding the resource at the specified path
     */
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

    /**
     * Returns an array of strings that are the parsers to use for encoding the specified file extension.
     *
     * @param ext - The string representing the file extension to find the parser array for
     * @returns an array of strings that are the registered parsers to use for the speciried file extension.
     */
    static getParsersForExt(ext: string): Array<string> | undefined {
        const ret = fileExtRegistry.get(ext);
        if (!ret) {
            return ret;
        }

        return [... ret];
    }

    /**
     * Returns an array of strings that are the parsers to use for encoding the specified MIME type
     *
     * @param mimeType - The string representing the MIME type to find the parser array for
     * @returns an array of strings that are the registered parsers to use for the speciried MIME type
     */
    static getParsersForMimeType(mimeType: string): Array<string> | undefined {
        const ret = mimeRegistry.get(mimeType);

        if (!ret) {
            return ret;
        }

        return [... ret];
    }

    /**
     * Creates a TransformStream for encoding or decoding using the specified list of parsers
     *
     * @param parserStrList - An array of strings representing the registered parsers to string together. Array is in
     * encode order and will be reversed if the `type` is specified as "decode".
     * @param type - "encode" or "decode"
     * @param userOpts - Parser options for encoding or decoding. Keys of object are the names of registered parsers and
     * the objects at those keys are the Parser-specific configuration objects. e.g. to configure a JSON parser to use
     * "ndjson" use the object `{json: {ndjson: true}}`.
     * @returns a TransformStream that will encode a stream of objects into the specified byte stream; or decode a
     * byte stream into a stream of objects.
     */
    static getParserStreamForParserList(parserStrList: Array<keyof ParserOpts>, type: "decode" | "encode", userOpts: ParserOpts = {}): TransformStream | undefined {
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
            // TODO
            // const opts = {
            //     ... userOpts,
            //     ... p.parserOpts,
            // };

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

    /**
     * Finds the parsers to use for the specified file extension and passes them to `getParserStreamForParserList`
     * and returns the resulting TransformStream.
     *
     * @param ext - The registered file extension to decode
     * @param type - "encode" or "decode"
     * @param userOpts - The parser options that will be passed to `getParserStreamForParserList`
     * @returns a TransformStream for encoding or decoding the specified file extension
     */
    static getParserStreamForExt(ext: string, type: "decode" | "encode", userOpts: ParserOpts = {}): TransformStream | undefined {
        const parserStrList = fileExtRegistry.get(ext) as Array<keyof ParserOpts> | undefined;
        if (!parserStrList) {
            return undefined;
        }

        return Parser.getParserStreamForParserList(parserStrList, type, userOpts);
    }

    /**
     * Finds the parsers to use for the specified file path and passes them to `getParserStreamForParserList`
     * and returns the resulting TransformStream.
     *
     * @param path - The path of the URL or file to decode
     * @param type - "encode" or "decode"
     * @param userOpts - The parser options that will be passed to `getParserStreamForParserList`
     * @returns a TransformStream for encoding or decoding the specified file path
     */
    static getParserStreamForPath(path: string, type: "encode" | "decode", userOpts: ParserOpts = {}): TransformStream | undefined {
        const ext = Parser.findExtForPath(path);
        if (!ext) {
            return undefined;
        }

        return Parser.getParserStreamForExt(ext, type, userOpts);
    }

    /**
     * Finds the parsers to use for the specified MIME type and passes them to `getParserStreamForParserList`
     * and returns the resulting TransformStream.
     *
     * @param mimeType - The registered MIME type to decode
     * @param type - "encode" or "decode"
     * @param userOpts - The parser options that will be passed to `getParserStreamForParserList`
     * @returns a TransformStream for encoding or decoding the specified MIME type
     */
    static getParserStreamForMimeType(mimeType: string, type: "encode" | "decode", userOpts: ParserOpts = {}): TransformStream | undefined {
        mimeType = mimeType.split(";")[0];
        const parserStrList = mimeRegistry.get(mimeType) as Array<keyof ParserOpts> | undefined;
        if (!parserStrList) {
            return undefined;
        }

        return Parser.getParserStreamForParserList(parserStrList, type, userOpts);
    }
}

const parserRegistry: Map<string, SpecificParser> = new Map();
const fileExtRegistry: Map<string, Array<string>> = new Map();
const mimeRegistry: Map<string, Array<string>> = new Map();
