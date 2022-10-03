/* eslint-disable jsdoc/require-jsdoc */
import {Tree, generateFiles, joinPathFragments, names} from "@nrwl/devkit";
import {InterfaceSchema} from "./schema";

export default async function(tree: Tree, schema: InterfaceSchema): Promise<void> {
    // generate interfaces into app/my-app-name/lib/src/interfaces
    const targetPath = joinPathFragments(__dirname, "packages/");

    // read templates from tools/generators/interface/templates
    const templatePath = joinPathFragments(__dirname, "tools/generators/dataflow/template");

    // generate different name variations for substitutions
    const interfaceNames = names(schema.name);

    const substitutions = {
    // remove __nop__ from file endings
        nop: "",
        // make the different name variants available as substitutions
        ... interfaceNames,
        fclass: schema.fclass,
        desc: schema.desc,
    };

    // generate the files from the templatePath into the targetPath
    generateFiles(tree, templatePath, targetPath, substitutions);

    // await libraryGenerator(tree, {name: schema.name});
    // await formatFiles(tree);
    // return () => {
    //     installPackagesTask(tree);
    // };
}
