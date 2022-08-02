import {Foo} from "../index";
import {assert} from "chai";
// import { spy } from "sinon";

describe("Foo", function() {
    it("is function", function() {
        assert.isFunction(Foo);
    });
});
