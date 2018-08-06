// Validation methods

import jsonfile from 'jsonfile';
import winston from 'winston';
import nth from 'lodash.nth';
import dropRight from 'lodash.dropright';
import Joi from 'joi';

export default function validateSettings(filePath) {
  let settingsFile;

  winston.info(`Validating settings file (${filePath})`);

  // Ensure valid json exists
  winston.debug('check valid json exists');
  try {
    settingsFile = jsonfile.readFileSync(filePath);
  } catch (error) {
    throw new Error(`Could not read settings file at '${filePath}'`);
  }

  // Define schema
  const siteConfig = Joi.object({
    siteName: Joi.string(),
    resourceGroup: Joi.string(),
    tenantId: Joi.string(),
    subscriptionId: Joi.string(),
    deploymentCreds: Joi.object({ username: Joi.string(), password: Joi.string() }),
    slotName: Joi.string().optional(),
    customServerInitRepo: Joi.string().optional(),
    servicePrincipal: Joi.object({ appId: Joi.string(), secret: Joi.string() }).optional(),
  });
  const schema = Joi.object({
    // Accepts config as an object for single-site deploy or array of objects for multi-site
    'azure-meteor-settings': Joi.alternatives([
      siteConfig,
      Joi.array()
        .items(siteConfig)
        // Reject duplicated site
        .unique((a, b) => (a.siteName === b.siteName) && (a.slotName === b.slotName)),
    ]),
  }).unknown(true); // allow unknown keys (at the top level) for Meteor settings

  // Ensure settings data follows schema
  winston.debug('check data follows schema');
  const customDuplicateSiteError = { array: { unique: '!!found duplicated site' } };
  Joi.validate(settingsFile, schema, { presence: 'required', language: customDuplicateSiteError }, (error) => {
    if (error) {
      // Pull error from bottom of stack to get most specific/useful details
      const lastError = nth(error.details, -1);

      // Locate parent of noncompliant field, or otherwise mark as top level
      let pathToParent = 'top level';
      if (lastError.path.length > 1) {
        pathToParent = `"${dropRight(lastError.path).join('.')}"`;
      }

      // Report user-friendly error with relevant complaint/context to errors
      throw new Error(`Settings file (${filePath}): ${lastError.message} in ${pathToParent}`);
    }
  });

  return settingsFile;
}
