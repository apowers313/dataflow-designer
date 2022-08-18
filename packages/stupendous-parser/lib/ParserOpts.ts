import {CsvDecodeOpts, CsvEncodeOpts} from "./CsvParser";
import {JsonDecodeOpts, JsonEncodeOpts} from "./JsonParser";
import {ZipDecodeOpts, ZipEncodeOpts} from "./ZipParser";

export interface ParserDecodeOpts {
    csv?: CsvDecodeOpts;
    json?: JsonDecodeOpts;
    zip?: ZipDecodeOpts;
}

export interface ParserEncodeOpts {
    csv?: CsvEncodeOpts;
    json?: JsonEncodeOpts;
    zip?: ZipEncodeOpts;
}

export type ParserOpts = DecodeOpts | EncodeOpts;
