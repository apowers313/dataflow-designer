import {CsvDecodeOpts, CsvEncodeOpts} from "./CsvParser";
import {JsonDecodeOpts, JsonEncodeOpts} from "./JsonParser";

export interface ParserDecodeOpts {
    csv?: CsvDecodeOpts;
    json?: JsonDecodeOpts;
}

export interface ParserEncodeOpts {
    csv?: CsvEncodeOpts;
    json?: JsonEncodeOpts;
}

export type ParserOpts = DecodeOpts | EncodeOpts;
