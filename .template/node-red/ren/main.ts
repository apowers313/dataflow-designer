import { {{fclass}} } from "@dataflow-designer/dataflow-{{dep}}";
import { nodeFactoryCreator } from "@dataflow-designer/dataflow-nodered";

type NodeDef = NonNullable<Parameters<Parameters<typeof nodeFactoryCreator>[0]>[1]>;
interface NodeOpts extends NodeDef {
}

module.exports = nodeFactoryCreator((node, nodeCfg: NodeOpts | null) => {
    console.log("creating {{nodeName}}", nodeCfg);

    if (!nodeCfg) {
        throw new Error("node configuration not optional for FileSink");
    }

    const ret = new {{ fclass }}({ name: nodeCfg.name });

    return ret;
}, { register: "dataflow-{{nodeName}}" });