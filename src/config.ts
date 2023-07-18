import fs from 'fs';
import path from 'path';

const JSON_CONFIG_FILE_NAME = 'ldd.json';

const DEFAULT_CONFIG: JsonConfiguration = {
  dbName: undefined,
};

interface JsonConfiguration {
  dbName?: string;
}

const findAndReadConfig = () => {
  try {
    let startdir = process.cwd();
    let userConfigData = '{}';

    while (true) {
      var list = fs.readdirSync(startdir);

      if (list.indexOf(JSON_CONFIG_FILE_NAME) != -1) {
        // Found
        console.info(`Loading configuration from: ${path.join(startdir, JSON_CONFIG_FILE_NAME)}`);

        userConfigData = fs.readFileSync(path.join(startdir, JSON_CONFIG_FILE_NAME)).toString();
        break;
      } else if (startdir == '/') {
        // Root dir, file not found
        break;
      } else {
        startdir = path.normalize(path.join(startdir, '..'));
      }
    }

    return {
      ...DEFAULT_CONFIG,
      ...JSON.parse(userConfigData),
    } as JsonConfiguration;
  } catch (e) {
    console.error('ERROR: Failed reading LDD configuration file...');

    process.exit(1);
  }
};

export default findAndReadConfig();
