import {GetObjectCommand, GetObjectCommandOutput, ListBucketsCommand, ListBucketsCommandOutput, ListObjectsCommand, ListObjectsCommandOutput, S3Client} from "@aws-sdk/client-s3";
import {Source, SourceMethods, SourceOpts} from "@dataflow-designer/dataflow-core";
import {Readable} from "node:stream";

interface S3SourceCfg extends Omit<SourceOpts, "pull"> {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    // bucket: string;
    // key: string;
    maxAttempts?: number;
    // creds?
}

/**
 * Creates a stream of objects from an AWS S3 bucket
 */
export class S3Source extends Source {
    s3client: S3Client;

    /**
     * Creates a new AWS S3 source
     *
     * @param cfg - Options for the new AWS S3 source
     */
    constructor(cfg: S3SourceCfg) {
        super({
            ... cfg,
            pull: (methods) => this.#pull(methods),
        });

        this.s3client = new S3Client({
            region: cfg.region,
            maxAttempts: cfg.maxAttempts ?? 20,
            credentials: {
                accessKeyId: cfg.accessKeyId,
                secretAccessKey: cfg.secretAccessKey,
            },
            // retryMode
            // retryStrategy
            // logger
            // credentials
        });
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #pull(_methods: SourceMethods): Promise<void> {
        return;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async listBuckets(): Promise<ListBucketsCommandOutput> {
        const cmd = new ListBucketsCommand({});
        const resp = await this.s3client.send(cmd);
        return resp;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async listKeys(bucket: string): Promise<ListObjectsCommandOutput> {
        const cmd = new ListObjectsCommand({
            Bucket: bucket,
        });
        const resp = await this.s3client.send(cmd);
        return resp;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async get(bucket: string, key: string): Promise<string> {
        const cmd = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        const resp: GetObjectCommandOutput = await this.s3client.send(cmd);
        // console.log("get response body", resp);
        if (!(resp.Body instanceof Readable)) {
            throw new Error("expected Readable");
        }

        const ret = streamToString(resp.Body);
        return ret;
    }
}

function streamToString(stream: Readable): Promise<string> {
    const chunks: Array<Buffer> = [];
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
}
