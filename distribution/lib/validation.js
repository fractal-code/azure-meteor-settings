'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = validateSettings;

var _jsonfile = require('jsonfile');

var _jsonfile2 = _interopRequireDefault(_jsonfile);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _lodash = require('lodash.nth');

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require('lodash.dropright');

var _lodash4 = _interopRequireDefault(_lodash3);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function validateSettings(filePath) {
  var settingsFile = void 0;

  _winston2.default.info(`Validating settings file (${filePath})`);

  // Ensure valid json exists
  _winston2.default.debug('check valid json exists');
  try {
    settingsFile = _jsonfile2.default.readFileSync(filePath);
  } catch (error) {
    throw new Error(`Could not read settings file at '${filePath}'`);
  }

  // Define schema
  var siteConfig = _joi2.default.object({
    siteName: _joi2.default.string(),
    resourceGroup: _joi2.default.string(),
    tenantId: _joi2.default.string(),
    subscriptionId: _joi2.default.string(),
    deploymentCreds: _joi2.default.object({ username: _joi2.default.string(), password: _joi2.default.string() }),
    slotName: _joi2.default.string().optional(),
    customServerInitRepo: _joi2.default.string().optional(),
    servicePrincipal: _joi2.default.object({ appId: _joi2.default.string(), secret: _joi2.default.string() }).optional()
  });
  var schema = _joi2.default.object({
    // Accepts config as an object for single-site deploy or array of objects for multi-site
    'azure-meteor-settings': _joi2.default.alternatives([siteConfig, _joi2.default.array().items(siteConfig)
    // Reject duplicated site
    .unique(function (a, b) {
      return a.siteName === b.siteName && a.slotName === b.slotName;
    })])
  }).unknown(true); // allow unknown keys (at the top level) for Meteor settings

  // Ensure settings data follows schema
  _winston2.default.debug('check data follows schema');
  var customDuplicateSiteError = { array: { unique: '!!found duplicated site' } };
  _joi2.default.validate(settingsFile, schema, { presence: 'required', language: customDuplicateSiteError }, function (error) {
    if (error) {
      // Pull error from bottom of stack to get most specific/useful details
      var lastError = (0, _lodash2.default)(error.details, -1);

      // Locate parent of noncompliant field, or otherwise mark as top level
      var pathToParent = 'top level';
      if (lastError.path.length > 1) {
        pathToParent = `"${(0, _lodash4.default)(lastError.path).join('.')}"`;
      }

      // Report user-friendly error with relevant complaint/context to errors
      throw new Error(`Settings file (${filePath}): ${lastError.message} in ${pathToParent}`);
    }
  });

  return settingsFile;
} // Validation methods