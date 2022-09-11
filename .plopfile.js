module.exports = function (plop) {
    // controller generator
    plop.setGenerator("create", {
        description: "package name (dataflow-name)",
        prompts: [{
            type: "input",
            name: "name",
            message: "package name"
        }, {
            type: "input",
            name: "desc",
            message: "package description"
        }, {
            type: "input",
            name: "fclass",
            message: "first class"
        }],
        actions: [{
            type: "addMany",
            destination: "packages/dataflow-{{name}}/",
            templateFiles: ".template/**/[!_]*",
            // skip: (...args) => {
            //     console.log("SKIP", args);
            //     return false
            // }
            // transform: (...args) => {
            //     console.log("TRANSFORM", args);
            // }
        }, {
            type: "add",
            path: "packages/dataflow-{{name}}/lib/{{fclass}}.ts",
            templateFile: ".template/lib/_.ts"
        }, {
            type: "add",
            path: "packages/dataflow-{{name}}/test/{{fclass}}.test.ts",
            templateFile: ".template/test/_.test.ts"
        }]
    });
};
