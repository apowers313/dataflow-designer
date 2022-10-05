(globalThis as any).RED.nodes.registerType("dataflow-{{nodeName}}", {
    category: "dataflow",
    defaults: {
        name: { value: "" },
        filename: { value: "", required: true },
    },
    inputs: 1,
    outputs: 1,
    color: "{{nodeColor}}", // #4be358
    icon: "{{nodeIcon}}", // db.svg
    paletteLabel: "{{lowerCase paletteName}}",
    label: function () {
        return this.name || "{{lowerCase paletteName}}";
    }
});