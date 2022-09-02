import {Sink} from "dataflow-core";
import {UrlSource} from "../index";
import {assert} from "chai";
import {setMockUrl} from "./helpers/helpers";
import {spy} from "sinon";

describe("UrlSource", function() {
    it("is function", function() {
        assert.isFunction(UrlSource);
    });

    it("gets stream", async function() {
        // this.timeout(10 * 1000);
        setMockUrl("https://pokeapi.co/api/v2/version/?limit=39", "pokemonVersions.json");

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

        // console.log("sinkSpy.args[38][0].data", sinkSpy.args[38][0].data);
        // console.log("sinkSpy.callCount", sinkSpy.callCount);
        assert.strictEqual(sinkSpy.callCount, 39);
        assert.deepEqual(sinkSpy.args[0][0].data, {name: "red", url: "https://pokeapi.co/api/v2/version/1/"});
        assert.deepEqual(sinkSpy.args[38][0].data, {name: "legends-arceus", url: "https://pokeapi.co/api/v2/version/39/"});
    });
});
