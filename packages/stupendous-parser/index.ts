import {CsvParser} from "./lib/CsvParser";
import {GzParser} from "./lib/GzParser";
import {JsonParser} from "./lib/JsonParser";
import {Parser} from "./lib/Parser";
import {ZipParser} from "./lib/ZipParser";
import {TarParser} from "./lib/TarParser";

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

export {Parser, CsvParser, GzParser, JsonParser, TarParser, ZipParser};
export {DataCollection} from "./lib/DataCollection";
