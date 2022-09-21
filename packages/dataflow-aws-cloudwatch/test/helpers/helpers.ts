/* eslint-disable jsdoc/require-jsdoc */
import {AwsStub, mockClient} from "aws-sdk-client-mock";
import {CloudWatchLogsClient, ServiceInputTypes, ServiceOutputTypes} from "@aws-sdk/client-cloudwatch-logs";

const liveAccess = false;
export let accessKeyId = "FAKEFAKEFAKE";
export let secretAccessKey = "FAKEFAKEFAKE";
export let region = "us-west-2";
if (liveAccess) {
    accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? accessKeyId;
    secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? secretAccessKey;
    region = process.env.AWS_DEFAULT_REGION ?? region;
}

const infiniteIgnore = new Proxy(function() { /* nuthin */ }, {
    get: (): any => infiniteIgnore,
    set: (): boolean => true,
    has: (): boolean => true,
    apply: (): any => infiniteIgnore,
});

type MockType = AwsStub<ServiceInputTypes, ServiceOutputTypes>;
export function mockSetup(): MockType {
    if (liveAccess) {
        return infiniteIgnore as unknown as MockType;
    }

    console.log("Using mocks.");
    return mockClient(CloudWatchLogsClient);
}
