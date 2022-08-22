import {DataCollection, DataCollectionDecodeCfg, DataCollectionEncodeCfg, DataCollectionEntry} from "./DataCollection";
import {Entry as ZipEntry, Parse as ZipParse} from "unzip-stream";
import {Readable} from "node:stream";
import {TransformStream} from "node:stream/web";
import archiver from "archiver";
// import {once} from "node:events";
// import {finished} from "node:stream/promises";

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

    done(): void {
        // ignored
    }
}

export interface ZipDecodeOpts extends DataCollectionDecodeCfg {}
export interface ZipEncodeOpts extends DataCollectionEncodeCfg {}

function xlatReadableStream(stream: ReadableStream): Readable {
    const dataReader = stream.getReader();
    return new Readable({
        read: function(): void {
            dataReader.read()
                .then((iter) => {
                    if (iter.done) {
                        this.push(null);
                        return;
                    }

                    this.push(iter.value);
                })
                .catch((err) => {
                    this.destroy(err);
                });
        },
    });
}

export class ZipParser extends DataCollection {
    type = "zip";

    encode(opts: ZipEncodeOpts = {}): TransformStream<any, ZipDataCollectionEntry> {
        const {writable, readable: entryStream} = super.encode(opts);
        const zipArchiver = archiver("zip");
        const readable = Readable.toWeb(zipArchiver);

        const zipPump = new WritableStream<DataCollectionEntry<ZipEntry>>({
            write: async(entry): Promise<void> => {
                zipArchiver.append(
                    xlatReadableStream(entry.stream),
                    {name: entry.path},
                );
                // await once(zipArchiver, "entry");
                // await finished(dataStream);
            },
            close: async(): Promise<void> => {
                await zipArchiver.finalize();
            },
        });
        setPromiseHandled(entryStream.pipeTo(zipPump));

        return {writable, readable};
    }

    decode(opts: ZipDecodeOpts = {}): TransformStream<any, ZipDataCollectionEntry> {
        const unzip = ZipParse();

        const collectionStream = new TransformStream({
            start: async(controller): Promise<void> => {
                unzip.on("entry", (header: ZipEntry) => {
                    if (header.type !== "File") {
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
                    // console.log("FINISH");
                    // this.decodeController.terminate();
                });

                // unzip.on("end", () => console.log("END"));
            },
            transform: async(chunk): Promise<void> => {
                // console.log("WRITING CHUNK", chunk);
                unzip.write(chunk);
            },
        });

        // TODO: is there a way of doing this with collectionStream.pipeThrough(super.decode())?
        const readable = collectionStream.readable.pipeThrough(super.decode({... opts}));
        const {writable} = collectionStream;

        return {readable, writable};
    }
}

function setPromiseHandled(p: Promise<any>): void {
    p.then(() => {/* resolve ignored */}, () => {/* reject ignored */});
}
