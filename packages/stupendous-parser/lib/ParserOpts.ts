import {CsvDecodeOpts, CsvEncodeOpts} from "./CsvParser";
import {JsonDecodeOpts, JsonEncodeOpts} from "./JsonParser";
import {TarDecodeOpts, TarEncodeOpts} from "./TarParser";
import {ZipDecodeOpts, ZipEncodeOpts} from "./ZipParser";

export interface ParserDecodeOpts {
    csv?: CsvDecodeOpts;
    json?: JsonDecodeOpts;
    zip?: ZipDecodeOpts;
    tar?: TarDecodeOpts;
}

export interface ParserEncodeOpts {
    csv?: CsvEncodeOpts;
    json?: JsonEncodeOpts;
    zip?: ZipEncodeOpts;
    tar?: TarEncodeOpts;
}

export type ParserOpts = ParserDecodeOpts | ParserEncodeOpts;
