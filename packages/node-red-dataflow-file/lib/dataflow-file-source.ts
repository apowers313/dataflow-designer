import {FileSource} from "@dataflow-designer/dataflow-file";
import {nodeFactoryCreator} from "@dataflow-designer/dataflow-nodered";

type NodeDef = NonNullable<Parameters<Parameters<typeof nodeFactoryCreator>[0]>[1]>;
interface NodeOpts extends NodeDef {
    filename?: string;
}

module.exports = nodeFactoryCreator((_node, nodeCfg: NodeOpts | null) => {
    console.log("creating file source", nodeCfg);
    if (!nodeCfg) {
        throw new Error("node configuration not optional for FileSource");
    }

    if (!nodeCfg.filename) {
        throw new Error("node configuration for FileSink is missing filename");
    }

    return new FileSource({file: nodeCfg.filename, parserOpts: {json: {outputType: "array"}}});
}, {register: "dataflow-file-source"});
