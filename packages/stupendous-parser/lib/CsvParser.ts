/* eslint-disable camelcase */
import {Options as CsvParserOptions, parse} from "csv-parse";
import {Duplex} from "node:stream";
import {Parser} from "./Parser";
import {TransformStream} from "node:stream/web";
import {stringify} from "csv-stringify";

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

/**
 * An encoder and decoder for Comma Seperated Value (CSV), Tab Separated Value (TSV), or similar files
 */
export class CsvParser extends Parser {
    type = "csv";

    /**
     * Creates an encoder that converts a stream of objects into a byte stream representing a CSV file
     *
     * @param opt - Options for the CSV encoder
     * @returns a TransformStream that consumes a stream of objects and emits a byte stream
     */
    encode(opt: CsvEncodeOpts = {}): TransformStream {
        // XXX: at the time of this writing, Duplex type is missing experimental toWeb method
        return (Duplex as any).toWeb(stringify({
            header: opt.header ?? true,
            delimiter: opt.delimiter ?? ",",
        }));
    }

    /**
     * Creates a decoder that converts a byte stream into a stream of objects
     *
     * @param opt - Options for the decoder
     * @returns a TransformStream that consumes a byte stream and parses it into a stream of objects
     */
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
