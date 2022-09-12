import {GraphQLSource} from "../index";
import {Sink} from "@dataflow-designer/dataflow-core";
import {assert} from "chai";
import {spy} from "sinon";

describe("GraphQLSource", function() {
    it("is function", function() {
        assert.isFunction(GraphQLSource);
    });

    it("returns query data", async function() {
        this.timeout(10 * 1000);

        const src = new GraphQLSource({
            endpoint: "https://beta.pokeapi.co/graphql/v1beta",
            query: "query {result: pokemon_v2_item{name,cost}}",
            // query: "query getItems{pokemon_v2_pokemonspecies(limit: 10, order_by: {base_happiness: asc}){name,id}}",
            // resultPath: "data.pokemon_v2_item",
        });
        const sinkSpy = spy();
        const sink = new Sink({push: sinkSpy});
        src.channels[0].pipe(sink);
        await src.complete();

        // console.log("sinkSpy.callCount", sinkSpy.callCount);
        assert.strictEqual(sinkSpy.callCount, 1607);
        // console.log("sinkSpy.args[0][0].data", sinkSpy.args[0][0].data);
        assert.deepEqual(sinkSpy.args[0][0].data, {name: "master-ball", cost: 0});
        assert.deepEqual(sinkSpy.args[1606][0].data, {name: "reins-of-unity", cost: 0});
    });

    it("GraphQL pagination");
    it("iterate object key");
    it("JSON parse results into stream");
});
