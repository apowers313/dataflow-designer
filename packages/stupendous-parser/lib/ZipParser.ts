/* eslint-disable jsdoc/require-jsdoc */
import {Duplex, Readable, Writable} from "node:stream";
import {DataCollection, DataCollectionEntry} from "./DataCollection";
import {Parser} from "./Parser";
import {ReadableStream, TransformStream, WritableStream} from "node:stream/web";
// import compressing from "compressing";
import {once} from "node:events";
import {Entry as ZipEntry, Parse as ZipParse} from "unzip-stream";

type NextFn = () => void;

class ZipDataCollectionEntry extends DataCollectionEntry<ZipEntry> {
    // next: NextFn;

    // TODO
    constructor(header: ZipEntry) {
        super({
            metadata: header,
            stream: Readable.toWeb(header),
            path: header.path,
        });

        // this.next = next;
    }

    discard(): void {
        this.metadata.autodrain();
    }

    done(): void {
        // this.next();
    }
}

export class ZipParser extends DataCollection {
    type = "zip";
    // decodeStream!: Writable;
    // decodeController!: TransformStreamDefaultController;

    // encode(): TransformStream {
    //     // return (Duplex as any).toWeb(createZip());
    //     throw new Error("zip: encode not implemented");
    // }

    decode(): TransformStream<never, ZipDataCollectionEntry> {
        // XXX: at the time of this writing, Duplex.toWeb is erroneously missing from node's typescript definitions
        // const unzip = new compressing.zip.UncompressStream();
        // console.log("created uncompressing stream");
        // unzip.on("entry", (... args) => {
        //     console.log("ENTRY TO DATA");
        //     unzip.emit("data", ... args);
        // });
        // const inputStream = Writable.toWeb(unzip);
        const unzip = ZipParse();

        const collectionStream = new TransformStream({
            start: async(controller): Promise<void> => {
                unzip.on("entry", (header: ZipEntry) => {
                    console.log("ENTRY HEADER", header);
                    // console.log("ENTRY STREAM", stream);
                    // console.log("ENTRY NEXT", next);
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
                console.log("WRITING CHUNK", chunk);
                // const buf = Buffer.from(chunk.buffer);
                // console.log("Buffer", buf);
                console.log("writng");
                unzip.write(chunk);
                // unzip.on("entry", function(... args) {
                //     console.log("ENTRY", ... args);
                //     // stream.on("end", next);
                //     // controller.enqueue(stream);
                // });
            },
        });

        console.log("super decode");
        return super.decode({collectionStream});
        // const readable = new ReadableStream();
        // return {writable: inputStream, readable};
        // return tStream;
    }

    // async *decoderEntryGenerator(): AsyncGenerator<ZipDataCollectionEntry, void, void> {
    //     this.decodeStream = new compressing.zip.UncompressStream();
    //     this.decodeStream.on("entry", () => {
    //         console.log("ENTRY");
    //     });
    //     let r;
    //     while (1) {
    //         console.log("while 1");
    //         const r = await Promise.race([
    //             once(this.decodeStream, "error"),
    //             once(this.decodeStream, "finish"),
    //             once(this.decodeStream, "entry"),
    //         ]);
    //         console.log("r", r);
    //         // if (r[0]) throw error;
    //         // if (r[1]) return;

    //         const zdce = new ZipDataCollectionEntry({path: "dummy", source: r[2] as any});
    //         yield zdce;
    //     }
    // }
}
