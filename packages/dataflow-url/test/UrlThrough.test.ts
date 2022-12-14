import {objectSource, setMockUrl} from "./helpers/helpers";
import {Request} from "undici";
import {Sink} from "@dataflow-designer/dataflow-core";
import {UrlThrough} from "../index";
import {assert} from "chai";
import {spy} from "sinon";

describe("UrlThrough", function() {
    it("is function", function() {
        assert.isFunction(UrlThrough);
    });

    it("fetches url based on object properties", async function() {
        this.timeout(10 * 1000);

        setMockUrl("https://pokeapi.co/api/v2/pokedex/1", "pokedex1.json");
        setMockUrl("https://pokeapi.co/api/v2/pokedex/2", "pokedex2.json");
        setMockUrl("https://pokeapi.co/api/v2/pokedex/3", "pokedex3.json");
        const src = objectSource([
            {url: "https://pokeapi.co/api/v2/pokedex/1"},
            {url: "https://pokeapi.co/api/v2/pokedex/2"},
            {url: "https://pokeapi.co/api/v2/pokedex/3"},
        ]);
        const thru = new UrlThrough({
            url: "{{data.url}}",
            parserOpts: {json: {path: "pokemon_entries", outputType: "array"}},
        });
        const sinkSpy = spy();
        const sink = new Sink({
            push: sinkSpy,
            name: "test-sink",
        });
        src.channels[0].pipe(thru);
        thru.channels[0].pipe(sink);
        await src.complete();

        assert.strictEqual(sinkSpy.callCount, 1300);
        assert.strictEqual(sinkSpy.args[0][0].data.entry_number, 1);
        assert.strictEqual(sinkSpy.args[0][0].data.pokemon_species.name, "bulbasaur");
        assert.strictEqual(sinkSpy.args[897][0].data.entry_number, 898);
        assert.strictEqual(sinkSpy.args[897][0].data.pokemon_species.name, "calyrex");
        assert.strictEqual(sinkSpy.args[898][0].data.entry_number, 1);
        assert.strictEqual(sinkSpy.args[898][0].data.pokemon_species.name, "bulbasaur");
        assert.strictEqual(sinkSpy.args[1048][0].data.entry_number, 151);
        assert.strictEqual(sinkSpy.args[1048][0].data.pokemon_species.name, "mew");
        assert.strictEqual(sinkSpy.args[1049][0].data.entry_number, 1);
        assert.strictEqual(sinkSpy.args[1049][0].data.pokemon_species.name, "chikorita");
        assert.strictEqual(sinkSpy.args[1299][0].data.entry_number, 251);
        assert.strictEqual(sinkSpy.args[1299][0].data.pokemon_species.name, "celebi");
    });

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
