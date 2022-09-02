import {GetObjectCommand, GetObjectCommandOutput, ListBucketsCommand, ListBucketsCommandOutput, ListObjectsCommand, ListObjectsCommandOutput, S3Client} from "@aws-sdk/client-s3";
import {S3Source} from "../index";
import {assert} from "chai";
import {createReadStream} from "node:fs";
import {mockClient} from "aws-sdk-client-mock";
import path from "node:path";

const s3Mock = mockClient(S3Client);

describe("S3Source", function() {
    beforeEach(function() {
        s3Mock.reset();
    });

    it("is function", function() {
        assert.isFunction(S3Source);
    });

    it("delete me", async function() {
        this.timeout(10 * 1000);
        this.slow(10 * 1000);
        const s3 = new S3Source({
            region: "us-west-2",
            accessKeyId: "FAKEFAKEFAKE",
            secretAccessKey: "FAKEFAKEFAKE",
        });

        s3Mock.on(GetObjectCommand).resolves({
            Body: createReadStream(path.resolve(__dirname, "./helpers/airline_delays.json")),
        });

        // await s3.listBuckets();
        // await s3.listKeys("dev-dataflow-staging");
        const str = await s3.get(
            "dev-dataflow-staging",
            "airline_delays.json",
        );
        // console.log("RESULTS:", str);
    });
});
