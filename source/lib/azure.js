// Azure methods

import AzureSdk from 'azure-arm-website';
import msRest from 'ms-rest-azure';
import omit from 'lodash.omit';
import axios from 'axios';
import jsesc from 'jsesc';
import winston from 'winston';

export default class AzureMethods {
  constructor(settingsFile) {
    this.meteorSettings = omit(settingsFile, 'azure-meteor-settings');

    // Ensure settings for single-site (object) and multi-site (array of objects) are interoperable
    this.sites = settingsFile['azure-meteor-settings'];
    if (!Array.isArray(this.sites)) { this.sites = [this.sites]; }

    // Initialise each site
    this.sites.map((site) => {
      const currentSite = site;

      currentSite.isSlot = (currentSite.slotName !== undefined);

      // Determine unique name, must identify multiple slots from same site
      currentSite.uniqueName = currentSite.siteName;
      if (currentSite.isSlot) { currentSite.uniqueName = `${currentSite.uniqueName}-${currentSite.slotName}`; }

      // Configure Kudu API connection
      winston.debug(`${currentSite.uniqueName}: configure kudu api`);
      currentSite.kuduClient = axios.create({
        baseURL: `https://${currentSite.uniqueName}.scm.azurewebsites.net`,
        auth: currentSite.deploymentCreds,
      });

      return currentSite;
    });
  }

  // Helper for async iteration over sites, returns a single promise (i.e awaitable)
  static async forEachSite(sites, siteMethod) {
    // Execute provided method on each site concurrently
    await Promise.all(sites.map(async (site) => {
      try {
        await siteMethod(site);
      } catch (error) {
        // Attach relevant site context to error
        throw new Error(`${site.uniqueName}: ${error.message}`);
      }
    }));
  }

  async authenticateWithSdk() {
    await AzureMethods.forEachSite(this.sites, async (site) => {
      const currentSite = site;
      const { servicePrincipal, tenantId, subscriptionId } = currentSite;
      let credentials;

      /* Retrieve credential from MS API, uses service principal when available
       or otherwise requests an interactive login */
      if (servicePrincipal !== undefined) {
        const { appId, secret } = servicePrincipal;
        winston.info(`${currentSite.uniqueName}: Authenticating with service principal`);
        credentials = await msRest.loginWithServicePrincipalSecret(appId, secret, tenantId);
      } else {
        winston.info(`${currentSite.uniqueName}: Authenticating with interactive login...`);
        credentials = await msRest.interactiveLogin({ domain: tenantId });
      }

      // Initialise Azure SDK using MS credential
      winston.debug(`${currentSite.uniqueName}: completed Azure authentication`);
      currentSite.azureSdk = new AzureSdk(credentials, subscriptionId).webApps;
    });
  }

  async updateMeteorSettings() {
    const { meteorSettings, sites } = this;

    await AzureMethods.forEachSite(sites, async (site) => {
      let newSettings;

      // Unnest site details for better code readability
      const {
        resourceGroup, siteName, slotName, uniqueName, azureSdk, isSlot,
      } = site;

      winston.info(`${uniqueName}: Updating Azure meteor settings`);

      // Retrieve current settings from Azure to serve as a starting point
      winston.debug(`${uniqueName}: retrieve existing values`);
      if (isSlot) {
        newSettings = await azureSdk.listApplicationSettingsSlot(resourceGroup, siteName, slotName);
      } else {
        newSettings = await azureSdk.listApplicationSettings(resourceGroup, siteName);
      }

      // Set Meteor settings (from settings file)
      winston.debug(`${uniqueName}: set Meteor settings`);
      Object.assign(newSettings.properties, {
        METEOR_SETTINGS: meteorSettings,
        METEOR_SKIP_NPM_REBUILD: 1,
      });

      // Serialise values to ensure consistency/compliance of formating
      winston.debug(`${uniqueName}: serialise values`);
      Object.keys(newSettings.properties).forEach((key) => {
        newSettings.properties[key] = jsesc(newSettings.properties[key], {
          json: true,
          wrap: false,
        });
      });

      // Push new settings to Azure
      winston.debug(`${uniqueName}: push new settings`);
      if (isSlot) {
        await azureSdk.updateApplicationSettingsSlot(
          resourceGroup,
          siteName,
          newSettings,
          slotName,
        );
      } else {
        await azureSdk.updateApplicationSettings(resourceGroup, siteName, newSettings);
      }
    });
  }
}
