/* eslint-disable jsdoc/require-jsdoc */
import {DataCollection, DataCollectionEncodeCfg, DataCollectionEntry} from "./DataCollection";
import {TransformStream, WritableStream} from "node:stream/web";
import {setPromiseHandled, xlatReadableStream} from "./utils";
import {Readable} from "node:stream";
import archiver from "archiver";

export interface ArchiverEncodeOpts extends DataCollectionEncodeCfg { }

export function archiverEncode<TMetadata extends Record<any, any>, TOut>(type: "zip" | "tar", parentEncoder: DataCollection["encode"], opts: ArchiverEncodeOpts): TransformStream<any, TOut> {
    const {writable, readable: entryStream} = parentEncoder(opts);
    const ar = archiver(type);
    const readable = Readable.toWeb(ar);

    const pump = new WritableStream<DataCollectionEntry<TMetadata>>({
        write: async(entry): Promise<void> => {
            ar.append(
                xlatReadableStream(entry.stream),
                {name: entry.path},
            );
        },
        close: async(): Promise<void> => {
            await ar.finalize();
        },
    });
    setPromiseHandled(entryStream.pipeTo(pump));

    return {writable, readable};
}
