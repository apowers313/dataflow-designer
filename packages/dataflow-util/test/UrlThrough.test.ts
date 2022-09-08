import {Sink} from "@dataflow-designer/dataflow-core";
import {UrlThrough} from "../index";
import {assert} from "chai";
import {objectSource, setMockUrl} from "./helpers/helpers";
import {spy} from "sinon";

describe("UrlThrough", function() {
    it("is function", function() {
        assert.isFunction(UrlThrough);
    });

    it.only("fetches url based on object properties", async function() {
        this.timeout(10 * 1000);

        setMockUrl("https://pokeapi.co/api/v2/pokedex/1", "pokedex1.json");
        setMockUrl("https://pokeapi.co/api/v2/pokedex/2", "pokedex2.json");
        setMockUrl("https://pokeapi.co/api/v2/pokedex/3", "pokedex3.json");
        const src = objectSource([
            {url: "https://pokeapi.co/api/v2/pokedex/1"},
            {url: "https://pokeapi.co/api/v2/pokedex/2"},
            {url: "https://pokeapi.co/api/v2/pokedex/3"},
        ]);
        const thru = new UrlThrough({parserOpts: {json: {path: "pokemon_entries", outputType: "array"}}});
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(thru);
        thru.channels[0].pipe(sink);
        await src.complete();

        console.log("sinkSpy.callCount", sinkSpy.callCount);
        assert.strictEqual(sinkSpy.callCount, 1297);
        console.log("sinkSpy.args[0][0]", sinkSpy.args[0][0]);
    });

    it("fetches url based on handlebars template");
    it("sets method based on object");
    it("sets methods based on config");
    it("sets headers based on object");
    it("sets headers based on config");
    it("sets query parameters");
    it("sends payload");
    it("includes metadata in object");
    it("does authentication");
    it("can configure properties for url, heaaders, methods, payload");
});
