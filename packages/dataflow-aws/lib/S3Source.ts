import {GetObjectCommand, GetObjectCommandOutput, ListBucketsCommand, ListBucketsCommandOutput, ListObjectsCommand, ListObjectsCommandOutput, S3Client} from "@aws-sdk/client-s3";
import {Readable} from "node:stream";
import {Source} from "dataflow-core";

interface S3SourceCfg {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    // bucket: string;
    // key: string;
    maxAttempts?: number;
    // creds?
}

// export class S3Source extends Source {
export class S3Source {
    s3client: S3Client;

    constructor(cfg: S3SourceCfg) {
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

    async listBuckets(): Promise<ListBucketsCommandOutput> {
        const cmd = new ListBucketsCommand({});
        const resp = await this.s3client.send(cmd);
        console.log("bucket list response", resp);
        return resp;
    }

    async listKeys(bucket: string): Promise<ListObjectsCommandOutput> {
        const cmd = new ListObjectsCommand({
            Bucket: bucket,
        });
        const resp = await this.s3client.send(cmd);
        console.log("list objects response", resp);
        return resp;
    }

    async get(bucket: string, key: string): Promise<string> {
        const cmd = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        const resp: GetObjectCommandOutput = await this.s3client.send(cmd);
        console.log("get response body", resp);
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
