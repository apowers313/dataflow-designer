import {Chunk, Sink, SinkMethods, SinkOpts} from "@dataflow-designer/dataflow-core";
import {CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, DescribeLogStreamsCommand, PutLogEventsCommand, PutLogEventsCommandInput, ResourceAlreadyExistsException} from "@aws-sdk/client-cloudwatch-logs";

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

/**
 * Creates a new dataflow component that writes objects to a CloudWatch log group
 */
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

    /**
     * Creates a new CloudWatch sink
     *
     * @param cfg - Options for the new CloudWatch sink
     */
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

    // eslint-disable-next-line jsdoc/require-jsdoc
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

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #sendLogs(): Promise<void> {
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
        this.#logQueue = [];
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #getSequenceNumber(): Promise<string | undefined> {
        const descStrCmd = new DescribeLogStreamsCommand({
            logGroupName: this.#logGroupName,
        });
        const descStrResp = await this.#cwClient.send(descStrCmd);
        const sequenceToken = descStrResp?.logStreams?.[0]?.uploadSequenceToken;
        return sequenceToken;
    }

    /**
     * Typically called by the `.complete()` function from dataflow-core to initialize this component
     */
    async init(): Promise<void> {
        if (this.#createGroup) {
            const logGroupCmd = new CreateLogGroupCommand({logGroupName: this.#logGroupName});
            try {
                await this.#cwClient.send(logGroupCmd);
            } catch (err) {
                if (!(err instanceof ResourceAlreadyExistsException)) {
                    throw err;
                }
            }
        }

        if (this.#createStream) {
            const logStreamCmd = new CreateLogStreamCommand({logGroupName: this.#logGroupName, logStreamName: this.#logStreamName});
            try {
                await this.#cwClient.send(logStreamCmd);
            } catch (err) {
                if (!(err instanceof ResourceAlreadyExistsException)) {
                    throw err;
                }
            }
        }

        await super.init();
    }
}
