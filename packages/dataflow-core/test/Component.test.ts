import {Component} from "../index";
import {assert} from "chai";

class TestComponent extends Component {}

// class FooContext {
//     bar = "blah"
// }

describe("Component", function() {
    it("is Function", function() {
        assert.isFunction(TestComponent);
    });

    it("name", function() {
        const tc = new TestComponent({name: "foo"});
        assert.strictEqual(tc.name, "foo");
    });

    // describe("context", function() {
    //     it("is assignable", function() {
    //         const fc = new FooContext();
    //         const tc = new TestComponent({context: fc});
    //         assert.strictEqual(tc.context, fc);
    //     });
    // });
});
