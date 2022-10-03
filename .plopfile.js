const path = require("path");
const fs = require("fs");
const ts = require("typescript");

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

    plop.setGenerator("create:nodered:html", {
        prompts: [], // no prompts
        actions: [
            async function customAction(answers) {
                // setup values
                const packageName = path.basename(process.cwd());
                const rootDir = plop.getPlopfilePath();
                const templatePath = path.resolve(rootDir, ".template/node-red-html/template.html");
                const templateStr = fs.readFileSync(templatePath, "utf8");
                const packageDir = path.resolve(rootDir, "packages", packageName);
                const tsconfigPath = path.resolve(packageDir, "tsconfig.json");
                const buildDir = path.resolve(packageDir, "build");

                // get list of components
                const packageJson = path.resolve(packageDir, "package.json");
                const packageJsonContent = require(packageJson);
                const nodeRedDef = packageJsonContent["node-red"]?.nodes ?? {};
                const nodeRedNodes = Object.keys(nodeRedDef);
                // const nodeRedNodes = ["dataflow-file-sink"]

                // build each HTML
                nodeRedNodes.forEach((nodeName) => {
                    const nodePath = path.resolve(packageDir, nodeName);
                    const defaultsFile = path.resolve(nodePath, nodeName + "-decl.ts");
                    const helpFile = path.resolve(nodePath, nodeName + "-help.md");
                    const editorFile = path.resolve(nodePath, nodeName + "-editor.html");
                    // TODO: this could be faster if we did async and Promise.all() for reading files
                    let defaultsStr = fs.readFileSync(defaultsFile, "utf8");
                    const helpStr = fs.readFileSync(helpFile, "utf8");
                    const editorStr = fs.readFileSync(editorFile, "utf8");
                    defaultsStr = ts.transpile(defaultsStr, tsconfigPath);
                    const content = plop.renderString(templateStr, {
                        defaultsJs: defaultsStr,
                        editorHtml: editorStr,
                        helpMarkdown: helpStr
                    });
                    const outputFile = path.resolve(buildDir, nodeName, nodeName + ".html");
                    fs.writeFileSync(outputFile, content);
                });
            }
        ]
    })
};
