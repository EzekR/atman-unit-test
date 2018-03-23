const Mocha = require('mocha');
const mochawesome = require('mochawesome');
const fs = require('fs');

module.exports = {
    generateReport: function (file_name, report_name) {
        return new Promise(function (resolve) {
            Object.keys(require.cache).forEach(function(file) {
                delete require.cache[file];
            } );
            var mocha = new Mocha({
                reporter: 'mochawesome',
                reporterOptions: {
                    reportFilename: report_name,
                    reportDir: global.storage+'/mochawesome-report/'
                }
            });
            mocha.addFile(file_name);
            mocha.run().on('end', function () {
                resolve(console.log('all done'));
            })
        })
    }
}