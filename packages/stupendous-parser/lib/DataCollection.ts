/* eslint-disable jsdoc/require-jsdoc */
import {ReadableStream, ReadableStreamDefaultReader, TransformStream, WritableStream} from "node:stream/web";
import {Parser} from "./Parser";

export interface DataCollectionEntryCfg<TMetadata> {
    path: string;
    stream: ReadableStream;
    metadata: TMetadata;
}

export abstract class DataCollectionEntry<TMetadata extends Record<any, any> = Record<any, any>> {
    metadata: TMetadata;
    stream: ReadableStream;
    path: string;

    constructor(cfg: DataCollectionEntryCfg<TMetadata>) {
        this.stream = cfg.stream;
        this.path = cfg.path;
        this.metadata = cfg.metadata;
    }

    abstract discard(): void;
    abstract done(): void;
}

interface DataCollectionDecodeCfg {
    collectionStream: TransformStream<any, DataCollectionEntry>;
}

export abstract class DataCollection extends Parser {
    abstract type: string;

    encode(): TransformStream {
        return new TransformStream();
    }

    decode(cfg: DataCollectionDecodeCfg): TransformStream {
        const {writable} = cfg.collectionStream;
        const collectionReader = cfg.collectionStream.readable.getReader();
        let currentEntry: DataCollectionEntry | undefined;
        let entryReader: ReadableStreamDefaultReader;

        const getNextEntry = async(controller: ReadableStreamController<any>): Promise<boolean> => {
            const iter = await collectionReader.read();
            if (iter.done) {
                console.log("collection reader done");
                controller.close();
                return false;
            }

            currentEntry = iter.value;
            console.log("currentEntry", currentEntry);
            entryReader = currentEntry.stream.getReader();
            return true;
        };

        const readable = new ReadableStream({
            pull: async(controller): Promise<void> => {
                console.log("read requested");
                if (!currentEntry) {
                    if (!await getNextEntry(controller)) {
                        return;
                    }
                }

                const iter = await entryReader.read();
                if (iter.done) {
                    console.log("entry stream done");
                    currentEntry = undefined;
                    return;
                }

                const entryData = iter.value;
                console.log("entryData", entryData);
                controller.enqueue(entryData);
            },
        });

        return {writable, readable};
    }

    // abstract decoderEntryGenerator(): AsyncGenerator<DataCollectionEntry, void, void>;
}

