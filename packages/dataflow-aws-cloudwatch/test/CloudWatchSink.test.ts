import {CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, DescribeLogStreamsCommand, GetLogEventsCommand, PutLogEventsCommand, ServiceInputTypes, ServiceOutputTypes} from "@aws-sdk/client-cloudwatch-logs";
import {Sink, helpers} from "@dataflow-designer/dataflow-core";
import {accessKeyId, mockSetup, secretAccessKey} from "./helpers/helpers";
import {CloudWatchSink} from "../index";
import {assert} from "chai";
import fs from "node:fs";
import {AwsStub, mockClient} from "aws-sdk-client-mock";
const {objectSource} = helpers;
import path from "node:path";
import {spy, stub} from "sinon";

describe("CloudWatchSink", function() {
    let cwMock: AwsStub<ServiceInputTypes, ServiceOutputTypes>;

    before(function() {
        cwMock = mockSetup();
    });

    beforeEach(function() {
        cwMock.reset();
    });

    it("is function", function() {
        assert.isFunction(CloudWatchSink);
    });

    it("simple write", async function() {
        // const src = new TestSource();
        const src = objectSource([{one: 1}, {two: 2}, {three: 3}]);
        const sink = new CloudWatchSink({
            region: "us-east-1",
            accessKeyId,
            secretAccessKey,
            logGroupName: "test1-group",
            logStreamName: "test1-stream",
        });

        const streamDescJson = fs.readFileSync(path.resolve(__dirname, "helpers/data/describeStreams.json")).toString();
        cwMock.on(DescribeLogStreamsCommand).resolves(JSON.parse(streamDescJson));

        const resultJson = fs.readFileSync(path.resolve(__dirname, "helpers/data/putLogResponse.json")).toString();
        const sinkStub = stub();
        sinkStub.returns(JSON.parse(resultJson));
        cwMock.on(PutLogEventsCommand).callsFake(sinkStub);

        src.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkStub.callCount, 1);
        assert.strictEqual(sinkStub.args[0][0].logGroupName, "test1-group");
        assert.strictEqual(sinkStub.args[0][0].logStreamName, "test1-stream");
        assert.isArray(sinkStub.args[0][0].logEvents);
        assert.strictEqual(sinkStub.args[0][0].logEvents.length, 3);
        assert.deepEqual(sinkStub.args[0][0].logEvents[0].message, "{\"type\":\"data\",\"data\":{\"one\":1}}");
        assert.deepEqual(sinkStub.args[0][0].logEvents[1].message, "{\"type\":\"data\",\"data\":{\"two\":2}}");
        assert.deepEqual(sinkStub.args[0][0].logEvents[2].message, "{\"type\":\"data\",\"data\":{\"three\":3}}");
    });

    it("create group", async function() {
        // const src = new TestSource();
        const src = objectSource([{one: 1}, {two: 2}, {three: 3}]);
        const sink = new CloudWatchSink({
            region: "us-east-1",
            accessKeyId,
            secretAccessKey,
            logGroupName: "test1-group",
            logStreamName: "test1-stream",
            createGroup: true,
            createStream: true,
        });

        const streamDescJson = fs.readFileSync(path.resolve(__dirname, "helpers/data/describeStreams.json")).toString();
        cwMock.on(DescribeLogStreamsCommand).resolves(JSON.parse(streamDescJson));
        const cgRespJson = fs.readFileSync(path.resolve(__dirname, "helpers/data/createGroupResponse.json")).toString();
        cwMock.on(CreateLogGroupCommand).resolves(JSON.parse(cgRespJson));
        const clRespJson = fs.readFileSync(path.resolve(__dirname, "helpers/data/createStreamResponse.json")).toString();
        cwMock.on(CreateLogStreamCommand).resolves(JSON.parse(clRespJson));

        const resultJson = fs.readFileSync(path.resolve(__dirname, "helpers/data/putLogResponse.json")).toString();
        const sinkStub = stub();
        sinkStub.returns(JSON.parse(resultJson));
        cwMock.on(PutLogEventsCommand).callsFake(sinkStub);

        src.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkStub.callCount, 1);
        assert.strictEqual(sinkStub.args[0][0].logGroupName, "test1-group");
        assert.strictEqual(sinkStub.args[0][0].logStreamName, "test1-stream");
        assert.isArray(sinkStub.args[0][0].logEvents);
        assert.strictEqual(sinkStub.args[0][0].logEvents.length, 3);
        assert.deepEqual(sinkStub.args[0][0].logEvents[0].message, "{\"type\":\"data\",\"data\":{\"one\":1}}");
        assert.deepEqual(sinkStub.args[0][0].logEvents[1].message, "{\"type\":\"data\",\"data\":{\"two\":2}}");
        assert.deepEqual(sinkStub.args[0][0].logEvents[2].message, "{\"type\":\"data\",\"data\":{\"three\":3}}");
    });

    it("doesn't fail of creating group exists");

    it("creates stream");

    it("doesn't fail of creating stream exists");
});
