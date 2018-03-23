const expect = require('chai').expect;
const request = require('request');

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

module.exports = {
    createTest: function (json) {
        describe(json.title, function () {
            var cases = json.cases
            cases.forEach(function (_case) {
                it(_case.case_name, async function () {
                    var req_config;
                    if ((_case.method == 'GET' || _case.method == 'get') && _case.params) {
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
                            },
                        }
                        if (requireNotNull(_case.params)) {
                            req_config['form'] = _case.params
                        }
                    }
                    if (_case.need_login) {
                        var resp = await login();
                        req_config.headers['Cookie'] = resp.headers['set-cookie'];
                    }
                    request(req_config, function (err, resp, body) {
                        if (err) console.log(err);
                        if (isJson(body)) {
                            expect(JSON.parse(body)).to.be.a(_case.expects.resp_type);
                            if (_case.expects.error_code != undefined) {
                                expect(JSON.parse(body).error).to.equal(_case.expects.error_code);
                            }
                        } else {
                            expect(body).to.be.a(_case.expects.resp_type);
                        }
                    })
                })
            });
        })
    },

    jsonCluster: function (array) {
        var clustered = [];
        array.forEach(function (json) {
            var json_cluster = {
                title: json.title,
                sub_title: json.sub_title,
                cases: [{
                    case_name: json.case_name,
                    target_url: json.target_url,
                    method: json.method,
                    params: JSON.parse(json.params),
                    expects: JSON.parse(json.expects)
                }]
            };
            clustered.push(json_cluster);
        })
        for(var i=0; i<clustered.length-1; i++){
            for(var j=i+1; j<clustered.length; j++){
                if (clustered[i].title == clustered[j].title && clustered[i].sub_title == clustered[j].sub_title && clustered[i].title != 'undefined' && typeof(clustered[i].cases) != 'undefined') {
                    clustered[i].cases.push(clustered[j].cases[0]);
                    clustered[j] = 0;
                }
            }
        };
        var result = [];
        for(var i=0; i<clustered.length; i++) {
            if (clustered[i] != 0) {
                result.push(clustered[i]);
            }
        }
        return result;
    }
}
