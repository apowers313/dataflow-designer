import {DataCollection, DataCollectionDecodeCfg, DataCollectionEncodeCfg, DataCollectionEntry, DataCollectionEntryCfg, Parser, ParserDecodeOpts} from "@dataflow-designer/stupendous-parser";
import {RequestInfo, Response} from "undici";
import {TransformStream} from "node:stream/web";

export interface UrlMetadata {
    request: RequestInfo;
    response: Response;
}

export interface UrlStreamMetadataCfg extends DataCollectionEntryCfg<RequestInfo> {}

/**
 * A single URL stream and it's associated metadata
 */
export class UrlDataEntry extends DataCollectionEntry<UrlMetadata> {
    // eslint-disable-next-line jsdoc/require-jsdoc
    discard(): void { /* ignored */ }
    // eslint-disable-next-line jsdoc/require-jsdoc
    done(): void { /* ignored */ }
}

export interface UrlDataCollectionEncodeOpts extends DataCollectionEncodeCfg {}
export interface UrlDataCollectionDecodeOpts extends DataCollectionDecodeCfg {}

/**
 * A collection of URL streams that will be parsed into a stream of corresponding objects
 */
export class UrlDataCollection extends DataCollection {
    type = "url";

    /**
     * Encodes a stream of objects into a byte stream and sends it to the specified URLs. Not currently implemented.
     *
     * @param _opts - Not implemented
     */
    encode(_opts: UrlDataCollectionEncodeOpts = {}): TransformStream {
        throw new Error("encode not implemented");
    }

    /**
     * Decodes a URL into a stream of objects
     *
     * @param opts - Options for decoding the URL
     * @returns a TransformStream that consumes a byte stream into a stream of objects
     */
    decode(opts: UrlDataCollectionDecodeOpts = {}): TransformStream<UrlDataEntry> {
        return super.decode({... opts, customParserFn: findUrlDecodeParser});
    }
}

function findUrlDecodeParser(urlEntry: UrlDataEntry, parserOpts?: ParserDecodeOpts): TransformStream {
    let ret: TransformStream | undefined;

    const mimeType = urlEntry.metadata.response.headers.get("content-type");
    if (mimeType) {
        ret = Parser.getParserStreamForMimeType(mimeType, "decode", parserOpts);
    } else {
        const url = urlEntry.metadata.request.toString();
        ret = Parser.getParserStreamForPath(url, "decode", parserOpts);
    }

    if (!ret) {
        throw new Error("couldn't get parser for URL");
    }

    return ret;
}
