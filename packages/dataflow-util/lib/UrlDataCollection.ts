import {DataCollection, DataCollectionDecodeCfg, DataCollectionEncodeCfg, DataCollectionEntry, DataCollectionEntryCfg, Parser, ParserDecodeOpts} from "@dataflow-designer/stupendous-parser";
import {ReadableStream, TransformStream, WritableStream} from "node:stream/web";
import {RequestInfo, Response, fetch} from "undici";

export interface UrlMetadata {
    request: RequestInfo;
    response: Response;
}

export interface UrlStreamMetadataCfg extends DataCollectionEntryCfg<RequestInfo> {}

export class UrlDataEntry extends DataCollectionEntry<UrlMetadata> {
    // eslint-disable-next-line jsdoc/require-jsdoc
    discard(): void { /* ignored */ }
    // eslint-disable-next-line jsdoc/require-jsdoc
    done(): void { /* ignored */ }

    static async create(url: RequestInfo): Promise<UrlDataEntry> {
        // chunk.data.url
        // chunk.data.body
        // chunk.data.query
        // chunk.data.method

        const response = await fetch(url);

        if (response.status < 200 || response.status > 299) {
            throw new Error(`error getting URL: ${response.statusText}`);
        }

        const httpStream = response.body;
        if (!httpStream) {
            throw new Error("HTTP request did not produce a body");
        }

        return new UrlDataEntry({
            path: url.toString(),
            stream: httpStream,
            metadata: {
                response: response,
                request: url,
            },
        });
    }
}

export interface UrlDataCollectionEncodeOpts extends DataCollectionEncodeCfg {}
export interface UrlDataCollectionDecodeOpts extends DataCollectionDecodeCfg {}

export class UrlDataCollection extends DataCollection {
    type = "url";

    encode(_opts: UrlDataCollectionEncodeOpts = {}): TransformStream {
        throw new Error("encode not implemented");
    }

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
