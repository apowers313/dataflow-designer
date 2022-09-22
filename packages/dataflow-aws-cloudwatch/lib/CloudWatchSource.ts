import {Chunk, Source, SourceMethods, SourceOpts} from "@dataflow-designer/dataflow-core";
import {CloudWatchLogsClient, GetLogEventsCommand, GetLogEventsCommandOutput} from "@aws-sdk/client-cloudwatch-logs";

type OutputLogEventList = NonNullable<GetLogEventsCommandOutput["events"]>;

interface CloudWatchSourceOpts extends Omit<SourceOpts, "pull"> {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    logGroupName: string;
    logStreamName: string;
    batchSize?: number;
}

/**
 * Creates a new source component that streams log entries from AWS CloudWatch
 */
export class CloudWatchSource extends Source {
    #cwClient: CloudWatchLogsClient;
    #logGroupName: string;
    #logStreamName: string;
    #batchSize: number;
    #nextToken: string | undefined = undefined;
    #cache: OutputLogEventList = [];
    #done = false;

    /**
     * Creates a new CloudWatch source
     *
     * @param cfg - The options for the new CloudWatch source
     */
    constructor(cfg: CloudWatchSourceOpts) {
        super({
            ... cfg,
            pull: (methods) => this.#pull(methods),
        });

        this.#cwClient = new CloudWatchLogsClient({
            region: cfg.region,
            credentials: {
                accessKeyId: cfg.accessKeyId,
                secretAccessKey: cfg.secretAccessKey,
            },
        });

        this.#logGroupName = cfg.logGroupName;
        this.#logStreamName = cfg.logStreamName;
        this.#batchSize = cfg.batchSize ?? 1024;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #pull(methods: SourceMethods): Promise<void> {
        if (this.#done) {
            await methods.finished();
            return;
        }

        console.log("#pull");
        if (this.#cache.length === 0) {
            await this.#fetchBatch();
        }

        let count = methods.desiredSize();
        console.log("#pull count", count);
        if (count === null) {
            throw new Error("desiredSize was null");
        }

        while (count > 0 && this.#cache.length > 0) {
            const data: Record<any, any> | undefined = this.#cache.shift();
            if (!data) {
                throw new Error("unexpectedly ran out of data");
            }

            console.log("sending data", data);

            try {
                const obj = JSON.parse(data.message);
                data.message = obj;
            } catch (err) { /* ignored */ }
            const chunk = Chunk.create({type: "data", data});
            await methods.send(0, chunk);
            count--;
        }
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #fetchBatch(): Promise<void> {
        console.log("#fetchBatch");
        // TODO: startFromHead = true, #nextToken = resp.nextForwardToken
        const cmd = new GetLogEventsCommand({
            logGroupName: this.#logGroupName,
            logStreamName: this.#logStreamName,
            limit: this.#batchSize,
            nextToken: this.#nextToken,
        });

        const resp = await this.#cwClient.send(cmd);
        if (!resp) {
            this.#done = true;
        }

        console.log("resp", JSON.stringify(resp, null, 4));
        this.#nextToken = resp.nextBackwardToken;
        this.#cache = resp.events ?? [];
        if (this.#cache.length === 0) {
            this.#done = true;
        }
    }
}
