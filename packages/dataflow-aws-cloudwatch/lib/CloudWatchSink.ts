import {Chunk, Sink, SinkMethods, SinkOpts} from "@dataflow-designer/dataflow-core";
import {CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, DescribeLogStreamsCommand, PutLogEventsCommand} from "@aws-sdk/client-cloudwatch-logs";

type PutLogEventsCommandInput = ConstructorParameters<typeof PutLogEventsCommand>[0];
type LogQueue = NonNullable<PutLogEventsCommandInput["logEvents"]>;

interface CloudWatchSinkOpts extends Omit<SinkOpts, "push"> {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    logGroupName: string;
    logStreamName: string;
    createGroup?: boolean;
    createStream?: boolean;
}

export class CloudWatchSink extends Sink {
    #cwClient: CloudWatchLogsClient;
    #logQueue: LogQueue = [];
    #logQueueBytes = 0;
    #lastSend = Date.now();
    #sequenceNum: string | undefined = undefined;
    #logGroupName: string;
    #logStreamName: string;
    #createGroup: boolean;
    #createStream: boolean;

    constructor(cfg: CloudWatchSinkOpts) {
        super({
            ... cfg,
            mode: "fifo",
            push: (chunk, methods) => this.#push(chunk, methods),
            writeClose: async(): Promise<void> => {
                await this.#sendLogs();
            },
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
        this.#createGroup = cfg.createGroup ?? false;
        this.#createStream = cfg.createStream ?? false;
    }

    async #push(chunk: Chunk, _methods: SinkMethods): Promise<void> {
        const data = JSON.stringify(chunk);
        this.#logQueueBytes += data.length + 1;
        this.#logQueue.push({message: data, timestamp: Date.now()});

        // send logs when >1MB, >=10k records, <5x per second
        if (this.#logQueueBytes > (1024 * 1024) ||
            this.#logQueue.length > 9500 ||
            (Date.now() - this.#lastSend) > 250) {
            await this.#sendLogs();
        }
    }

    async #sendLogs(): Promise<void> {
        console.log("#sendLogs:", this.#logQueue.length);
        // get sequence number if needed
        if (!this.#sequenceNum) {
            this.#sequenceNum = await this.#getSequenceNumber();
        }

        // send logs
        const cmd = new PutLogEventsCommand({
            logEvents: this.#logQueue,
            logStreamName: this.#logStreamName,
            logGroupName: this.#logGroupName,
            sequenceToken: this.#sequenceNum,
        });
        const response = await this.#cwClient.send(cmd);

        // save sequence number
        this.#sequenceNum = response.nextSequenceToken;

        // reset decision-making metrics
        this.#logQueueBytes = 0;
        this.#lastSend = Date.now();
        this.#logQueue.length = 0;
    }

    async #getSequenceNumber(): Promise<string | undefined> {
        console.log("#getSequenceNumber");
        const descStrCmd = new DescribeLogStreamsCommand({
            logGroupName: this.#logGroupName,
        });
        const descStrResp = await this.#cwClient.send(descStrCmd);
        console.log("descStrResp", JSON.stringify(descStrResp, null, 4));
        const sequenceToken = descStrResp?.logStreams?.[0]?.uploadSequenceToken;
        console.log("sequenceToken", sequenceToken);
        return sequenceToken;
    }

    async init(): Promise<void> {
        if (this.#createGroup) {
            console.log("creating group", this.#logGroupName);
            const logGroupCmd = new CreateLogGroupCommand({logGroupName: this.#logGroupName});
            await this.#cwClient.send(logGroupCmd);
        }

        if (this.#createStream) {
            console.log("creating stream", this.#logStreamName);
            const logStreamCmd = new CreateLogStreamCommand({logGroupName: this.#logGroupName, logStreamName: this.#logStreamName});
            await this.#cwClient.send(logStreamCmd);
        }

        await super.init();
    }
}
