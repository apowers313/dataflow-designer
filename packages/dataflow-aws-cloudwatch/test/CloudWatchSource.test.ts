import {GetLogEventsCommand, ServiceInputTypes, ServiceOutputTypes} from "@aws-sdk/client-cloudwatch-logs";
import {accessKeyId, mockSetup, secretAccessKey} from "./helpers/helpers";
import {AwsStub} from "aws-sdk-client-mock";
import {CloudWatchSource} from "../index";
import {Sink} from "@dataflow-designer/dataflow-core";
import {assert} from "chai";
import fs from "node:fs";
import path from "node:path";
import {spy, stub} from "sinon";

// let cwMock: AwsStub<ServiceInputTypes, ServiceOutputTypes>;

// const cwMock = mockClient(CloudWatchLogsClient);

describe("CloudWatchSource", function() {
    let cwMock: AwsStub<ServiceInputTypes, ServiceOutputTypes>;

    before(function() {
        cwMock = mockSetup();
    });

    beforeEach(function() {
        cwMock.reset();
    });

    it("is function", function() {
        assert.isFunction(CloudWatchSource);
    });

    it("simple read", async function() {
        const resp1Json = fs.readFileSync(path.resolve(__dirname, "helpers/data/eventsResp1.json")).toString();
        const resp2Json = fs.readFileSync(path.resolve(__dirname, "helpers/data/eventsResp2.json")).toString();
        const resp3Json = fs.readFileSync(path.resolve(__dirname, "helpers/data/eventsResp3.json")).toString();
        const sinkStub = stub();
        // sinkStub.returns(JSON.parse(resp1Json));
        sinkStub.onCall(0).returns(JSON.parse(resp1Json));
        sinkStub.onCall(1).returns(JSON.parse(resp2Json));
        sinkStub.onCall(2).returns(JSON.parse(resp3Json));
        cwMock.on(GetLogEventsCommand).callsFake(sinkStub);

        const src = new CloudWatchSource({
            region: "us-east-1",
            accessKeyId,
            secretAccessKey,
            batchSize: 3,
            logGroupName: "dataflow-test-group",
            logStreamName: "dataflow-test-stream",
        });
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 10);
    });
});
