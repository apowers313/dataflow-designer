import {Parser as CParser, Options as CParserOptions, parse} from "csv-parse";
import {TransformStream} from "node:stream/web";
import {Duplex, Readable, Writable} from "node:stream";
import {Stringifier, Options as StringifierOptions, stringify} from "csv-stringify";
import {Parser} from "./Parser";

interface CsvEncodeOpts extends CsvCommonOpts {
    header?: boolean;
}

interface CsvDecodeOpts extends CsvCommonOpts {
    columns?: boolean | Array<string>;
}

interface CsvCommonOpts {
    delimiter?: string;
}

export class CsvParser extends Parser {
    type = "csv";

    encode(opt: CsvEncodeOpts = {}): TransformStream {
        // XXX: at the time of this writing, Duplex type is missing experimental toWeb method
        return (Duplex as any).toWeb(stringify({
            header: opt.header ?? true,
            // columns: opt.columns ?? true,
            delimiter: opt.delimiter ?? ",",
        }));
    }

    decode(opt: CsvDecodeOpts = {}): TransformStream {
        // XXX: at the time of this writing, Duplex type is missing experimental toWeb method
        return (Duplex as any).toWeb(parse({
            columns: opt.columns,
            delimiter: opt.delimiter ?? ",",
        }));
    }
}
