// CLI setup

import { forEach as forEachParallel } from 'p-iteration';
import program from 'commander';
import updateNotifier from 'update-notifier';
import winston from 'winston';
import pkg from '../../package.json';
import AzureMethods from './azure';
import { validateSettings } from './validation';

// Notify user of available updates
updateNotifier({ pkg }).notify();

// Configure CLI
program
  .description(pkg.description)
  .version(`v${pkg.version}`, '-v, --version')
  .option('-s, --settings <paths>', 'path to settings file or comma-separated list of paths [settings.json]', 'settings.json')
  .option('-d, --debug', 'enable debug mode')
  .option('-q, --quiet', 'enable quite mode')
  .parse(process.argv);

// Pretty print logs
winston.cli();

// Toggle Quiet mode based on user preference
if (program.quiet === true) {
  winston.level = 'error';
}

// Toggle Debug mode based on user preference
if (program.debug === true) {
  winston.level = 'debug';
}

export default async function startup() {
  try {
    // Validate settings file(s)
    const settingsFilePaths = program.settings.split(',');
    const settingsFiles = settingsFilePaths.map(path => validateSettings(path));

    // Push Meteor settings
    await forEachParallel(settingsFiles, async (settingsFile) => {
      const azureMethods = new AzureMethods(settingsFile);
      await azureMethods.updateMeteorSettings();
    });
  } catch (error) {
    winston.error(error.message);
    process.exit(1);
  }
}
