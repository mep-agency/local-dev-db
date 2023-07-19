import fs from 'fs';
import { program } from 'commander';
import { confirm } from '@inquirer/prompts';
import { dockerCommand } from 'docker-cli-js';
import mysql from 'mysql';

import config from './config';

const LDD_ROOT_PATH = `${__dirname}/..`;

interface DockerImagesCommandResult {
  images: {
    repository: string;
    tag: string;
    'image id': string;
    created: string;
    size: string;
  }[];
}

const dockerCompose: typeof dockerCommand = async (command, options) => {
  try {
    return await dockerCommand(
      `compose --file "${LDD_ROOT_PATH}/docker/docker-compose.yml" --project-name "ldd" ${command}`,
      { echo: false, ...(options ?? {}) },
    );
  } catch (e: any) {
    if (e.stderr === undefined) {
      throw e;
    }

    console.error(`ERROR: ${e.stderr}`);
    process.exit(1);
  }
};

const execQuery = (query: string, database: string = 'defaultdb') => {
  return new Promise((resolve) => {
    const connection = mysql.createConnection({
      host: '127.0.0.1',
      port: Number(process.env.LDD_DB_PORT ?? '3306'),
      user: 'root',
      password: process.env.LDD_DB_ROOT_PASSWORD ?? 'not-secure-pwd',
      database,
      multipleStatements: true,
    });

    connection.connect((error) => {
      if (error) {
        if (error.code === 'ECONNREFUSED') {
          console.error(`ERROR: Could't connect to the DB server. Did you forget to start it?`);

          process.exit(1);
        }

        throw error;
      }
    });

    connection.query(query, (error, results) => {
      if (error) {
        console.error(`ERROR: ${error.sqlMessage}`);
        process.exit(1);
      }

      resolve(results);
    });

    connection.end();
  });
};

program.name('ldd').description(config.packageInfo.description).version(config.packageInfo.version);

program
  .command('start')
  .description('Starts your local DB server')
  .action(async () => {
    console.info('Starting local database containers...');

    const requiredImages = [
      `mariadb:${process.env.LDD_DB_IMAGE_TAG ?? 'latest'}`,
      `phpmyadmin:${process.env.LDD_PMA_IMAGE_TAG ?? 'latest'}`,
    ];

    try {
      const availableImagesImages = ((await dockerCommand('images', { echo: false })) as DockerImagesCommandResult).images
        .map((imageData) => `${imageData.repository}:${imageData.tag}`)
        .filter((imageName) => requiredImages.includes(imageName));

      const missingImages = requiredImages.filter((requiredImage) => !availableImagesImages.includes(requiredImage));

      if (missingImages.length > 0) {
        console.info('');
        console.info('The following images will be downloaded as they are required but not available:');
        missingImages.map((image) => console.info(` - ${image}`));
        console.info('');
        console.info('This may take some time, please wait...');
      }
    } catch (e: any) {
      if (e.stderr === undefined) {
        throw e;
      }
  
      console.error(`ERROR: ${e.stderr}`);
      process.exit(1);
    }

    await dockerCompose('up -d');

    console.info('');
    console.info('Done!');
    console.info(`A PhpMyAdmin instance is running on: http://127.0.0.1:${process.env.LDD_PMA_PORT ?? 8010}`);
  });

program
  .command('stop')
  .description('Stops your local DB server')
  .action(async () => {
    console.info('Stopping local database containers...');

    await dockerCompose('down');
  });

program
  .command('destroy')
  .description('Stops all containers (if running) and deletes any related volumes')
  .action(async () => {
    const confirmation = await confirm({
      message: 'This action will delete all of your data and cannot be reverted. Are you sure?',
      default: false,
    });

    if (confirmation !== true) {
      console.info('Aborting...');

      process.exit(0);
    }

    console.info('Destroying local database containers...');

    await dockerCompose('down -v');
  });

program
  .command('create')
  .description('Creates a new database')
  .argument(config.dbName !== undefined ? '[db_name]' : '<db_name>', 'The database name', config.dbName)
  .action(async (databaseName) => {
    const username = databaseName;
    const userPwd = `${databaseName}-pwd`;

    console.info(`Creating a new DB named "${databaseName}"...`);

    await execQuery(
      `START TRANSACTION; CREATE DATABASE \`${databaseName}\`; CREATE USER '${username}'@'%' IDENTIFIED BY '${userPwd}'; GRANT ALL ON \`${databaseName}\`.* TO '${username}'@'%'; FLUSH PRIVILEGES; COMMIT;`,
    );

    console.info(`A new user has been created with full permissions on "${databaseName}".`);
    console.info('');
    console.info(`Username: ${username}`);
    console.info(`Password: ${userPwd}`);
  });

program
  .command('drop')
  .description('Drops the given database and its default user (if they exist)')
  .argument(config.dbName !== undefined ? '[db_name]' : '<db_name>', 'The database name', config.dbName)
  .option('-f,--force', 'Skip safety confirmation', false)
  .action(async (databaseName, options) => {
    const username = databaseName;
    const userPwd = `${databaseName}-pwd`;

    const confirmation =
      options.force === true ||
      (await confirm({
        message: `This action will delete your database "${databaseName}" and cannot be reverted. Are you sure?`,
        default: false,
      }));

    if (confirmation !== true) {
      console.info('Aborting...');

      process.exit(0);
    }

    console.info(`Dropping DB "${databaseName}" and its default user...`);

    await execQuery(`DROP DATABASE IF EXISTS \`${databaseName}\`; DROP USER IF EXISTS \`${databaseName}\`;`);
  });

program
  .command('dump-all')
  .description('Creates a SQL dump file of all databases')
  .action(async () => {
    const now = new Date();
    const month = now.getMonth().toString().padStart(2, '0');
    const date = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const dumpFileName = `db-full-dump_${now.getFullYear()}-${month}-${date}_${hours}-${minutes}-${seconds}.sql`;

    console.info(`Exporting all databases to "${dumpFileName}"...`);

    fs.writeFileSync(
      `./${dumpFileName}`,
      (
        await dockerCompose(
          'exec db sh -c \'exec mariadb-dump --all-databases --lock-tables -uroot -p"$MARIADB_ROOT_PASSWORD"\'',
        )
      ).raw,
    );
  });

program
  .command('dump')
  .description('Creates a SQL dump file of the given database')
  .argument(config.dbName !== undefined ? '[db_name]' : '<db_name>', 'The database name', config.dbName)
  .action(async (databaseName) => {
    const now = new Date();
    const month = now.getMonth().toString().padStart(2, '0');
    const date = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const dumpFileName = `db-${databaseName}-dump_${now.getFullYear()}-${month}-${date}_${hours}-${minutes}-${seconds}.sql`;

    console.info(`Exporting database to "${dumpFileName}"...`);

    fs.writeFileSync(
      `./${dumpFileName}`,
      (
        await dockerCompose(
          `exec db sh -c \'exec mariadb-dump --databases "${databaseName}" --lock-tables -uroot -p"$MARIADB_ROOT_PASSWORD"\'`,
        )
      ).raw,
    );
  });

program
  .command('import')
  .description('Runs all queries from the given SQL file')
  .argument('<sql_file_path>', 'The SQL file to import')
  .option('-f,--force', 'Skip safety confirmation', false)
  .action(async (sqlFilePath, options) => {
    const confirmation =
      options.force === true ||
      (await confirm({
        message: 'This action will execute any SQL statement found in the given file and cannot be reverted. Are you sure?',
        default: false,
      }));

    if (confirmation !== true) {
      console.info('Aborting...');

      process.exit(0);
    }

    console.info(`Importing data from "${sqlFilePath}"...`);

    if (!sqlFilePath.endsWith('.sql') || !fs.existsSync(sqlFilePath) || !fs.statSync(sqlFilePath).isFile()) {
      console.error(`ERROR: Invalid SQL file`);
      process.exit(1);
    }

    execQuery(fs.readFileSync(sqlFilePath).toString());

    console.info('Done. Remember you might have to create dedicated users in order to access new databases.');
  });

program.parse();
