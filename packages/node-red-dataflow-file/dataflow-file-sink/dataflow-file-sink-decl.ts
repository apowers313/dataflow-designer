import * as NodeRed from "node-red";

// TODO: any
(globalThis as any).RED.nodes.registerType("dataflow-file-sink", {
    category: "dataflow",
    defaults: {
        name: {value: ""},
        filename: {value: "", required: true},
    },
    inputs: 1,
    outputs: 1,
    color: "#4be358",
    icon: "db.svg",
    paletteLabel: "file sink",
    label: function() {
        return this.name || "file sink";
    },
});
