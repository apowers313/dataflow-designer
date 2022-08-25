import {MockAgent, fetch, getGlobalDispatcher, setGlobalDispatcher} from "undici";
import {Sink} from "dataflow-core";
import {UrlSource} from "../index";
import {assert} from "chai";
import {spy} from "sinon";

// const mockAgent = new MockAgent();
// mockAgent.disableNetConnect();
// setGlobalDispatcher(mockAgent);

// const client = mockAgent.get("https://pokeapi.co");
// client
//     .intercept({
//         path: "/api/v2/version/?limit=39",
//         method: "GET",
//     })
//     .reply(200,
//         {
//             foo: "bar",
//         },
//         {
//             headers: {
//                 "content-type": "application/json",
//             },
//         });

describe("UrlSource", function() {
    // before(function() {
    //     MockAgent.
    // });
    it("is function", function() {
        assert.isFunction(UrlSource);
    });

    it("gets stream", async function() {
        this.timeout(10 * 1000);
        const src = new UrlSource({
            request: "https://pokeapi.co/api/v2/version/?limit=39",
            parserOpts: {
                json: {
                    outputType: "array",
                    path: "results",
                },
            },
        });
        const sinkSpy = spy();
        const sink = new Sink({
            push: sinkSpy,
        });
        src.channels[0].pipe(sink);
        await src.complete();

        // console.log("sinkSpy.args", sinkSpy.args);
        // console.log("sinkSpy.callCount", sinkSpy.callCount);
        assert.strictEqual(sinkSpy.callCount, 39);
    });
});
