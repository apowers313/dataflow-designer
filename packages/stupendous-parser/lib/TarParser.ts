import {ArchiverEncodeOpts, archiverEncode} from "./archiver";
import {DataCollection, DataCollectionDecodeCfg, DataCollectionEncodeCfg, DataCollectionEntry} from "./DataCollection";
import {Readable} from "node:stream";
import {TransformStream} from "node:stream/web";
import tar from "tar-stream";

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

export class TarParser extends DataCollection {
    type = "tar";

    encode(opts: TarEncodeOpts = {}): TransformStream<any, TarDataCollectionEntry> {
        return archiverEncode<any, TarDataCollectionEntry>( // TODO
            "tar",
            super.encode.bind(this),
            opts,
        );
    }

    decode(opts: TarDecodeOpts = {}): TransformStream<any, TarDataCollectionEntry> {
        // const pack = tar.extract()
        // extract.on('entry', function(header, stream, next)
        //      stream.on('end'; next()
        // extract.on('finish'; stream.resume()
        // pack.entry();
        return new TransformStream();
    }
}
