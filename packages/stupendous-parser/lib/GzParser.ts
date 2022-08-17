import {createGunzip, createGzip} from "node:zlib";
import {Duplex} from "node:stream";
import {Parser} from "./Parser";
import {TransformStream} from "node:stream/web";

export class GzParser extends Parser {
    type = "gz";

    encode(): TransformStream {
        return (Duplex as any).toWeb(createGzip());
    }

    decode(): TransformStream {
        return (Duplex as any).toWeb(createGunzip());
    }
}
