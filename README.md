# Local Dev DB (ldd)

<span class="badge-lifecycle"><a href="https://github.com/mep-agency#lifecycle-policy" title="Check out our lifecycle stages"><img src="https://img.shields.io/badge/lifecycle-experimental-orange" alt="Project lifecyfle stage" /></a></span>
<span class="badge-license"><a href="https://github.com/mep-agency/local-dev-db" title="View this project on GitHub"><img src="https://img.shields.io/github/license/mep-agency/local-dev-db" alt="Project license" /></a></span>
<span class="badge-npmversion"><a href="https://www.npmjs.com/package/@mep-agency/local-dev-db" title="View this project on NPM"><img src="https://img.shields.io/npm/v/%40mep-agency/local-dev-db" alt="NPM version" /></a></span>
<span class="badge-npmdownloads"><a href="https://www.npmjs.com/package/@mep-agency/local-dev-db" title="View this project on NPM"><img src="https://img.shields.io/npm/dt/%40mep-agency/local-dev-db" alt="NPM downloads" /></a></span>

A zero-config local MySQL instance for local development (using Docker) so you can finally stop doing things like:

- Using different databases for dev and prod environments (e.g. SQLite vs MySQL/MariaDB)
- Installing a local database server directly on your machine
- Spending time getting up and running in a new development environment

## How does it fit into your workflow?

While this tool is designed to be installed as a dependency in your projects, it actually runs as a single database server.
This makes it possible to optimize resources when working on multiple projects at the same time.

Feel free to install this tool as a dependency in any project where you need a MySQL/MariaDB database, CLI commands will act on the same instance and all your databases will share the same storage volume.

## Features

- Runs a fully-featured MySQL server without touching your local system
- Runs a PhpMyAdmin instance attached to the DB server so you can manage your databases with no additional software
- Provides you with a simple set of CLI commands do run common tasks:
  - Create/drop databases and dedicated users
  - Export/import SQL files (single DB or full server)

## Requirements

- **Docker:** this tool uses docker (compose) to spwan some containers for you. A basic default installation is usually more than enough (e.g. `brew install docker` or similar).

## Project lifecycle, contribution and support policy

Our policies are available on our [main oranization page](https://github.com/mep-agency#projects-lifecycle-contribution-and-support-policy).

## Original author

- Marco Lipparini ([liarco](https://github.com/liarco))

## Getting started

Make sure Docker is installed and configured properly, the `docker` CLI must be available for this tool to work properly.

Simply install the package using any package manager:

```bash
# With Yarn
$ yarn add --dev @mep-agency/local-dev-db

# With NPM
$ npm install --save-dev @mep-agency/local-dev-db
```

Run the `ldd` binary to see the available commands:

```bash
# With Yarn
$ yarn ldd --help
Usage: ldd [options] [command]

A zero-config local MySQL instance for local development (using Docker)

Options:
  -V, --version           output the version number
  -h, --help              display help for command

Commands:
# ...

# With NPM
$ npx ldd
Usage: ldd [options] [command]
# ...
```

### Starting a new project

Creating a brand new database for your project is pretty easy:

```bash
$ yarn add --dev @mep-agency/local-dev-db
# ...

$ yarn ldd start
Starting local database containers...

A PhpMyAdmin instance is running on: http://127.0.0.1:8010

$ yarn ldd create my-awesome-app
Creating a new DB named "my-awesome-app"...
A new user has been created with full permissions on "my-awesome-app".

Username: my-awesome-app
Password: my-awesome-app-pwd
```

Our main focus is DX and speed, so don't expect any fancy configuration options or proper security. You can connect to the new database with simple default auth: `mysql://my-awesome-app:my-awesome-app-pwd@127.0.0.1:3306/my-awesome-app`.

You can also connect to http://127.0.0.1:8010 to access a PhpMyAdmin instance attached to your server.

Once done, you can stop your containers from any of your projects:

```bash
# This will stop all containers at once!
$ yarn ldd stop
Stopping local database containers...
```

## Advanced configuration

The goal of LDD is to speed up the process of setting up new projects and synchronizing a common system configuration across multiple environments. That's why we don't plan to support deep customization options.

However, there are some common use cases that require a bit more flexibility, so the following features may help.

### Project config files

Each project usually requires its own database, and you will probably need to run most commands against it, depending on the project you are working on.

The closest available `ldd.json` file is used to load the configuration for the current project:

```json
{
  "dbName": "my-awesome-app"
}
```

With the configuration above, any command will default to `my-awesome-app` as the `<db_name>` argument value if nothing is passed manually:

```bash
$ yarn ldd create
Loading configuration from: /MyProjects/my-awesome-app/ldd.json
Creating a new DB named "my-awesome-app"...

# ...
```

### ENV variables

We hope you never have to use them, but just in case, here are some ENV vars you can set on your machine to customize the behavior of the application:

#### Server behavior

- `LDD_SQL_MODE` (default: `"ANSI,ONLY_FULL_GROUP_BY,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION,NO_ZERO_DATE,NO_ZERO_IN_DATE,STRICT_ALL_TABLES,ALLOW_INVALID_DATES"`): The SQL mode to use for the MySQL server.
- `LDD_SQL_REQUIRE_PRIMARY_KEY` (default: `OFF`): Whether to require primary keys to be defined for each table.
- `LDD_DEFAULT_STORAGE_ENGINE` (default: `InnoDB`): The default storage engine to use for the MySQL server.
- `LDD_EXPLICIT_DEFAULTS_FOR_TIMESTAMP` (default: `ON`): Whether to use explicit defaults for timestamp columns.
- `LDD_MYSQL_NATIVE_PASSWORD` (default: `ON`): Whether to enable the native MySQL password hashing algorithm.

#### Advanced customization

- `LDD_DB_IMAGE_TAG` (default: `lts`): we use the official [MySQL](https://hub.docker.com/_/mysql) Docker image. You can pick a different tag if you wish.
- `LDD_DB_PORT` (default: `3306`): The database server will be attached to this port on your local machine. You can customize this to avoid any conflicts with other services.
- `LDD_DB_ROOT_PASSWORD` (default: `not-secure-pwd`): This tool is not secure by design, so you should probably leave this untouched to avoid issues.
- `LDD_PMA_IMAGE_TAG` (default: `latest`): we use the official [PhpMyAdmin](https://hub.docker.com/_/phpmyadmin) Docker image. You can pick a different tag if you wish.
- `LDD_PMA_PORT` (default: `8010`): The PhpMyAdmin instance will be attached to this port on your local machine. You can customize this to avoid any conflicts with other services.

Changing some of these variables after the initial server creation might break it due to the way storage is persisted in volumes. For instance, if you update the `LDD_DB_ROOT_PASSWORD` then your PhpMyAdmin instance won't be able to connect to your server anymore since the root password is set at creation and won't be updated unless you destroy the server and start from scratch (`yarn ldd destroy && yarn ldd start`).
