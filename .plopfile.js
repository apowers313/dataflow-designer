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

    const newNodePrompts = [{
            type: "list",
            name: "type",
            message: "type of component",
            choices: ["Source", "Sink", "Through"],
        }, {
            type: "input",
            name: "nodeName",
            message: "node name",
            default: (answers) => {
                return answers.pkgName + "-" + answers.type.toLowerCase();
            },
        }, {
            type: "input",
            name: "desc",
            message: "package description"
        }, {
            type: "input",
            name: "paletteName",
            message: "node red pallet name (e.g. Thing Source)"
        }, {
            type: "input",
            name: "helptext",
            message: "initial help text"
        }, {
            type: "input",
            name: "fclass",
            message: "factory class"
        }, {
            type: "input",
            name: "nodeColor",
            message: "node color",
            default: "#4be358"
        }, {
            type: "input",
            name: "nodeIcon",
            message: "node icon (https://tinyurl.com/fntasm4)",
            default: "spinner"
        }];

    const newNodeActions = [{
            type: "add",
            path: "packages/node-red-dataflow-{{pkgName}}/dataflow-{{nodeName}}/dataflow-{{nodeName}}.ts",
            templateFile: ".template/node-red/ren/main.ts"
        }, {
            type: "add",
            path: "packages/node-red-dataflow-{{pkgName}}/dataflow-{{nodeName}}/dataflow-{{nodeName}}-editor.html",
            templateFile: ".template/node-red/ren/editor.html"
        }, {
            type: "add",
            path: "packages/node-red-dataflow-{{pkgName}}/dataflow-{{nodeName}}/dataflow-{{nodeName}}-help.md",
            templateFile: ".template/node-red/ren/help.md"
        }, {
            type: "add",
            path: "packages/node-red-dataflow-{{pkgName}}/dataflow-{{nodeName}}/dataflow-{{nodeName}}-decl.ts",
            templateFile: ".template/node-red/ren/decl.ts"
        }]

    plop.setGenerator("create:nodered", {
        description: "Create a new Node-RED package",
        prompts: [{
            type: "input",
            name: "pkgName",
            message: "package name (node-red-dataflow-<name>)"
        }, {
            type: "input",
            name: "dep",
            message: "dependency (import * from dataflow-<name>)",
            default: function(answers) {
                return answers.pkgName;
            },
        },
        ... newNodePrompts
        ],
        actions: [{
            type: "addMany",
            destination: "packages/node-red-dataflow-{{pkgName}}/",
            templateFiles: ".template/node-red/cp/**/*",
            base: ".template/node-red/cp",
            globOptions: {
                dot: true
            }
        },
        ... newNodeActions
        ],
    });

    plop.setGenerator("create:nodered:add", {
        description: "Add a Node-RED node",
        prompts: [{
                type: "list",
                name: "pkgName",
                message: "package",
                choices: function(answers) {
                    process.chdir(plop.getPlopfilePath());
                    return fs.readdirSync("packages")
                        .filter((d) => d.startsWith("node-red-dataflow-"))
                        .map((d) => d.replace("node-red-dataflow-", ""));
                }
            }, 
            // ... newNodePrompts
        ],
        actions: [
            // ... newNodeActions
        ],
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
                const packageJsonPath = path.resolve(packageDir, "package.json");
                const packageJsonContent = require(packageJsonPath);
                const nodeRedDef = packageJsonContent["node-red"]?.nodes ?? {};
                const nodeRedNodes = Object.keys(nodeRedDef);

                // build each HTML
                nodeRedNodes.forEach((nodeName) => {
                    const nodePath = path.resolve(packageDir, nodeName);
                    const declFilePath = path.resolve(nodePath, nodeName + "-decl.ts");
                    const helpFilePath = path.resolve(nodePath, nodeName + "-help.md");
                    const editorFilePath = path.resolve(nodePath, nodeName + "-editor.html");
                    // TODO: this could be faster if we did async and Promise.all() for reading files
                    let declStr = fs.readFileSync(declFilePath, "utf8");
                    const helpStr = fs.readFileSync(helpFilePath, "utf8");
                    const editorStr = fs.readFileSync(editorFilePath, "utf8");
                    declStr = ts.transpile(declStr, tsconfigPath);
                    const content = plop.renderString(templateStr, {
                        defaultsJs: declStr,
                        editorHtml: editorStr,
                        helpMarkdown: helpStr,
                        packageName,
                        rootDir,
                        templatePath,
                        templateStr,
                        packageDir,
                        tsconfigPath,
                        buildDir,
                        packageJsonPath,
                        packageJsonContent,
                        nodeRedDef,
                        nodeRedNodes,
                        nodeName,
                        nodePath,
                        declFilePath,
                        helpFilePath,
                        editorFilePath,
                    });
                    const outputFile = path.resolve(buildDir, nodeName, nodeName + ".html");
                    fs.writeFileSync(outputFile, content);
                });
            }
        ]
    })
};
