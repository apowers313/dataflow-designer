import {ArchiverEncodeOpts, archiverEncode} from "./archiver";
import {DataCollection, DataCollectionDecodeCfg, DataCollectionEntry} from "./DataCollection";
import {Readable} from "node:stream";
import {TransformStream} from "node:stream/web";
// import tar from "tar-stream";

class TarDataCollectionEntry extends DataCollectionEntry<any> {
    constructor(header: any) { // TODO
        super({
            metadata: header,
            stream: Readable.toWeb(header),
            path: header.path,
        });
    }

    discard(): void {
        this.metadata.autodrain();
    }

    done(): void {
        // ignored
    }
}

export interface TarDecodeOpts extends DataCollectionDecodeCfg { }
export interface TarEncodeOpts extends ArchiverEncodeOpts { }

/**
 * Parses a tar file and the files there-in into a stream of objects
 */
export class TarParser extends DataCollection {
    type = "tar";

    /**
     * Encodes a stream of objects into a set of files inside a tar file
     *
     * @param opts - Options for encoding the tar file
     * @returns a TransformStream that consumes a stream of objects and outputs a byte stream of a tar file
     */
    encode(opts: TarEncodeOpts = {}): TransformStream<any, TarDataCollectionEntry> {
        return archiverEncode<any, TarDataCollectionEntry>( // TODO
            "tar",
            super.encode.bind(this),
            opts,
        );
    }

    /**
     * Not currently implemented
     *
     * @param _opts - Not used
     * @returns nothing right now
     */
    decode(_opts: TarDecodeOpts = {}): TransformStream<any, TarDataCollectionEntry> {
        // const pack = tar.extract()
        // extract.on('entry', function(header, stream, next)
        //      stream.on('end'; next()
        // extract.on('finish'; stream.resume()
        // pack.entry();
        return new TransformStream();
    }
}
