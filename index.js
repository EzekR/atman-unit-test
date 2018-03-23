const fs = require('fs');
const cuid = require('cuid');
const Mocha = require('mocha');
const mochawesome = require('mochawesome');
const expect = require('chai').expect;
const request = require('request');
const crypto = require('crypto');

function requireNotNull(param) {
    if( typeof(param) === 'undefined' || param === null || param === 'null') {
        return false;
    }
    else {
        return true;
    }
}

function isJson(string) {
    try {
        var obj = JSON.parse(string);
        if (typeof obj == 'object' && obj ) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        return false
    }
}

function jsonParamsToString(json) {
    var str = ''
    for(var item in json) {
        var query = item+'='+json[item]+'&';
        str += query
    }
    return str;
}

function login() {
    return new Promise(function (resolve, reject) {
        request({
            method: 'POST',
            url: 'http://localhost/ucenter/main/login/user',
            form: {
                username: 'stef',
                password: 'admin'
            }
        }, function (err, resp, body) {
            if (err) {
                reject(err);
            }
            resolve(resp);
        })
    })
}

//get verification code
function getVerificationCode() {
    return new Promise(function (resolve, reject) {
        request('http://localhost/ucenter/main/login', function (err, resp, body) {
            if (err) reject(err);
            let sid = resp.headers['set-cookie'][0].split(';')[0].split('=')[1];
            let verify_key = sid+'reg_verifycode';
            let md5 = crypto.createHash('md5');
            let verify_md5 = md5.update(verify_key).digest('hex');
            let verify_code = global.redis.get(verify_md5);
            resolve(verify_code);
        })
    })
}

module.exports = {

    makeTestFile: function (cases_arr, storage_dir) {
        return new Promise(function (resolve) {
            var test_file = cuid();
            var file_ctx =  "const unit_test = require('atman-unit-test');\n"+
                "var cases_array ='"+JSON.stringify(cases_arr)+"';\n"+
                "JSON.parse(cases_array).forEach(function(cases){\n"+
                "unit_test.createTest(cases);\n"+
                "})";
            fs.writeFileSync(storage_dir+test_file+'.test.js', file_ctx);
            resolve(storage_dir+test_file+'.test.js');
        })
    },

    createTest: function (json) {
        describe(json.title, function () {
            var cases = json.cases
            cases.forEach(function (_case) {
                it(_case.case_name, async function () {
                    var req_config;
                    if (_case.method.toLowerCase() === 'get' && _case.params) {
                        req_config = {
                            url: _case.target_url+'?'+jsonParamsToString(_case.params),
                            method: _case.method,
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'User-Agent': 'MochaTest'
                            },
                        }
                    } else {
                        req_config = {
                            url: _case.target_url,
                            method: _case.method,
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'User-Agent': 'MochaTest'
                            }
                        }
                        if (requireNotNull(_case.params)) {
                            req_config['form'] = _case.params
                        }
                    }
                    if (_case.need_login) {
                        var resp = await login();
                        req_config.headers['Cookie'] = resp.headers['set-cookie'];
                    }
                    if (_case.auth) {
                        req_config.headers['Authorization'] = 'Basic dXNlcjoxMjM0';
                    }
                    request(req_config, function (err, resp, body) {
                        if (err) console.log(err);
                        if (_case.expects.resp_type) {
                            if (isJson(body)) {
                                expect(JSON.parse(body)).to.be.a(_case.expects.resp_type);
                                if (_case.expects.error_code != undefined) {
                                    expect(JSON.parse(body).error).to.equal(_case.expects.error_code);
                                }
                            } else {
                                expect(body).to.be.a(_case.expects.resp_type);
                            }
                        }
                        if (_case.expects.statusCode) {
                            expect(resp.statusCode).to.equal(_case.expects.statusCode);
                        }
                        expect('everything is ok').to.be.a('string');
                    })
                })
            });
        })
    },

    runTest: function (file_name, report_name, report_dir, call) {
        Object.keys(require.cache).forEach(function(file) {
            delete require.cache[file];
        } );
        var mocha = new Mocha({
            reporter: 'mochawesome',
            reporterOptions: {
                reportFilename: report_name,
                reportDir: report_dir,
                timeout: 5000
            }
        });
        mocha.addFile(file_name);
        mocha.run().on('end', function () {
            return call('finish');
        })
    }
}