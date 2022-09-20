const { {{fclass}} } = require("dataflow-{{name}}");
const {nodeFactoryCreator, dataflowComplete} = require("dataflow-nodered");

module.exports = nodeFactoryCreator((node, nodeCfg) => {
    console.log("creating {{name}}", nodeCfg);
    const ret = new {{fclass}}({foo: nodeCfg.foo});
    return ret;
}, {register: "dataflow-{{name}}"});
