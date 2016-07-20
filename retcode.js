(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function (wpo, failedCallback) {
    var awaits = [],
        apis = ['custom', 'error', 'performance', 'retCode', 'speed', 'log'],
        name, i = 0;

    var awaitFunc = function (apiName) {
        return function () {
            awaits.push({
                type: apiName,
                params: Array.prototype.slice.call(arguments)
            });
        };
    };

    while (name = apis[i++]) {
        wpo[name] = awaitFunc(name);
    }

    wpo.reloaded = function () {
        wpo.ready();
        for (var i = 0, len = awaits.length; i < len; i++) {
            wpo[awaits[i].type].apply(wpo, awaits[i].params);
        }
    };

    wpo.reloadFailed = function () {
        if (typeof failedCallback === 'function') {
            failedCallback();
            // wpo.reloaded();
        }
    };
};
},{}],2:[function(require,module,exports){
module.exports = function (wpo, undef) {
    var startTime, scriptStart;

    if (wpo.startTime) {
        startTime = wpo.startTime;
    }
    else {
        try {
            startTime = window.performance.timing.responseStart;
            scriptStart = new Date();
        }
        catch (e) {
            scriptStart = startTime = new Date() - 0;
        }
    }

    var send = function (params, sampling) {
        sampling = sampling || wpo.config.sample;

        //
        // \u53cc\u5341\u4e00\u5f53\u5929\u7edf\u8ba1\u6570\u636e\u62bd\u6837\u7387\u964d\u4f4e
        //

        // if ((curDate.getUTCDate() == 10 && curDate.getUTCMonth() == 10 && curDate.getUTCHours() >= 16) ||
        //     (curDate.getUTCDate() == 11 && curDate.getUTCMonth() == 10)) {
        //     sampling *= 10;
        // }

        if (wpo.sampling(sampling) == (wpo.config.modVal || 1)) {
            params.sampling = sampling;
            wpo.send(params);
        }
    };

    /**
     * [custom description]
     * @param  {[int/string]} category [0/'time'\uff0c1/'count']
     * @param  {[string]} key      [\u81ea\u5b9a\u4e49\u503c]
     * @param  {[any]} value    [\u81ea\u5b9a\u4e49\u503c\uff0c\u5982\u679ctype\u4e3acount\uff0c\u81ea\u52a8\u5ffd\u7565\u8be5\u503c]
     * @return {[void]}
     */
    wpo.custom = function (category, key, value) {
        var customParam = {
                type: 'custom',
                usernick: wpo.getNick()
            },
            arr = ['time', 'count'];

        category = arr[category] || category;

        if (category == 'time' || category == 'count') {
            customParam['category'] = category;
        }

        if (customParam.type) {
            customParam['key'] = key;
            customParam['value'] = category == 'time' ? value : undef;
            send(customParam);
        }
    };

    /**
     * [error description]
     * @param  {[str]} category [\u53ef\u9009\u53c2\uff0c\u9519\u8bef\u7c7b\u578b\uff0c\u9ed8\u8ba4\u4e3asys]
     * @param  {[str]} msg      [\u81ea\u5b9a\u4e49\u9519\u8bef\u4fe1\u606f]
     * @return {[void]}
     */
    wpo.error = function (category, msg, file, line) {
        var errorParam = {
            type: 'jserror',
            usernick: encodeURIComponent(wpo.getNick())
        };

        if (arguments.length == 1) {
            msg = category;
            category = undefined;
        }

        if (!msg) {
            return ;
        }

        errorParam['category'] = category || 'sys';
        errorParam['msg'] = encodeURIComponent(msg);

        //
        // separate msg file name
        //
        if (file) {
            errorParam['file'] = file;
        }

        if (line) {
            errorParam['line'] = line;
        }

        send(errorParam, 1);
    };

    /**
     * [performance description]
     * @param  {[obj]} params [\u6027\u80fd\u76f8\u5173\u4fe1\u606f]
     * @return {[void]}
     */
    wpo.performance = function (params) {
        var perParam = {
            type: 'per'
        };

        send(wpo.extend(perParam, params));
    };

    /**
     * [retCode description]
     * @param  {[str]} api      [\u6240\u8c03\u7528\u7684api]
     * @param  {[boolean]} issucess [\u662f\u5426\u6210\u529f\uff0c\u4e0d\u6210\u529f\u4f1a100%\u53d1\u9001\uff0c\u6210\u529f\u6309\u7167\u62bd\u6837\u53d1\u9001]
     * @param  {[type]} delay    [\u8c03\u7528\u65f6\u95f4]
     * @param  {[type]} msg      [\u81ea\u5b9a\u4e49\u6d88\u606f]
     * @return {[void]}
     */
    wpo.retCode = function (api, issucess, delay, msg) {
        var retParam = {
            type: 'retcode',
            api: encodeURIComponent(api),
            issucess: issucess,
            usernick: wpo.getNick(),
            delay: typeof delay == 'number' ? parseInt(delay, 10) : (new Date() - startTime),
            msg: encodeURIComponent(msg),
            sampling: this.config.retCode[api]
        };

        if (typeof retParam.delay !== 'undefined') {
            send(retParam, issucess ? retParam.sampling : 1);
        }
    };

    var sendSpeed = function () {
        var perParam = {
            type: 'speed'
        }, val;

        for (var i = 0, len = wpo.speed.points.length; i < len; i++) {
            val = wpo.speed.points[i];
            if (val) {
                perParam['s' + i] = val;
                wpo.speed.points[i] = null;
            }
        }

        send(perParam);
    };

    /**
     * [speed description]
     * @param  {[int/str]} pos          [0/'s0',1/'s1',2/'s2'....10/'s10']
     * @param  {[int]} delay        [\u8017\u65f6\uff0c\u5982\u679c\u6ca1\u6709\u5b9a\u4e49\uff0c\u8fd9\u6309\u7167\u5f53\u524d\u65f6\u95f4\u51cf\u53bb\u9875\u9762\u8d77\u59cb\u65f6\u95f4]
     * @param  {[boolean]} _immediately [\u5185\u90e8\u4f7f\u7528\uff0c\u662f\u5426\u5f3a\u5236\u53d1\u9001\uff0c\u4e0d\u5f3a\u5236\u53d1\u9001\u4f1a\u5c3d\u91cf\u6536\u96c63s\u5185\u7684\u6240\u6709\u70b9\u7684\u6570\u636e\u4e00\u6b21\u6027\u53d1\u9001]
     * @return {[void]}
     */
    wpo.speed = function (pos, delay, _immediately) {
        var sArr;

        if (typeof pos == 'string') {
            pos = parseInt(pos.slice(1), 10);
        }

        if (typeof pos == 'number') {
            sArr = wpo.speed.points || new Array(11);
            sArr[pos] = typeof delay == 'number' ? delay : new Date() - startTime;

            if (sArr[pos] < 0) {
                sArr[pos] = new Date() - scriptStart;
            }

            wpo.speed.points = sArr;
        }

        clearTimeout(wpo.speed.timer);
        if (!_immediately) {
            wpo.speed.timer = setTimeout(sendSpeed, 3000);
        }
        else {
            sendSpeed();
        }
    };

    /**
     * [log \u65e5\u5fd7\u7edf\u8ba1]
     * @param  {[string]} msg      [\u53d1\u9001\u7684\u5185\u5bb9]
     * @param  {[int]} sampling [\u53ef\u4ee5\u81ea\u5b9a\u4e49\u53d1\u9001\u7684\u62bd\u6837]
     * @return {[void]}
     */
    wpo.log = function (msg, sampling) {
        var param = {
            type: 'log',
            msg: encodeURIComponent(msg),
            usernick: encodeURIComponent(wpo.getNick())
        };

        send(param, sampling);
    };
};
},{}],3:[function(require,module,exports){
module.exports = function (wpo, win, isLoaded) {
    var analyzeTiming = function () {
        var datas = {
                "rrt": ["responseStart", "requestStart"], // \u6574\u4e2a\u7f51\u7edc\u8bf7\u6c42\u65f6\u95f4\uff08\u4e0d\u5305\u62ecunload\uff09
                "dns": ["domainLookupEnd", "domainLookupStart"], // dns lookup
                "cnt": ["connectEnd", "connectStart"], // \u5efa\u7acb tcp \u65f6\u95f4
                "ntw": ["responseStart", "fetchStart"], // network time
                "dct": ["domContentLoadedEventStart", "responseStart"], // dom content loaded time
                "flt": ["loadEventStart", "responseStart"] // full load time \u9875\u9762\u5b8c\u5168\u52a0\u8f7d\u65f6\u95f4
                // "flv": this._getFlashVersion(),
            },
            data = {};

        try {
            var timing = performance.timing;

            for (var name in datas) {
                data[name] = timing[datas[name][0]] - timing[datas[name][1]];
            }
        }
        catch(e) {
            // console.log('error');
        }

        return data;
    };

    var send = function () {
        wpo.performance(analyzeTiming());
    };

    if (isLoaded) {
        send();
    }
    else {
        wpo.on(win, 'load', function () {
            send();
        }, true);
    }

    wpo.on(win, 'beforeunload', function () {
        wpo.clear();
        if (wpo.speed.points) {
            wpo.speed(null, null, true);
        }
    }, true);

    var onerror_handdle = win.onerror;
    win.onerror = function(msg, file, line) {
        if (onerror_handdle) {
            onerror_handdle(msg, file, line);
        }

        if (file) {
            wpo.error('sys', msg, file, line);
        }
        else {
            wpo.error(msg);
        }
        // win.JSTracker.send({
        //     msg: msg,
        //     file: file,
        //     line: line
        // });
    };

    if (/wpodebug\=1/.test(location.search)) {
        wpo.config.sample = 1;
        wpo.config.modVal = 1;
        wpo.debug = true;
    }
};
},{}],4:[function(require,module,exports){
var _make_rnd  = function(){
    return (+new Date()) + Math.floor(Math.random() * 1000);
};

var spmId = '';
var getSpmId = function () {
    var meta = document.getElementsByTagName('meta'),
        id = [];

    if (spmId) {
        return spmId;
    }
    //spm\u7b2c\u4e00\u4f4d
    for (var i = 0; i < meta.length; i++) {
        var tag = meta[i];
        if (tag && tag.name && (tag.name == 'data-spm' || tag.name == 'spm-id')) {
            id.push(tag.content);
        }
    }
    //spm\u7b2c\u4e8c\u4f4d
    if (document.body && document.body.getAttribute('data-spm')) {
        id.push(document.body.getAttribute('data-spm'));
    }
    id = id.length ? id.join('.') : 0;
    if (id && id.indexOf('.') == -1) {
        id += '.0';//\u75280\u8865\u5168
    }

    spmId = id;
    return spmId;
};

if (!getSpmId.bind) {
    getSpmId.bind = function () {
        return getSpmId;
    };
}

module.exports = {
    sendRequest: function (src) {
        var win = window;
        var n = 'jsFeImage_' + _make_rnd(),
            img = win[n] = new Image();
        img.onload = img.onerror = function () {
            win[n] = null;
        };
        img.src = src;
        img = null;
    },
    getCookie: function () {
        return document.cookie;
    },
    getSpmId: getSpmId
};
},{}],5:[function(require,module,exports){
module.exports = function (wpo, root, conf) {
    var cookies = {},
        config = {
            imgUrl: '//retcode.taobao.com/r.png?',
            sample: 100,
            modVal: 1,
            // startTime: null, // \u8bbe\u7f6e\u7edf\u8ba1\u8d77\u59cb\u65f6\u95f4
            dynamic: false, // \u662f\u5426\u5f00\u542f\u52a8\u6001\u914d\u7f6e\u529f\u80fd
            retCode: {}
        },
        uid, guid = 0, timer;

    var sendRequest = conf.sendRequest;

    var _send = function () {
        var params, obj;

        while (params = core.dequeue()) {
            obj = core.extend({
                uid: uid,
                spm: config.spmId || core.getSpmId(),
                times: params.times ? params.times : 1,
                _t: ~new Date() + (guid++).toString()
            }, params);

            if (!obj.spm) {
                break;
            }

            if (wpo.debug && window.console) {
                console.log(obj);
            }
            sendRequest(config.imgUrl + core.query.stringify(obj));
        }

        timer = null;
    };

    var _wait = function (_clear) {
        if (_clear && timer) {
            clearTimeout(timer);
            _send();
        }
        if (!timer) {
            timer = setTimeout(_send, 1000);
        }
    };

    var core = {
        ver: '0.1.2',
        _key: 'wpokey',
        getCookie: function (name) {
            var reg,
                matches,
                cookie;

            if (!cookies[name]) {
                reg = new RegExp(name + '=([^;]+)');

                //
                // to make it compatible with nodejs
                //
                try {
                    cookie = conf.getCookie(this);
                }
                catch(e) {

                }

                matches = reg.exec(cookie);
                if (matches) {
                    cookies[name] = matches[1];
                }
            }

            return cookies[name];
        },
        setCookie: function (key, value, expires, domain, path) {
            var str = key + '=' + value;
            if (domain) {
                str += ('; domain=' + domain);
            }
            if (path) {
                str += ('; path=' + path);
            }
            if (expires) {
                str += ('; expires=' + expires);
            }
            document.cookie = str;
        },
        extend: function (target) {
            var args = Array.prototype.slice.call(arguments, 1);

            for (var i = 0, len = args.length, arg; i < len; i++) {
                arg = args[i];
                for (var name in arg) {
                    if (arg.hasOwnProperty(name)) {
                        target[name] = arg[name];
                    }
                }
            }

            return target;
        },
        guid: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        },
        send: function (params) {
            this.queue(params);
            // sendRequest(config.imgUrl + core.query.stringify(obj));
        },
        query: {
            stringify: function (params) {
                var arr = [];
                for (var name in params) {
                    if (params.hasOwnProperty(name) && params[name] !== undefined) {
                        arr.push(name + '=' + params[name]);
                    }
                }

                return arr.join('&');
            },
            parse: function (str) {
                var pairs = str.split('&'),
                    obj = {}, pair;

                for (var i = 0, len = pairs.length; i < len; i++) {
                    pair = pairs[i].split('=');
                    obj[pair[0]] = pair[1];
                }

                return obj;
            }
        },
        getSpmId: function () {
            if (config.spmId) {
                return config.spmId;
            }
            else if (typeof conf.getSpmId === 'function') {
                return conf.getSpmId.call(this);
            }
            return 0;
        },
        on: function (el, type, func, isRemoving) {
            if (el.addEventListener) {
                el.addEventListener(type,
                    isRemoving ? function () {
                        el.removeEventListener(type, func, false);
                        func();
                    } : func,
                    false);
            }
            else if (el.attachEvent) {
                el.attachEvent('on' + type, function () {
                    if (isRemoving) {
                        el.detachEvent('on' + type, arguments.callee);
                    }
                    func();
                });
            }
        },
        getNick: function () {
            var result
            try {
                return TB.Global.util.getNick();
            }
            catch(e) {
                result = this.getCookie('_nk_') || this.getCookie('_w_tb_nick') || this.getCookie('lgc');

                return decodeURIComponent(result);
            }
        },
        setConfig: function (conf) {
            return core.extend(config, conf);
        },
        dynamicConfig: function (obj) {
            var config = this.stringifyData(obj);

            try {
                localStorage.setItem(this._key, config);
            }
            catch (e) {
                this.setCookie(this._key, config, new Date(obj.expTime));
            }
            this.ready();
        },
        parseData: function (str) {
            var pairs = str.split('&'),
                pair, obj = {};

            for (var i = 0, len = pairs.length; i < len; i++) {
                pair = pairs[i].split('=');
                obj[pair[0]] = pair[1];
            }

            return obj;
        },
        stringifyData: function (obj) {
            var params = [];

            for (var name in obj) {
                if (obj.hasOwnProperty(name)) {
                    params.push(name + '=' + obj[name]);
                }
            }

            if (params.length) {
                return params.join('&');
            }
            return '';
        },
        ready: function (_immediately) {
            this._ready = true;
            this._immediately = _immediately;
            _wait();
        },
        queue: function (obj) {
            var queue = this.requestQueue, compare;
            if (obj.type === 'jserror') {
                if (queue.length) {
                    compare = queue[queue.length - 1];
                    if (obj.msg === compare.msg) {
                        compare.times++;
                        return ;
                    }
                }
                if (!obj.times) {
                    obj.times = 1;
                }
            }
            queue.push(obj);

            if (this._ready) {
                //
                // for nodejs
                //
                if (this._immediately) {
                    _send();
                }
                else {
                    _wait();
                }
            }
        },
        dequeue: function () {
            return this.requestQueue.shift();
        },
        clear: function () {
            _wait(true);
        },
        //
        // dynamically updates itself without queue
        //
        requestQueue: wpo.requestQueue || []
    };

    // core.getSpmId = conf.getSpmId.bind(core);

    uid = core.guid();
    wpo.uid = uid;
    core.config = core.setConfig(wpo.config);
    core.extend(wpo, core);
    root.__WPO = wpo;

    return wpo;

};
},{}],6:[function(require,module,exports){
(function () {
    var wpo = this.__WPO || {},
        status = 2,
        win = this, isLoaded = false;

    require('./core')(wpo, win, require('./conf-browser'));

    var exec = function () {
        require('./sampling')(wpo);
        require('./apis')(wpo);
        require('./browser-performance')(wpo, win, isLoaded);
    };

    if (wpo.config.dynamic) {
        //
        // \u81ea\u66f4\u65b0log.js
        //
        if (!(status = require('./server-config')(wpo))) {
            require('./api-await')(wpo, function () {
                exec();
                if (wpo.reloaded) {
                    wpo.reloaded();
                }
            });
            return ;
        }
    }

    if (status == 2) {
        wpo.on(win, 'load', function () {
            wpo.ready();
        }, true);
    }
    else {
        wpo.on(win, 'load', function () {
            isLoaded = true;
        });
    }

    exec();
})();
},{"./api-await":1,"./apis":2,"./browser-performance":3,"./conf-browser":4,"./core":5,"./sampling":7,"./server-config":8}],7:[function(require,module,exports){
//
// \u4fee\u6539\u62bd\u6837\u7b97\u6cd5\uff0c\u4ee5\u524d\u4ee5uid\u4f5c\u4e3a\u62bd\u6837\u7684key\uff0c\u5728\u5927\u4e8e100\u62bd\u6837\u7387\u4e0b\u4f1a\u5448\u73b0\u6b63\u6001\u5206\u5e03
// \u6539\u7528random\u53ef\u4ee5\u89c4\u907f\u8fd9\u4e2a\u95ee\u9898
//

// (function (n) {
//     var guid = function () {
//         return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
//             var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r&0x3|0x8);
//             return v.toString(16);
//         });
//     };

//     var parseGuid = function (uid) {
//         var num = 0;
//         for (var i = 0, len = uid.length; i < len; i++) {
//             num += uid.charCodeAt(i);
//         }
//         return num;
//     };

//     var arr = [];

//     for (var i = 0, n = n || 1000000; i++ < n;) {
//         // arr.push(parseGuid(guid()) % 100);
//         arr.push(Math.floor(Math.random() * 100));
//     }

//     var map = {};
//     arr.forEach(function (num) {
//         if (!map[num]) {
//             map[num] = 0;
//         }
//         map[num]++;
//     });
//     console.log(map);

// })();

module.exports = function (wpo) {
    var map = {};
    wpo.sampling = function (mod) {
        var uid = wpo.uid,
            num = 0;

        if (mod == 1) {
            return 1; // 100%
        }
        else if (typeof map[mod] == 'number') {
            return map[mod];
        }

        //
        // \u62bd\u6837\u7b97\u6cd5\u6539\u4e3aMath.random
        //

        map[mod] = Math.floor(Math.random() * mod);
        return map[mod];
    };
};
},{}],8:[function(require,module,exports){
/*
 *
 * return
 * 0 -> need to load new version log
 * 1 -> need to load config
 * 2 -> latest version of config as well as log
 *
 */
module.exports = function (wpo) {
    var key = wpo._key,
        str, config, tag, url;

    var compareVer;

    var loadScript = function (url) {
        var scriptTag = document.createElement('script');

        scriptTag.src = url;
        document.getElementsByTagName('script')[0].parentNode.appendChild(scriptTag);
        return scriptTag;
    };

    var loadConfig = function () {
        var url = '//retcode.alicdn.com/retcode/pro/config/' + wpo.getSpmId() + '.js',
            tag = loadScript(url);

        tag.onerror = function () {
            tag.onerror = null;
            wpo.error('sys', 'dynamic config error', url, 0);
            wpo.ready();
        };
    };

    //
    // key has been overriden
    //
    if (!key) {
        return 2;
    }

    try {
        str = localStorage.getItem(key);
    }
    catch (e) {
        str = wpo.getCookie(key);
    }

    if (!str) {
        loadConfig();
        return 1;
    }
    else {
        config = wpo.parseData(str);

        //
        // current ver is behind dynamic ver
        //
        selfUpdate = function () {
            var versions = wpo.ver && wpo.ver.split('.'),
                compareVersions = config.ver && config.ver.split('.');

            //
            // force not updating
            //
            if (!versions || !compareVersions) {
                return false;
            }

            for (var i = 0, len = versions.length; i < len; i++) {
                if (compareVersions[i]) {
                    if (parseInt(versions[i], 10) < parseInt(compareVersions[i], 10)) {
                        return true;
                    }
                }
            }

            return false;
        };
        //
        // \u52a8\u6001\u66f4\u65b0\u811a\u672c\u81ea\u5df1
        //
        if (selfUpdate()) {
            url = '//g.alicdn.com/cm/retlog/' + config.ver + '/log.js';
            tag = loadScript(url);
            tag.onload = function () {
                tag.onload = null;
                wpo.reloaded();
            };
            tag.onerror = function () {
                tag.onerror = null;
                wpo.error('sys', 'self update error', url, 0);
                wpo.reloadFailed();
            };
            return 0;
        }
        //
        // \u4ecelocalstorage\u91cc\u8bfb\u53d6\u6570\u636e
        //
        else if (parseInt(config.exp, 10) < (new Date()).getTime()) {
            loadConfig();
            return 1;
        }

        wpo.setConfig({
            sample: parseInt(config.sample, 10)
        });
    }

    return 2;
};
},{}]},{},[6])
