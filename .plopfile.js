module.exports = function (plop) {
    // controller generator
    plop.setGenerator('create', {
        description: 'package name (dataflow-name)',
        prompts: [{
            type: 'input',
            name: 'name',
            message: 'package name'
        }, {
            type: 'input',
            name: 'desc',
            message: 'package description'
        }],
        actions: [{
            type: 'addMany',
            destination: 'packages/dataflow-{{name}}/',
            templateFiles: '.template/**/*'
        }]
    });
};
