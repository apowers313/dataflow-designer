import {createGunzip, createGzip} from "node:zlib";
import {Duplex} from "node:stream";
import {Parser} from "./Parser";
import {TransformStream} from "node:stream/web";

/**
 * A parser for compressing / decompressing byte streams using the gzip algorithm
 */
export class GzParser extends Parser {
    type = "gz";

    /**
     * Encodes a stream of bytes into a gzip compressed byte stream
     *
     * @returns a TransformStream that compresses a byte stream into a gzip byte stream
     */
    encode(): TransformStream {
        return (Duplex as any).toWeb(createGzip());
    }

    /**
     * Decodes a gzip compressed stream of bytes into an uncompressed byte stream
     *
     * @returns a TransformStream that decompresses a gzip byte stream into a uncompressed byte stream
     */
    decode(): TransformStream {
        return (Duplex as any).toWeb(createGunzip());
    }
}
