import {FileSource} from "../index";
import {Sink} from "dataflow-core";
import {assert} from "chai";
import path from "node:path";
import {spy} from "sinon";

describe("FileSource", function() {
    it("is function", function() {
        assert.isFunction(FileSource);
    });

    it("reads data", async function() {
        const src = new FileSource({
            file: path.resolve(__dirname, "helpers/data/pokemonVersions.json"),
            parserOpts: {
                json: {
                    outputType: "array",
                    path: "results",
                },
            }});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 39);
        assert.deepEqual(sinkSpy.args[0][0].data, {name: "red", url: "https://pokeapi.co/api/v2/version/1/"});
        assert.deepEqual(sinkSpy.args[38][0].data, {name: "legends-arceus", url: "https://pokeapi.co/api/v2/version/39/"});
    });
});
