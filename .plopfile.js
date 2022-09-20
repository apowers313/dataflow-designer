module.exports = function (plop) {
    // controller generator
    plop.setGenerator("create:dataflow", {
        description: "Create a new dataflow package",
        prompts: [{
            type: "input",
            name: "name",
            message: "package name (dataflow-<name>)"
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
            templateFiles: ".template/dataflow/cp/**/*",
            base: ".template/dataflow/cp"
        }, {
            type: "add",
            path: "packages/dataflow-{{name}}/lib/{{fclass}}.ts",
            templateFile: ".template/dataflow/ren/main.ts"
        }, {
            type: "add",
            path: "packages/dataflow-{{name}}/test/{{fclass}}.test.ts",
            templateFile: ".template/dataflow/ren/main.test.ts"
        }]
    });

    plop.setGenerator("create:nodered", {
        description: "Create a new Node-RED package",
        prompts: [{
            type: "input",
            name: "name",
            message: "package name (node-red-dataflow-<name>)"
        }, {
            type: "input",
            name: "desc",
            message: "package description"
        }, {
            type: "input",
            name: "palette-name",
            message: "node red pallet name (e.g. Thing Source)"
        }, {
            type: "input",
            name: "helptext",
            message: "initial help text"
        }, {
            type: "input",
            name: "fclass",
            message: "factory class"
        }],
        actions: [{
            type: "addMany",
            destination: "packages/node-red-dataflow-{{name}}/",
            templateFiles: ".template/node-red/cp/**/*",
            base: ".template/node-red/cp"
        }, {
            type: "add",
            path: "packages/node-red-dataflow-{{name}}/lib/dataflow-{{name}}.js",
            templateFile: ".template/node-red/ren/main.js"
        }, {
            type: "add",
            path: "packages/node-red-dataflow-{{name}}/lib/dataflow-{{name}}.html",
            templateFile: ".template/node-red/ren/main.html"
        }],
    });
};
