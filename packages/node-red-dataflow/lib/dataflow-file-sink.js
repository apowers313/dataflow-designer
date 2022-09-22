const {FileSink} = require("dataflow-util");
const {nodeFactoryCreator, dataflowComplete} = require("dataflow-nodered");

module.exports = nodeFactoryCreator((node, nodeCfg) => {
    console.log("creating file sink", nodeCfg);
    const ret = new FileSink({file: nodeCfg.filename});
    // dataflowComplete(node)
    //     .then(() => console.log("flow done"))
    //     .catch((err) => console.log("flow error", err));
    // ret.init()
    //     .then(() => console.log("initialized sink"))
    //     .catch((err) => console.log("error initializing sink", err));
    return ret;
}, {register: "dataflow-file-sink"});
