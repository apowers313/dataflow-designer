import {DataCollection, DataCollectionDecodeCfg, DataCollectionEncodeCfg, DataCollectionEntry} from "./DataCollection";
import {Duplex, Readable} from "node:stream";
import {Entry as ZipEntry, Parse as ZipParse} from "unzip-stream";
import {TransformStream} from "node:stream/web";
import archiver from "archiver";
import {once} from "node:events";

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

export class ZipParser extends DataCollection {
    type = "zip";

    encode(opts: ZipEncodeOpts = {}): TransformStream<any, ZipDataCollectionEntry> {
        const enc = super.encode(opts);
        const {writable} = enc;
        const zipArchiver = archiver("zip");
        console.log("zipArchiver", zipArchiver);
        const readable = Readable.toWeb(zipArchiver);

        const zipPump = new WritableStream({
            write: async(entry): Promise<void> => {
                zipArchiver.append(
                    Readable.fromWeb(entry.stream),
                    {name: entry.path},
                );
                console.log("once entry");
                await once(zipArchiver, "entry");
                console.log("entry done");
            },
            close: async(): Promise<void> => {
                await zipArchiver.finalize();
            },
        });
        setPromiseHandled(enc.readable.pipeTo(zipPump));

        // const entryReader = enc.readable.getReader();
        // (Duplex as any).toWeb(zipArchiver) as TransformStream;
        // const readable = enc.readable.pipeThrough(zipArchiver);
        // const readable = new WritableStream<DataCollectionEntry>({
        //     write: async(dce): Promise<void> => {
        //         entryReader.read();
        //         // const data = entryReader.read();
        //     },
        //     flush: async(): Promise<void> => {
        //         await zipArchiver.finalize();
        //     },
        // });
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
