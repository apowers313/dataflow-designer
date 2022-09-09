import {Chunk, ManualThroughMethods, Source, SourceMethods, SourceOpts, Through, ThroughOpts} from "@dataflow-designer/dataflow-core";
import {DataCollection, ParserDecodeOpts} from "@dataflow-designer/stupendous-parser";
import {RequestInfo, fetch} from "undici";
import {UrlDataCollection, UrlDataEntry} from "./UrlDataCollection";

export function timeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

interface UrlThroughOpts extends Omit<ThroughOpts, "through"> {
    request?: RequestInfo;
    parserOpts?: ParserDecodeOpts;
}

export class UrlThrough extends Through {
    #outputReader: ReadableStreamDefaultReader | undefined;
    #parserOpts: ParserDecodeOpts;

    constructor(opts: UrlThroughOpts = {}) {
        super({
            ... opts,
            manualRead: true,
            through: (methods) => this.through(methods),
        });

        this.name = "url-through";
        this.#parserOpts = opts.parserOpts ?? {};
    }

    async through(methods: ManualThroughMethods): Promise<void> {
        if (!this.#outputReader) {
            this.#outputReader = await this.#getDecodeReader(methods);
        }

        console.log("UrlThrough.through reading");
        const {value, done} = await this.#outputReader.read();
        // console.log("this.#outputReader.read()", done, value);
        if (done) {
            await this.#outputReader.closed;
            methods.finished();
            return;
        }

        const chunk = Chunk.create({type: "data", data: value});
        await methods.send(0, chunk);
    }

    async #getDecodeReader(methods: ManualThroughMethods): Promise<ReadableStreamDefaultReader> {
        const objSource = new ReadableStream({
            pull: async(controller): Promise<void> => {
                console.log("objSource chunk reading");
                const chunk = await methods.read();
                console.log("objSource chunk", chunk);

                if (!chunk) {
                    controller.close();
                    return;
                }

                if (!chunk.isData()) {
                    return;
                }

                const url = chunk.data.url as string;
                const ude = await UrlDataEntry.create(url);
                controller.enqueue(ude);
            },
        });

        const udc = new UrlDataCollection();
        const fetchObjStream = udc.decode({parserOpts: this.#parserOpts});
        const parsedStream = objSource.pipeThrough(fetchObjStream);

        return parsedStream.getReader();
    }
}
