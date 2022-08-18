import {DataCollection, DataCollectionDecodeCfg, DataCollectionEncodeCfg, DataCollectionEntry} from "./DataCollection";
import {Entry as ZipEntry, Parse as ZipParse} from "unzip-stream";
import {Readable} from "node:stream";
import {TransformStream} from "node:stream/web";

class ZipDataCollectionEntry extends DataCollectionEntry<ZipEntry> {
    constructor(header: ZipEntry) {
        super({
            metadata: header,
            stream: Readable.toWeb(header),
            path: header.path,
        });
    }

    discard(): void {
        this.metadata.autodrain();
    }

    done(): void {}
}

export interface ZipDecodeOpts extends Omit<DataCollectionDecodeCfg, "collectionStream"> {}
export interface ZipEncodeOpts extends DataCollectionEncodeCfg {}

export class ZipParser extends DataCollection {
    type = "zip";

    encode(opts: ZipEncodeOpts = {}): TransformStream<any, ZipDataCollectionEntry> {
        return super.encode(opts);
    }

    decode(opts: ZipDecodeOpts = {}): TransformStream<any, ZipDataCollectionEntry> {
        const unzip = ZipParse();

        const collectionStream = new TransformStream({
            start: async(controller): Promise<void> => {
                unzip.on("entry", (header: ZipEntry) => {
                    if (header.type !== "File") {
                        console.log("skipping directory");
                        header.resume();
                        return;
                    }

                    // header.on("end", next);
                    const zdce = new ZipDataCollectionEntry(header);
                    controller.enqueue(zdce);
                });

                unzip.on("error", (err) => {
                    console.log("UNZIP ERROR", err);
                    controller.error(err);
                });

                unzip.on("finish", () => {
                    console.log("FINISH");
                    // this.decodeController.terminate();
                });

                unzip.on("end", () => console.log("END"));
            },
            transform: async(chunk): Promise<void> => {
                // console.log("WRITING CHUNK", chunk);
                unzip.write(chunk);
            },
        });

        console.log("super decode");

        return super.decode({... opts, collectionStream});
    }
}
