const fs = require('fs');
const cuid = require('cuid');
module.exports = {
    genTestFile: function (cases_arr, storage_dir) {
        return new Promise(function (resolve) {
            var report_name = cuid();
            var file_ctx =  "const unit_test = require('unit-test');\n"+
                            "var cases_array ='"+JSON.stringify(cases_arr)+"';\n"+
                            "JSON.parse(cases_array).forEach(function(cases){\n"+
                            "unit_test.createTest(cases);\n"+
                            "})";
            fs.writeFileSync(storage_dir+report_name+'.test.js', file_ctx);
            resolve(storage_dir+report_name+'.test.js');
        })
    }
}