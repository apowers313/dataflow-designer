import {FileSink} from "@dataflow-designer/dataflow-file";
import {nodeFactoryCreator} from "@dataflow-designer/dataflow-nodered";

type NodeDef = NonNullable<Parameters<Parameters<typeof nodeFactoryCreator>[0]>[1]>;
interface NodeOpts extends NodeDef {
    filename?: string;
}

module.exports = nodeFactoryCreator((node, nodeCfg: NodeOpts | null) => {
    if (!nodeCfg) {
        throw new Error("node configuration not optional for FileSink");
    }

    if (!nodeCfg.filename) {
        throw new Error("node configuration for FileSink is missing filename");
    }

    const ret = new FileSink({file: nodeCfg.filename});
    // dataflowComplete(node)
    //     .then(() => console.log("flow done"))
    //     .catch((err) => console.log("flow error", err));
    // ret.init()
    //     .then(() => console.log("initialized sink"))
    //     .catch((err) => console.log("error initializing sink", err));
    return ret;
}, {register: "dataflow-file-sink"});
