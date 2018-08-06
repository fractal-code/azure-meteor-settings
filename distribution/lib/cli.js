'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pIteration = require('p-iteration');

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _updateNotifier = require('update-notifier');

var _updateNotifier2 = _interopRequireDefault(_updateNotifier);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _package = require('../../package.json');

var _package2 = _interopRequireDefault(_package);

var _azure = require('./azure');

var _azure2 = _interopRequireDefault(_azure);

var _validation = require('./validation');

var _validation2 = _interopRequireDefault(_validation);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } // CLI setup

// Notify user of available updates
(0, _updateNotifier2.default)({ pkg: _package2.default }).notify();

// Configure CLI
_commander2.default.description(_package2.default.description).version(`v${_package2.default.version}`, '-v, --version').option('-s, --settings <paths>', 'path to settings file or comma-separated list of paths [settings.json]', 'settings.json').option('-d, --debug', 'enable debug mode').option('-q, --quiet', 'enable quite mode').parse(process.argv);

// Pretty print logs
_winston2.default.cli();

// Toggle Quiet mode based on user preference
if (_commander2.default.quiet === true) {
  _winston2.default.level = 'error';
}

// Toggle Debug mode based on user preference
if (_commander2.default.debug === true) {
  _winston2.default.level = 'debug';
}

exports.default = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
    var _this = this;

    var settingsFilePaths, settingsFiles;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;

            // Validate settings file(s)
            settingsFilePaths = _commander2.default.settings.split(',');
            settingsFiles = settingsFilePaths.map(function (path) {
              return (0, _validation2.default)(path);
            });

            // Push Meteor settings

            _context2.next = 5;
            return (0, _pIteration.forEach)(settingsFiles, function () {
              var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(settingsFile) {
                var azureMethods;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        azureMethods = new _azure2.default(settingsFile);
                        _context.next = 3;
                        return azureMethods.updateMeteorSettings();

                      case 3:
                      case 'end':
                        return _context.stop();
                    }
                  }
                }, _callee, _this);
              }));

              return function (_x) {
                return _ref2.apply(this, arguments);
              };
            }());

          case 5:
            _context2.next = 11;
            break;

          case 7:
            _context2.prev = 7;
            _context2.t0 = _context2['catch'](0);

            _winston2.default.error(_context2.t0.message);
            process.exit(1);

          case 11:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 7]]);
  }));

  function startup() {
    return _ref.apply(this, arguments);
  }

  return startup;
}();