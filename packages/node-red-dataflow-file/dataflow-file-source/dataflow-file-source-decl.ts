(globalThis as any).RED.nodes.registerType("dataflow-file-source", {
    category: "dataflow",
    defaults: {
        name: {value: ""},
        filename: {value: "", required: true},
    },
    // inputs: 1,
    // outputs: 1,
    color: "#4be358",
    icon: "db.svg",
    paletteLabel: "file source",
    label: function() {
        return this.name || "file source";
    },
    button: {
        onclick: () => {
            // console.log(this.name, "button click!");
            // Called when the button is clicked
        },
    },
});
