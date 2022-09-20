const liveAccess = false;
export let accessKeyId = "FAKEFAKEFAKE";
export let secretAccessKey = "FAKEFAKEFAKE";
export let region = "us-west-2";
if (liveAccess) {
    accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? accessKeyId;
    secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? secretAccessKey;
    region = process.env.AWS_DEFAULT_REGION ?? region;
}
