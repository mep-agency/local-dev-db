import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const JSON_CONFIG_FILE_NAME = 'ldd.json';
const PACKAGE_JSON_PATH = fileURLToPath(new URL('../package.json', import.meta.url));

const DEFAULT_CONFIG: Partial<JsonConfiguration> = {
  dbName: undefined,
};

interface JsonConfiguration {
  dbName?: string;
  packageInfo: {
    name: string;
    description: string;
    version: string;
  };
}

const findAndReadConfig = () => {
  let userConfig = {};

  try {
    let startdir = process.cwd();

    while (true) {
      var list = fs.readdirSync(startdir);

      if (list.indexOf(JSON_CONFIG_FILE_NAME) != -1) {
        // Found
        console.info(`Loading configuration from: ${path.join(startdir, JSON_CONFIG_FILE_NAME)}`);

        userConfig = JSON.parse(fs.readFileSync(path.join(startdir, JSON_CONFIG_FILE_NAME)).toString());
        break;
      } else if (startdir == '/') {
        // Root dir, file not found
        break;
      } else {
        startdir = path.normalize(path.join(startdir, '..'));
      }
    }
  } catch (e) {
    console.error('ERROR: Failed loading LDD configuration file...');

    process.exit(1);
  }

  try {
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      packageInfo: JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH).toString()),
    } as JsonConfiguration;
  } catch (e) {
    console.error('ERROR: Failed loading LDD package.json...');

    process.exit(1);
  }
};

export default findAndReadConfig();
