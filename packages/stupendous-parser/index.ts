import {CsvParser} from "./lib/CsvParser";
import {GzParser} from "./lib/GzParser";
import {JsonParser} from "./lib/JsonParser";
import {Parser} from "./lib/Parser";
import {TarParser} from "./lib/TarParser";
import {ZipParser} from "./lib/ZipParser";

Parser.registerParser("csv", CsvParser);
Parser.registerParser("json", JsonParser);
Parser.registerParser("ndjson", JsonParser, {ndjson: true});
Parser.registerParser("jsonl", JsonParser, {ndjson: true});
Parser.registerParser("gzip", GzParser);
Parser.registerParser("zip", ZipParser);
Parser.registerParser("tar", ZipParser);

Parser.registerFileExt(".csv", ["csv"]);
Parser.registerFileExt(".json", ["json"]);
Parser.registerFileExt(".ndjson", ["ndjson"]);
Parser.registerFileExt(".jsonl", ["jsonl"]);
Parser.registerFileExt(".zip", ["zip"]);
Parser.registerFileExt(".tgz", ["tar", "gzip"]);
Parser.registerFileExt(".tar.gz", ["tar", "gzip"]);
Parser.registerFileExt(".tar", ["tar"]);

Parser.registerMime("application/json", ["json"]);
Parser.registerMime("application/gzip", ["gzip"]);
Parser.registerMime("application/zip", ["zip"]);
Parser.registerMime("application/x-tar", ["tar"]);
Parser.registerMime("text/csv", ["csv"]);

export {Parser, CsvParser, GzParser, JsonParser, TarParser, ZipParser};
export {DataCollection} from "./lib/DataCollection";
export {ParserOpts, ParserDecodeOpts, ParserEncodeOpts} from "./lib/ParserOpts";
