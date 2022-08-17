/********************************************************************************
 *
 *  © 2016 Farukh Tamboli. All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains the property of
 * Farukh Tamboli. The intellectual and technical concepts contained herein are
 * proprietary to Farukh Tamboli and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material is strictly
 * forbidden unless prior written permission is obtained from Farukh Tamboli.
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 ********************************************************************************/
var ARGUMENT_NAMES = /([^\s,]+)/g;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
function getParamNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if (result === null) result = [];
  return result;
}

function JS2PyClient(serverName, clientPageId) {
  if (serverName === undefined) this.serverName = 'ws://localhost:8082';
  else this.serverName = serverName;
  if (clientPageId === undefined) this.clientPageId = 'Undefined';
  else this.clientPageId = clientPageId;

  var JS2PySelf;
  var parameters;
  var callbacks;
  var imgFig;

  this.isOpen = false;
  this.jsFunctionDict = [];
  this.pythonCallbackDict = [];
  this.binaryFunctionQueue = [];
  this.PythonFunctions = {};
  this.socket = null;
  this.PythonFunctionsHelp = {};
  this.pythonMultipleCallbackDict = {};
  this.PythonFunctionsArgs = {};
  this.JS2Py = {};

  this.onopenFunctions = [];
  this.oncloseFunctions = [];
  this.onmsgFunctions = [];
  this.subOnClose = fn => this.oncloseFunctions.push(fn);
  this.subOnOpen = fn => this.onopenFunctions.push(fn);
  this.subOnMsg = fn => this.onmsgFunctions.push(fn);

  this.getServerString = function () {
    return this.serverName + '/' + this.clientPageId;
  };

  this.readCallbackArguments = function (function_name, ...args) {
    for (var i = args.length - 1; i >= 0; --i) {
      if (typeof args[i] !== 'function') {
        break;
      }
    }

    var parameters = args.slice(0, i + 1);
    var callbacks = args.slice(i + 1);

    return [function_name, parameters, callbacks];
  };

  this.registerMultipleCallbackPythonFunction = function (function_name, ...callbacks) {
    this.pythonMultipleCallbackDict[function_name] = callbacks;
  };

  this.callMultipleCallbackPythonFunction = function (function_name, ...args) {
    var rets = this.readCallbackArguments(function_name, ...args);
    function_name = rets[0];
    parameters = rets[1][0];
    callbacks = rets[2];

    if (this.isOpen) {
      this.socket.send(
        JSON.stringify({
          funcName: function_name,
          args: parameters,
          session_id: this.getSessionId(),
        }),
      );
      console.log(
        'Function : ' + function_name + ' called with arguments: ' + JSON.stringify(parameters),
      );
    } else {
      console.log('Connection not open.');
    }

    if (callbacks.length > 0) {
      this.registerMultipleCallbackPythonFunction(function_name, ...callbacks);
    }
  };

  this.registerCallbackToPythonFunction = function (funcName, callback) {
    var pos = this.pythonCallbackDict
      .map(function (x) {
        return x.funcName;
      })
      .indexOf(funcName);
    if (pos < 0) {
      this.pythonCallbackDict.push({ funcName: funcName, callback: callback });
    } else {
      this.pythonCallbackDict[pos].callback = callback;
    }
  };

  this.getSessionId = function () {
    return sessionStorage.getItem('JS2PY_SESSION_ID');
  };

  this.registerJSFunctionToBeCalledByPython = function (funcName, func) {
    this.jsFunctionDict.push({ funcName: funcName, func: func });
  };

  this.callFunc = function (funcName, args, callBackFunc) {
    if (this.isOpen) {
      this.socket.send(
        JSON.stringify({ funcName: funcName, args: args, session_id: this.getSessionId() }),
      );
      console.log('Function : ' + funcName + ' called with arguments: ' + JSON.stringify(args));
    } else {
      console.log('Connection not open.');
    }

    if (callBackFunc === undefined) {
    } else {
      this.registerCallbackToPythonFunction(funcName, callBackFunc);
    }
  };

  this.callPythonFunction = function (funcName, args, ...func) {
    this.callMultipleCallbackPythonFunction(funcName, args, ...func);
    //this.callFunc(funcName, args, func);
  };

  this.callPythonFunctionBinary = function (funcName, args, file, callBackFunc) {
    if (args === undefined) {
      args = {};
    }
    args.isBinary = true;
    this.callFunc(funcName, args);
    if (this.isOpen) {
      this.sendBinary(file);
      if (callBackFunc === undefined) {
      } else {
        this.registerCallbackToPythonFunction(funcName, callBackFunc);
      }
    } else {
      console.log('Connection not open.');
    }
  };

  this.sendBinary = function (src) {
    var reader = new FileReader();
    reader.onload = function (e) {
      // Sending ImageData as ArrayBuffer
      var img = e.target.result;
      if (this.socket && this.socket.readyState == 1) this.socket.send(img);
    };
    reader.readAsArrayBuffer(src);
  };

  this.sendNonImageBinary = function (src) {
    //	Prevent any image file type from being read.
    if (src.type.match(/image.*/)) {
      console.log('The dropped file is an image: ', src.type);
      return;
    }
    //	Create our FileReader and run the results through the render function.
    var reader = new FileReader();
    reader.onload = function (e) {
      // Sending ImageData as ArrayBuffer
      var img = e.target.result;
      if (this.socket && this.socket.readyState == 1) this.socket.send(img);
    };
    reader.readAsArrayBuffer(src);
  };

  this.sendImageBinary = function (src) {
    //	Prevent any non-image file type from being read.
    if (!src.type.match(/image.*/)) {
      console.log('The dropped file is not an image: ', src.type);
      return;
    }
    //	Create our FileReader and run the results through the render function.
    var reader = new FileReader();
    reader.onload = function (e) {
      // Sending ImageData as ArrayBuffer
      var img = e.target.result;
      if (this.socket && this.socket.readyState == 1) this.socket.send(img);
    };
    reader.readAsArrayBuffer(src);
  };

  this.createJSProxyFunctions = function (namespace) {
    for (var functionName in this.PythonFunctionsArgs) {
      // this.PythonFunctions
      var args = this.PythonFunctionsArgs[functionName];
      args.push('...func');
      var funcBody =
        'var paramNames = getParamNames(JS2PySelf.PythonFunctions.' +
        functionName +
        "); var args = Array.prototype.slice.call(arguments); var inputObject = {}; for(var i in paramNames) { var paramName = paramNames[i]; if(paramName != '...func') { inputObject[paramName] = args[i];} } return JS2PySelf.callMultipleCallbackPythonFunction('" +
        functionName +
        "', inputObject, ...func);";
      //var funcBody = 'return \'test\';';
      args.push(funcBody);
      JS2PySelf = this;
      // window[functionName] = Function.apply(null, args);
      if (functionName.indexOf('.') >= 0) {
        // if the function has a namespace then it will be resolved as dict properties
        var function_namespace_components = functionName.split('.');
        var namespace_object = this.PythonFunctions;
        for (var i = 0; i < function_namespace_components.length - 1; i++) {
          if (!(function_namespace_components[i] in namespace_object)) {
            namespace_object[function_namespace_components[i]] = {};
          }
          namespace_object = namespace_object[function_namespace_components[i]];
        }

        namespace_object[function_namespace_components[function_namespace_components.length - 1]] =
          Function.apply(null, args);

        /*
                for(var i = function_namespace_components.length - 1; i >= 1; i--) {
                    var dict = {};
                    dict[function_namespace_components[i]] = namespace_object;
                    namespace_object = dict;
                }
                this.PythonFunctions[function_namespace_components[0]] = namespace_object;
                */
        // above: if function name is test.search_markets then
        // function_namespace_component[0] will have test and
        // function_namespace_component[1] will have search_markets
        // so this.PythonFunctions.test.search_markets will correctly resolve to
        // Function.apply(null, args) which is the anonymous function handler
      } else {
        this.PythonFunctions[functionName] = Function.apply(null, args);
      }
      //window[functionName].bind(JS2PySelf);
    }
  };

  /*
    // Closure
    this.JS2PyFunctionMaker = function(function_name, argument_names) {
        JS2PySelf = this;
        return function(...args) {
            JS2PySelf.callMultipleCallbackPythonFunction(function_name, ...args);
        }
    }

    this.createJS2PyProxyFunctions = function(namespace) {
        for(var function_name in this.PythonFunctionsArgs){
            JS2PySelf = this;
            var args = this.PythonFunctionsArgs[function_name];
            this.JS2Py[function_name] = this.JS2PyFunctionMaker(function_name, args);
        }
    }
    */

  this.start = function () {
    if (this.oninit !== undefined) {
      this.oninit();
    }
    var serverConnectionString = this.getServerString();

    console.log('Connecting to : ' + serverConnectionString + ' ...');
    this.socket = new WebSocket(serverConnectionString);
    this.socket.binaryType = 'arraybuffer';
    JS2PySelf = this;

    this.socket.onopen = function () {
      console.log('Connected to Server :' + serverConnectionString);
      JS2PySelf.isOpen = true;
      JS2PySelf.onopenFunctions.forEach(fun => fun());
      if (JS2PySelf.onopen !== undefined) {
        JS2PySelf.callMultipleCallbackPythonFunction(
          'getPythonFunctionLibrary',
          {},
          function (funcDict) {
            JS2PySelf.PythonFunctionsArgs = {};
            for (var key in funcDict) {
              funcDict[key].shift(); // remove the first argument self
              if (funcDict[key][0] == 'session_id') {
                // if the second argument is session_id then remove that as well
                funcDict[key].shift();
              }
              JS2PySelf.PythonFunctionsArgs[key] = funcDict[key]; // remove first argument (self) from the list
            }
            JS2PySelf.createJSProxyFunctions('');
            //JS2PySelf.createJS2PyProxyFunctions('');
            JS2PySelf.onopen();
          },
        );

        JS2PySelf.callMultipleCallbackPythonFunction(
          'getPythonFunctionLibraryHelp',
          {},
          function (funcDict) {
            JS2PySelf.PythonFunctionsHelp = funcDict;
          },
        );
      }
    };

    this.socket.onmessage = function (e) {
      JS2PySelf.onmsgFunctions.forEach(fun => fun());
      if (JS2PySelf.onmessagereceived !== undefined) {
        JS2PySelf.onmessagereceived(e);
      }
      if (typeof e.data == 'string') {
        console.log('Message received: ' + e.data);
        debugger;
        var funcReturn = JSON.parse(e.data);
        if ('args' in funcReturn) {
          var pos = JS2PySelf.jsFunctionDict
            .map(function (x) {
              return x.funcName;
            })
            .indexOf(funcReturn.funcName);
          if (pos >= 0) {
            var funcFound = JS2PySelf.jsFunctionDict[pos];
            if ('isBinary' in funcReturn.args) {
              // if binary call then next message is bringing the blob. so add to queue and get ready to retrieve the blob.
              JS2PySelf.binaryFunctionQueue.push({
                funcName: funcReturn.funcName,
                callback: funcFound.func,
                args: funcReturn.args,
              });
            } else {
              // otherwise just call the callback function with arguments
              funcFound.func(funcReturn.args);
            }
          } else {
            throw 'No function defined for ' + funcReturn.funcName;
          }
        } else {
          if ('streaming' in funcReturn) {
            if (funcReturn.funcName in JS2PySelf.pythonMultipleCallbackDict) {
              var callbacks = JS2PySelf.pythonMultipleCallbackDict[funcReturn.funcName];
              switch (callbacks.length) {
                case 0:
                  break; // do nothing
                case 1:
                  if ('error' in funcReturn) callbacks[0](funcReturn.error, false);
                  if ('return' in funcReturn)
                    callbacks[0](funcReturn.streaming, funcReturn.return, false);
                  break;
                case 2:
                  if ('error' in funcReturn) callbacks[0](funcReturn.error, false);
                  if ('return' in funcReturn)
                    callbacks[0](funcReturn.streaming, funcReturn.return, false);
                  if (funcReturn.streaming == 'row')
                    callbacks[1](funcReturn.stream_index, funcReturn.stream_item, false);
                  break;
                case 3:
                  if ('error' in funcReturn) callbacks[0](funcReturn.error, false);
                  if (funcReturn.streaming == 'start') callbacks[0](funcReturn.return, false);
                  if (funcReturn.streaming == 'row')
                    callbacks[1](funcReturn.stream_index, funcReturn.stream_item, false);
                  if (funcReturn.streaming == 'end') callbacks[2](funcReturn.stream_empty, false);
                  break;
                case 4:
                  if ('error' in funcReturn) callbacks[4](funcReturn.error, false);
                  if (funcReturn.streaming == 'start') callbacks[0](funcReturn.return, false);
                  if (funcReturn.streaming == 'row')
                    callbacks[1](funcReturn.stream_index, funcReturn.stream_item, false);
                  if (funcReturn.streaming == 'end') callbacks[2](funcReturn.stream_empty, false);
                  break;
                default:
                  throw 'Too many callbacks for ' + funcReturn.funcName;
              }
            } else {
              throw 'No function callback defined for ' + funcReturn.funcName;
            }
          } else {
            // todo: old style change later to similar code as streaming, second callback would be error
            //       handler.

            // New Code
            if (funcReturn.funcName in JS2PySelf.pythonMultipleCallbackDict) {
              var callbacks = JS2PySelf.pythonMultipleCallbackDict[funcReturn.funcName];
              switch (callbacks.length) {
                case 0:
                  break; // do nothing
                case 1:
                  if ('error' in funcReturn) callbacks[0](funcReturn.error, false);
                  if ('return' in funcReturn) callbacks[0](funcReturn.return, false);
                  break;
                case 2:
                  if ('error' in funcReturn) callbacks[1](funcReturn.error, false);
                  if ('return' in funcReturn) callbacks[0](funcReturn.return, false);
                  break;
                case 3: // this case is when we have a server function that retuns either a stream or
                  // a normal return. So this case will handle the normal non-streaming return
                  // using the same callbacks of streaming
                  // in future think about passing a flag indicating whether this streaming call.
                  if ('error' in funcReturn) callbacks[0](funcReturn.error, false);
                  if ('return' in funcReturn) callbacks[0](funcReturn.return, false);
                  break;
                default:
                  throw 'Too many callbacks for ' + funcReturn.funcName;
              }
            } else {
              /// OLD Code start here:
              var pos = JS2PySelf.pythonCallbackDict
                .map(function (x) {
                  return x.funcName;
                })
                .indexOf(funcReturn.funcName);
              if (pos >= 0) {
                var funcFound = JS2PySelf.pythonCallbackDict[pos];
                if (funcReturn.return === undefined) {
                  //Since return value is null, we do not call callback.
                  if (funcReturn.error !== undefined) {
                    // call the callback with error or call the error callback
                    funcFound.callback(funcReturn.error, false);
                  }
                } else {
                  funcFound.callback(funcReturn.return, true);
                }
              } else {
                throw 'No function defined for ' + funcReturn.funcName;
              }
            }
          }
        }
      } else {
        var arr = new Uint8Array(e.data);
        var hex = ' ';
        for (var i = 0; i < arr.length; i++) {
          hex += ('00 ' + arr[i].toString(16)).substr(-2);
        }
        var arrayBuffer = e.data;
        var bytes = new Uint8Array(arrayBuffer);
        var blob = new Blob([bytes.buffer]);

        // if previous message had args isBinary true then read the queue to figure out which javascript callback function to call.
        if (JS2PySelf.binaryFunctionQueue.length > 0) {
          var javascriptFuncToCall = JS2PySelf.binaryFunctionQueue.shift();
          javascriptFuncToCall.args['blob'] = blob;
          javascriptFuncToCall.callback(javascriptFuncToCall.args);
        } else {
          var reader = new FileReader();
          reader.onload = function (e) {
            imgFig.src = e.target.result;
          };
          reader.readAsDataURL(blob);
          document.getElementById('StatusBar').innerHTML = 'Chart Loading Completed ...';
        }
        console.log('message(b) received : ' + hex);
      }

      if (JS2PySelf.onmessageprocessed !== undefined) {
        JS2PySelf.onmessageprocessed();
      }
    };

    this.socket.onclose = function (e) {
      console.log('Connection to ' + serverConnectionString + ' closed.');
      JS2PySelf.oncloseFunctions.forEach(fun => fun());
      JS2PySelf.isOpen = false;
      this.socket = null;
      if (JS2PySelf.onclose !== undefined) {
        JS2PySelf.onclose();
      }
    };
    return this.socket;
  };
}

var JS2Py = new JS2PyClient();

// window.onload = function () {
//   JS2Py.serverName = 'ws://calcurithm.com:8082';
//   JS2Py.start();
// };

module.exports = JS2Py;
