#!/usr/bin/env node

// Inspired by: https://blog.xendit.engineer/how-we-repurposed-npm-to-publish-and-distribute-our-go-binaries-for-internal-cli-23981b80911b

const fs = require('fs');

const BIN_BASE_NAME = './bin/@mep-agency/local-dev-db';

if (!fs.existsSync(BIN_BASE_NAME) || !fs.statSync(BIN_BASE_NAME).isDirectory()) {
  console.info('Binaries are not available, this probably means we are in a development environment... skipping!');

  process.exit(0);
}

const ARCH_MAPPING = {
  x64: '',
};

const PLATFORM_MAPPING = {
  darwin: 'macos',
  linux: 'linux',
  win32: 'win.exe',
};

async function install(callback) {
  if (PLATFORM_MAPPING[process.platform] === undefined) {
    callback(`Unsupported platform: "${process.platform}"`);
  }

  if (ARCH_MAPPING[process.arch] === undefined) {
    callback(`Unsupported architecture: "${process.arch}"`);
  }

  const binaryNameTokens = [BIN_BASE_NAME, PLATFORM_MAPPING[process.platform], ARCH_MAPPING[process.arch]].filter(
    (token) => token.length > 0,
  );

  console.info(`Copying the relevant binary for your platform ${process.platform} (${process.arch})`);

  fs.copyFileSync(binaryNameTokens.join('-'), './ldd');

  callback(null);
}

// Parse command line arguments and call the right method
var actions = {
  install: install,
};

const argv = process.argv;

if (argv && argv.length > 2) {
  var cmd = process.argv[2];
  if (!actions[cmd]) {
    console.log('Invalid command.');
    process.exit(1);
  }

  actions[cmd](function (err) {
    if (err) {
      console.error(err);
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
