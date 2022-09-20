const {FileSource} = require("dataflow-util");
const {nodeFactoryCreator} = require("dataflow-nodered");

module.exports = nodeFactoryCreator((_node, nodeCfg) => {
    console.log("creating file source", nodeCfg);
    return new FileSource({file: nodeCfg.filename, parserOpts: {json: {outputType: "array"}}});
}, {register: "dataflow-file-source"});
