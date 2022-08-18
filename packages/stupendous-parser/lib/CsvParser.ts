/* eslint-disable camelcase */
import {Parser as CParser, Options as CParserOptions, Options as CsvParserOptions, parse} from "csv-parse";
import {TransformStream} from "node:stream/web";
import {Duplex, Readable, Writable} from "node:stream";
import {Stringifier, Options as StringifierOptions, stringify} from "csv-stringify";
import {Parser} from "./Parser";

export interface CsvEncodeOpts extends CsvCommonOpts {}

export interface CsvDecodeOpts extends CsvCommonOpts {
    columns?: boolean | Array<string>;
    encoding?: "ascii" | "utf8" | "utf-8" | "utf16le" | "ucs2" | "ucs-2" | "base64" | "base64url" | "latin1" | "binary" | "hex";
    info?: boolean;
    // newlineDelimiter?: string;
    relaxColumnCount?: boolean;
    relaxColumnCountMore?: boolean;
    relaxColumnCountLess?: boolean;
    relaxQuotes?: boolean;
    skipEmptyLines?: boolean;
    skipRecordsWithEmptyValues?: boolean;
    skipRecordsWithError?: boolean;
    trim?: boolean;
}

export interface CsvCommonOpts {
    delimiter?: string;
    header?: boolean;
}

export class CsvParser extends Parser {
    type = "csv";

    encode(opt: CsvEncodeOpts = {}): TransformStream {
        // XXX: at the time of this writing, Duplex type is missing experimental toWeb method
        return (Duplex as any).toWeb(stringify({
            header: opt.header ?? true,
            delimiter: opt.delimiter ?? ",",
        }));
    }

    decode(opt: CsvDecodeOpts = {}): TransformStream {
        const opts: CsvParserOptions = {
            columns: opt.header ?? opt.columns ?? false,
            delimiter: opt.delimiter ?? ",",
            encoding: opt.encoding ?? "utf8",
            info: opt.info ?? false,
            // record_delimiter: opt.newlineDelimiter ?? "\n",
            relax_column_count: opt.relaxColumnCount ?? false,
            relax_column_count_more: opt.relaxColumnCountMore ?? false,
            relax_column_count_less: opt.relaxColumnCountLess ?? false,
            relax_quotes: opt.relaxQuotes ?? false,
            skip_empty_lines: opt.skipEmptyLines ?? true,
            skip_records_with_empty_values: opt.skipRecordsWithEmptyValues ?? false,
            skip_records_with_error: opt.skipRecordsWithError ?? false,
            trim: opt.trim ?? false,
        };

        // XXX: at the time of this writing, Duplex type is missing experimental toWeb method
        return (Duplex as any).toWeb(parse(opts));
    }
}
