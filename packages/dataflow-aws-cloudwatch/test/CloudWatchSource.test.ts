import {CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand, PutLogEventsCommand, ServiceInputTypes, ServiceOutputTypes} from "@aws-sdk/client-cloudwatch-logs";
import {Sink, helpers} from "@dataflow-designer/dataflow-core";
import {accessKeyId, mockSetup, secretAccessKey} from "./helpers/helpers";
import {CloudWatchSink, CloudWatchSource} from "../index";
import {assert} from "chai";
import fs from "node:fs";
// import {mockClient} from "aws-sdk-client-mock";
const {objectSource} = helpers;
import path from "node:path";
import {spy, stub} from "sinon";
import {AwsStub, mockClient} from "aws-sdk-client-mock";

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
        // cwMock.on(GetLogEventsCommand).callsFake((... args) => {
        //     console.log("GetLogEventsCommand args", args);
        //     return JSON.parse(resp1Json);
        // });
        // cwMock.on(PutLogEventsCommand).resolves(JSON.parse(resp3Json));
        // cwMock.on(PutLogEventsCommand).callsFake(sinkStub);

        const src = new CloudWatchSource({
            region: "us-east-1",
            accessKeyId,
            secretAccessKey,
            batchSize: 3,
            // logGroupName: "test1-group",
            // logStreamName: "test1-stream",
            logGroupName: "dataflow-test-group",
            logStreamName: "dataflow-test-stream",
        });
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(sink);
        await src.complete();

        console.log("sinkSpy.callCount", sinkSpy.callCount);
        console.log("sinkSpy.args", sinkSpy.args);
        console.log("sinkSpy.args[0][0]", sinkSpy.args[0][0]);
        assert.strictEqual(sinkSpy.callCount, 10);
    });

    // it.only("delete me - read logs", async function() {
    //     const client = new CloudWatchLogsClient({
    //         region: "us-east-1",
    //         credentials: {
    //             accessKeyId,
    //             secretAccessKey,
    //         },
    //     });

    //     cwMock.on(GetLogEventsCommand).callsFake((... args) => {
    //         console.log("GetLogEventsCommand args", args);
    //         return JSON.parse(resp3Json);
    //     });

    //     let cmd = new GetLogEventsCommand({
    //         logStreamName: "dataflow-test-stream",
    //         logGroupName: "dataflow-test-group",
    //         limit: 5,
    //     });

    //     let resp = await client.send(cmd);
    //     console.log("resp", resp);
    //     console.log("resp1", JSON.stringify(resp, null, 4));

    //     cmd = new GetLogEventsCommand({
    //         logStreamName: "dataflow-test-stream",
    //         logGroupName: "dataflow-test-group",
    //         limit: 5,
    //         nextToken: resp.nextBackwardToken,
    //     });
    //     resp = await client.send(cmd);
    //     console.log("resp2", JSON.stringify(resp, null, 4));
    // });
});
