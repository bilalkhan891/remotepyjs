/* eslint-disable no-unused-expressions */
/* eslint-disable no-use-before-define */
/* eslint-disable no-sequences */
/* eslint-disable no-undef */
/* eslint-disable eqeqeq */
/* eslint-disable no-new-func */
/* eslint-disable no-throw-literal */
var ARGUMENT_NAMES = /([^\s,]+)/g,
  STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
function getParamNames(e) {
  var i = e.toString().replace(STRIP_COMMENTS, ''),
    n = i.slice(i.indexOf('(') + 1, i.indexOf(')')).match(ARGUMENT_NAMES);
  return null === n && (n = []), n;
}
function JS2PyClient(e, i) {
  (this.serverName = void 0 === e ? 'ws://localhost:8082' : e),
    (this.clientPageId = void 0 === i ? 'Undefined' : i),
    (this.isOpen = !1),
    (this.jsFunctionDict = []),
    (this.pythonCallbackDict = []),
    (this.binaryFunctionQueue = []),
    (this.PythonFunctions = {}),
    (this.socket = null),
    (this.PythonFunctionsHelp = {}),
    (this.pythonMultipleCallbackDict = {}),
    (this.PythonFunctionsArgs = {}),
    (this.JS2Py = {}),
    (this.onopenFunctions = []),
    (this.oncloseFunctions = []),
    (this.subOnClose = fn => this.oncloseFunctions.push(fn)),
    (this.subOnOpen = fn => this.onopenFunctions.push(fn)),
    (this.getServerString = function () {
      return this.serverName + '/' + this.clientPageId;
    }),
    (this.readCallbackArguments = function (e, ...i) {
      for (var n = i.length - 1; n >= 0 && 'function' == typeof i[n]; --n);
      return [e, i.slice(0, n + 1), i.slice(n + 1)];
    }),
    (this.registerMultipleCallbackPythonFunction = function (e, ...i) {
      this.pythonMultipleCallbackDict[e] = i;
    }),
    (this.callMultipleCallbackPythonFunction = function (e, ...i) {
      var n = this.readCallbackArguments(e, ...i);
      (e = n[0]),
        (parameters = n[1][0]),
        (callbacks = n[2]),
        this.isOpen
          ? (this.socket.send(
              JSON.stringify({
                funcName: e,
                args: parameters,
                session_id: this.getSessionId(),
              }),
            ),
            console.log(
              'Function : ' + e + ' called with arguments: ' + JSON.stringify(parameters),
            ))
          : console.log('Connection not open.'),
        callbacks.length > 0 && this.registerMultipleCallbackPythonFunction(e, ...callbacks);
    }),
    (this.registerCallbackToPythonFunction = function (e, i) {
      var n = this.pythonCallbackDict
        .map(function (e) {
          return e.funcName;
        })
        .indexOf(e);
      n < 0
        ? this.pythonCallbackDict.push({ funcName: e, callback: i })
        : (this.pythonCallbackDict[n].callback = i);
    }),
    (this.getSessionId = function () {
      return sessionStorage.getItem('JS2PY_SESSION_ID');
    }),
    (this.registerJSFunctionToBeCalledByPython = function (e, i) {
      this.jsFunctionDict.push({ funcName: e, func: i });
    }),
    (this.callFunc = function (e, i, n) {
      this.isOpen
        ? (this.socket.send(
            JSON.stringify({
              funcName: e,
              args: i,
              session_id: this.getSessionId(),
            }),
          ),
          console.log('Function : ' + e + ' called with arguments: ' + JSON.stringify(i)))
        : console.log('Connection not open.'),
        void 0 === n || this.registerCallbackToPythonFunction(e, n);
    }),
    (this.callPythonFunction = function (e, i, ...n) {
      this.callMultipleCallbackPythonFunction(e, i, ...n);
    }),
    (this.callPythonFunctionBinary = function (e, i, n, t) {
      void 0 === i && (i = {}),
        (i.isBinary = !0),
        this.callFunc(e, i),
        this.isOpen
          ? (this.sendBinary(n), void 0 === t || this.registerCallbackToPythonFunction(e, t))
          : console.log('Connection not open.');
    }),
    (this.sendBinary = function (e) {
      var i = new FileReader();
      (i.onload = function (e) {
        var i = e.target.result;
        this.socket && 1 == this.socket.readyState && this.socket.send(i);
      }),
        i.readAsArrayBuffer(e);
    }),
    (this.sendNonImageBinary = function (e) {
      if (e.type.match(/image.*/)) console.log('The dropped file is an image: ', e.type);
      else {
        var i = new FileReader();
        (i.onload = function (e) {
          var i = e.target.result;
          this.socket && 1 == this.socket.readyState && this.socket.send(i);
        }),
          i.readAsArrayBuffer(e);
      }
    }),
    (this.sendImageBinary = function (e) {
      if (e.type.match(/image.*/)) {
        var i = new FileReader();
        (i.onload = function (e) {
          var i = e.target.result;
          this.socket && 1 == this.socket.readyState && this.socket.send(i);
        }),
          i.readAsArrayBuffer(e);
      } else console.log('The dropped file is not an image: ', e.type);
    }),
    (this.createJSProxyFunctions = function (e) {
      for (var i in this.PythonFunctionsArgs) {
        var n = this.PythonFunctionsArgs[i];
        n.push('...func');
        var t =
          'var paramNames = getParamNames(JS2PySelf.PythonFunctions.' +
          i +
          "); var args = Array.prototype.slice.call(arguments); var inputObject = {}; for(var i in paramNames) { var paramName = paramNames[i]; if(paramName != '...func') { inputObject[paramName] = args[i];} } return JS2PySelf.callMultipleCallbackPythonFunction('" +
          i +
          "', inputObject, ...func);";
        if ((n.push(t), (JS2PySelf = this), i.indexOf('.') >= 0)) {
          for (var r = i.split('.'), o = this.PythonFunctions, s = 0; s < r.length - 1; s++)
            r[s] in o || (o[r[s]] = {}), (o = o[r[s]]);
          o[r[r.length - 1]] = Function.apply(null, n);
        } else this.PythonFunctions[i] = Function.apply(null, n);
      }
    }),
    (this.start = function () {
      void 0 !== this.oninit && this.oninit();
      var e = this.getServerString();
      console.log('Connecting to : ' + e + ' ...'),
        (this.socket = new WebSocket(e)),
        (this.socket.binaryType = 'arraybuffer'),
        (JS2PySelf = this),
        (this.socket.onopen = function () {
          console.log('Connected to Server :' + e),
            JS2PySelf.onopenFunctions.forEach(fun => fun()),
            (JS2PySelf.isOpen = !0),
            void 0 !== JS2PySelf.onopen &&
              (JS2PySelf.callMultipleCallbackPythonFunction(
                'getPythonFunctionLibrary',
                {},
                function (e) {
                  for (var i in ((JS2PySelf.PythonFunctionsArgs = {}), e))
                    e[i].shift(),
                      'session_id' == e[i][0] && e[i].shift(),
                      (JS2PySelf.PythonFunctionsArgs[i] = e[i]);
                  JS2PySelf.createJSProxyFunctions(''), JS2PySelf.onopen();
                },
              ),
              JS2PySelf.callMultipleCallbackPythonFunction(
                'getPythonFunctionLibraryHelp',
                {},
                function (e) {
                  JS2PySelf.PythonFunctionsHelp = e;
                },
              ));
        }),
        (this.socket.onmessage = function (e) {
          if (
            (void 0 !== JS2PySelf.onmessagereceived && JS2PySelf.onmessagereceived(e),
            'string' == typeof e.data)
          ) {
            // console.log("Message received: " + e.data);
            var i = JSON.parse(e.data);
            if ('args' in i) {
              if (
                !(
                  (r = JS2PySelf.jsFunctionDict
                    .map(function (e) {
                      return e.funcName;
                    })
                    .indexOf(i.funcName)) >= 0
                )
              )
                throw 'No function defined for ' + i.funcName;
              var n = JS2PySelf.jsFunctionDict[r];
              'isBinary' in i.args
                ? JS2PySelf.binaryFunctionQueue.push({
                    funcName: i.funcName,
                    callback: n.func,
                    args: i.args,
                  })
                : n.func(i.args);
            } else if ('streaming' in i) {
              if (!(i.funcName in JS2PySelf.pythonMultipleCallbackDict))
                throw 'No function callback defined for ' + i.funcName;
              switch ((t = JS2PySelf.pythonMultipleCallbackDict[i.funcName]).length) {
                case 0:
                  break;
                case 1:
                  'error' in i && t[0](i.error, !1),
                    'return' in i && t[0](i.streaming, i.return, !1);
                  break;
                case 2:
                  'error' in i && t[0](i.error, !1),
                    'return' in i && t[0](i.streaming, i.return, !1),
                    'row' == i.streaming && t[1](i.stream_index, i.stream_item, !1);
                  break;
                case 3:
                  'error' in i && t[0](i.error, !1),
                    'start' == i.streaming && t[0](i.return, !1),
                    'row' == i.streaming && t[1](i.stream_index, i.stream_item, !1),
                    'end' == i.streaming && t[2](i.stream_empty, !1);
                  break;
                case 4:
                  'error' in i && t[4](i.error, !1),
                    'start' == i.streaming && t[0](i.return, !1),
                    'row' == i.streaming && t[1](i.stream_index, i.stream_item, !1),
                    'end' == i.streaming && t[2](i.stream_empty, !1);
                  break;
                default:
                  throw 'Too many callbacks for ' + i.funcName;
              }
            } else if (i.funcName in JS2PySelf.pythonMultipleCallbackDict) {
              var t;
              switch ((t = JS2PySelf.pythonMultipleCallbackDict[i.funcName]).length) {
                case 0:
                  break;
                case 1:
                  'error' in i && t[0](i.error, !1), 'return' in i && t[0](i.return, !1);
                  break;
                case 2:
                  'error' in i && t[1](i.error, !1), 'return' in i && t[0](i.return, !1);
                  break;
                case 3:
                  'error' in i && t[0](i.error, !1), 'return' in i && t[0](i.return, !1);
                  break;
                default:
                  throw 'Too many callbacks for ' + i.funcName;
              }
            } else {
              var r;
              if (
                !(
                  (r = JS2PySelf.pythonCallbackDict
                    .map(function (e) {
                      return e.funcName;
                    })
                    .indexOf(i.funcName)) >= 0
                )
              )
                throw 'No function defined for ' + i.funcName;
              n = JS2PySelf.pythonCallbackDict[r];
              void 0 === i.return
                ? void 0 !== i.error && n.callback(i.error, !1)
                : n.callback(i.return, !0);
            }
          } else {
            for (var o = new Uint8Array(e.data), s = ' ', a = 0; a < o.length; a++)
              s += ('00 ' + o[a].toString(16)).substr(-2);
            var c = e.data,
              f = new Uint8Array(c),
              l = new Blob([f.buffer]);
            if (JS2PySelf.binaryFunctionQueue.length > 0) {
              var h = JS2PySelf.binaryFunctionQueue.shift();
              (h.args.blob = l), h.callback(h.args);
            } else {
              var S = new FileReader();
              (S.onload = function (e) {
                imgFig.src = e.target.result;
              }),
                S.readAsDataURL(l),
                (document.getElementById('StatusBar').innerHTML = 'Chart Loading Completed ...');
            }
            // console.log("message(b) received : " + s);
          }
          void 0 !== JS2PySelf.onmessageprocessed && JS2PySelf.onmessageprocessed();
        }),
        (this.socket.onclose = function (i) {
          console.log('Connection to ' + e + ' closed.'),
            JS2PySelf.oncloseFunctions.forEach(fun => fun()),
            (JS2PySelf.isOpen = !1),
            (JS2PySelf.onopenFunctions = []),
            (socket = null),
            void 0 !== JS2PySelf.onclose && JS2PySelf.onclose();
        });
      return this.socket;
    });
}

const JS2Py = new JS2PyClient();

module.exports = JS2Py;
