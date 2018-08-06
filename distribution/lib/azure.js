'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // Azure methods

var _azureArmWebsite = require('azure-arm-website');

var _azureArmWebsite2 = _interopRequireDefault(_azureArmWebsite);

var _msRestAzure = require('ms-rest-azure');

var _msRestAzure2 = _interopRequireDefault(_msRestAzure);

var _lodash = require('lodash.omit');

var _lodash2 = _interopRequireDefault(_lodash);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _jsesc = require('jsesc');

var _jsesc2 = _interopRequireDefault(_jsesc);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AzureMethods = function () {
  function AzureMethods(settingsFile) {
    _classCallCheck(this, AzureMethods);

    this.meteorSettings = (0, _lodash2.default)(settingsFile, ['azure-meteor-settings',
    // Ensure compatibility with meteor-azure deployments
    'meteor-azure']);

    // Ensure settings for single-site (object) and multi-site (array of objects) are interoperable
    this.sites = settingsFile['azure-meteor-settings'];
    if (!Array.isArray(this.sites)) {
      this.sites = [this.sites];
    }

    // Initialise each site
    this.sites.map(function (site) {
      var currentSite = site;

      currentSite.isSlot = currentSite.slotName !== undefined;

      // Determine unique name, must identify multiple slots from same site
      currentSite.uniqueName = currentSite.siteName;
      if (currentSite.isSlot) {
        currentSite.uniqueName = `${currentSite.uniqueName}-${currentSite.slotName}`;
      }

      // Configure Kudu API connection
      _winston2.default.debug(`${currentSite.uniqueName}: configure kudu api`);
      currentSite.kuduClient = _axios2.default.create({
        baseURL: `https://${currentSite.uniqueName}.scm.azurewebsites.net`,
        auth: currentSite.deploymentCreds
      });

      return currentSite;
    });
  }

  // Helper for async iteration over sites, returns a single promise (i.e awaitable)


  _createClass(AzureMethods, [{
    key: 'authenticateWithSdk',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        var _this = this;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return AzureMethods.forEachSite(this.sites, function () {
                  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(site) {
                    var currentSite, servicePrincipal, tenantId, subscriptionId, credentials, appId, secret;
                    return regeneratorRuntime.wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            currentSite = site;
                            servicePrincipal = currentSite.servicePrincipal, tenantId = currentSite.tenantId, subscriptionId = currentSite.subscriptionId;
                            credentials = void 0;

                            /* Retrieve credential from MS API, uses service principal when available
                             or otherwise requests an interactive login */

                            if (!(servicePrincipal !== undefined)) {
                              _context.next = 11;
                              break;
                            }

                            appId = servicePrincipal.appId, secret = servicePrincipal.secret;

                            _winston2.default.info(`${currentSite.uniqueName}: Authenticating with service principal`);
                            _context.next = 8;
                            return _msRestAzure2.default.loginWithServicePrincipalSecret(appId, secret, tenantId);

                          case 8:
                            credentials = _context.sent;
                            _context.next = 15;
                            break;

                          case 11:
                            _winston2.default.info(`${currentSite.uniqueName}: Authenticating with interactive login...`);
                            _context.next = 14;
                            return _msRestAzure2.default.interactiveLogin({ domain: tenantId });

                          case 14:
                            credentials = _context.sent;

                          case 15:

                            // Initialise Azure SDK using MS credential
                            _winston2.default.debug(`${currentSite.uniqueName}: completed Azure authentication`);
                            currentSite.azureSdk = new _azureArmWebsite2.default(credentials, subscriptionId).webApps;

                          case 17:
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

              case 2:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function authenticateWithSdk() {
        return _ref.apply(this, arguments);
      }

      return authenticateWithSdk;
    }()
  }, {
    key: 'updateMeteorSettings',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4() {
        var _this2 = this;

        var meteorSettings, sites;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                meteorSettings = this.meteorSettings, sites = this.sites;
                _context4.next = 3;
                return AzureMethods.forEachSite(sites, function () {
                  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(site) {
                    var newSettings, resourceGroup, siteName, slotName, uniqueName, azureSdk, isSlot;
                    return regeneratorRuntime.wrap(function _callee3$(_context3) {
                      while (1) {
                        switch (_context3.prev = _context3.next) {
                          case 0:
                            newSettings = void 0;

                            // Unnest site details for better code readability

                            resourceGroup = site.resourceGroup, siteName = site.siteName, slotName = site.slotName, uniqueName = site.uniqueName, azureSdk = site.azureSdk, isSlot = site.isSlot;


                            _winston2.default.info(`${uniqueName}: Updating Azure meteor settings`);

                            // Retrieve current settings from Azure to serve as a starting point
                            _winston2.default.debug(`${uniqueName}: retrieve existing values`);

                            if (!isSlot) {
                              _context3.next = 10;
                              break;
                            }

                            _context3.next = 7;
                            return azureSdk.listApplicationSettingsSlot(resourceGroup, siteName, slotName);

                          case 7:
                            newSettings = _context3.sent;
                            _context3.next = 13;
                            break;

                          case 10:
                            _context3.next = 12;
                            return azureSdk.listApplicationSettings(resourceGroup, siteName);

                          case 12:
                            newSettings = _context3.sent;

                          case 13:

                            // Set Meteor settings (from settings file)
                            _winston2.default.debug(`${uniqueName}: set Meteor settings`);
                            Object.assign(newSettings.properties, {
                              METEOR_SETTINGS: meteorSettings,
                              METEOR_SKIP_NPM_REBUILD: 1
                            });

                            // Serialise values to ensure consistency/compliance of formating
                            _winston2.default.debug(`${uniqueName}: serialise values`);
                            Object.keys(newSettings.properties).forEach(function (key) {
                              newSettings.properties[key] = (0, _jsesc2.default)(newSettings.properties[key], {
                                json: true,
                                wrap: false
                              });
                            });

                            // Push new settings to Azure
                            _winston2.default.debug(`${uniqueName}: push new settings`);

                            if (!isSlot) {
                              _context3.next = 23;
                              break;
                            }

                            _context3.next = 21;
                            return azureSdk.updateApplicationSettingsSlot(resourceGroup, siteName, newSettings, slotName);

                          case 21:
                            _context3.next = 25;
                            break;

                          case 23:
                            _context3.next = 25;
                            return azureSdk.updateApplicationSettings(resourceGroup, siteName, newSettings);

                          case 25:
                          case 'end':
                            return _context3.stop();
                        }
                      }
                    }, _callee3, _this2);
                  }));

                  return function (_x2) {
                    return _ref4.apply(this, arguments);
                  };
                }());

              case 3:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function updateMeteorSettings() {
        return _ref3.apply(this, arguments);
      }

      return updateMeteorSettings;
    }()
  }], [{
    key: 'forEachSite',
    value: function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(sites, siteMethod) {
        var _this3 = this;

        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return Promise.all(sites.map(function () {
                  var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(site) {
                    return regeneratorRuntime.wrap(function _callee5$(_context5) {
                      while (1) {
                        switch (_context5.prev = _context5.next) {
                          case 0:
                            _context5.prev = 0;
                            _context5.next = 3;
                            return siteMethod(site);

                          case 3:
                            _context5.next = 8;
                            break;

                          case 5:
                            _context5.prev = 5;
                            _context5.t0 = _context5['catch'](0);
                            throw new Error(`${site.uniqueName}: ${_context5.t0.message}`);

                          case 8:
                          case 'end':
                            return _context5.stop();
                        }
                      }
                    }, _callee5, _this3, [[0, 5]]);
                  }));

                  return function (_x5) {
                    return _ref6.apply(this, arguments);
                  };
                }()));

              case 2:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function forEachSite(_x3, _x4) {
        return _ref5.apply(this, arguments);
      }

      return forEachSite;
    }()
  }]);

  return AzureMethods;
}();

exports.default = AzureMethods;