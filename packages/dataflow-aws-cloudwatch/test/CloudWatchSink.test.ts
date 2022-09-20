import {CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand, PutLogEventsCommand} from "@aws-sdk/client-cloudwatch-logs";
import {Sink, helpers} from "@dataflow-designer/dataflow-core";
import {accessKeyId, secretAccessKey} from "./helpers/helpers";
import {CloudWatchSink} from "../index";
import {assert} from "chai";
import {spy} from "sinon";
const {TestSource, objectSource} = helpers;

describe("CloudWatchSink", function() {
    it("is function", function() {
        assert.isFunction(CloudWatchSink);
    });

    it("example pipeline", async function() {
        // const src = new TestSource();
        const src = objectSource([{one: 1}, {two: 2}, {three: 3}]);
        const sink = new CloudWatchSink({
            region: "us-west-2",
            accessKeyId,
            secretAccessKey,
            logGroupName: "test1-group",
            logStreamName: "test1-stream",
        });
        src.channels[0].pipe(sink);
        await src.complete();

        // assert.strictEqual(sinkSpy.callCount, 11);
        // assert.deepEqual(sinkSpy.args[0][0].data, {count: 0});
        // assert.deepEqual(sinkSpy.args[10][0].data, {count: 10});
    });

    it("delete me - write logs", async function() {
        const client = new CloudWatchLogsClient({
            region: "us-east-1",
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        // get sequence number
        const descStrCmd = new DescribeLogStreamsCommand({
            logGroupName: "dataflow-test-group",
        });
        const descStrResp = await client.send(descStrCmd);
        console.log("descStrResp", JSON.stringify(descStrResp, null, 4));
        const sequenceToken = descStrResp?.logStreams?.[0]?.uploadSequenceToken;
        console.log("sequenceToken", sequenceToken);

        // send logs
        const cmd = new PutLogEventsCommand({
            logEvents: [{
                timestamp: Date.now(),
                message: JSON.stringify({foo: "bar", number: 1}),
            }, {
                timestamp: Date.now(),
                message: JSON.stringify({foo: "baz", number: 12}),
            }, {
                timestamp: Date.now(),
                message: JSON.stringify({foo: "bat", number: 42}),
            }],
            logStreamName: "dataflow-test-stream",
            logGroupName: "dataflow-test-group",
            sequenceToken,
        });
        const response = await client.send(cmd);
        console.log("response", JSON.stringify(response, null, 4));
    });

    it("delete me - read logs", async function() {
        const client = new CloudWatchLogsClient({
            region: "us-east-1",
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        let cmd = new GetLogEventsCommand({
            logStreamName: "dataflow-test-stream",
            logGroupName: "dataflow-test-group",
            limit: 5,
        });

        let resp = await client.send(cmd);
        console.log("resp1", JSON.stringify(resp, null, 4));

        cmd = new GetLogEventsCommand({
            logStreamName: "dataflow-test-stream",
            logGroupName: "dataflow-test-group",
            limit: 5,
            nextToken: resp.nextBackwardToken,
        });
        resp = await client.send(cmd);
        console.log("resp2", JSON.stringify(resp, null, 4));
    });
});
