# Telegram Channel Parser

Download messages from public Telegram channels.

## Setup

Clone the repository of the project and execute the following commands:

```bash
pnpm install
cp ./.env-example ./.env
```

## Prerequisites

- Node.js LTS
- [`docker`](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04) with [`compose`](https://docs.docker.com/compose/install/linux/) plugin

## Configuration

1. Head over the https://my.telegram.org/auth?to=apps and create a developer account.
Get `API_ID` and `API_HASH` there and copy them to the `./env`.
2. Copy a Telegram channel name to `CHANNEL_USERNAME` of the `./env`.
3. You can configure the `MSG_LIMIT` option as much as you want but usually API will return you not more than 100 records at once
4. Not recommended to set the `MSG_FETCH_DELAY` less than 1000 (1sec) because it may cause your application to be blocked (or not, you can try).

## Start

> Always start the database prior to the application start

```bash
pnpm db:start
pnpm start:dev
```

## Authorization

When the application is started it will prompt you to enter your phone number and then the authorization code (arrived at your Telegram app).

## Shutdown

- CTRL + C
- `pnpm db:stop`

## Database

When you start the application the very first time, the MongoDB will be started in the `docker` container and its volume will be created in the root repository folder. This volume will be persisted between the application restarts.

If you want to connect the database from another application you can use the following connection string: `mongodb://root:toor@localhost:27017/myDatabase?authSource=admin&directConnection=true&replicaSet=rs0`

If you want to review the database records you can use the Prism Studio application. To start it just execute the `pnpm db:studio` from a console (run the command from the root of the repository directory).
