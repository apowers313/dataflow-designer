export {nodeFactoryCreator, dataflowComplete} from "./lib/nodeFactoryCreator";
import {getDataflowFromNode, getInputNodes, getInputNodesTypes, getOutputNodes, isRedDataflowNode, isSinkNode, wiresHasId} from "./lib/utils";
export const utils = {getDataflowFromNode, getInputNodes, getInputNodesTypes, getOutputNodes, isRedDataflowNode, isSinkNode, wiresHasId};
export * as testHelpers from "./test/helpers/helpers";
