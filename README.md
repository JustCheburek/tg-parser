# Telegram Channel Parser

This project allows you to download messages from public Telegram channels.

## Setup

To set up the project, clone the repository and run the following commands:

```bash
pnpm install
cp ./.env-example ./.env
```

## Prerequisites

- Node.js LTS version
- [`Docker`](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04) with the [`Compose`](https://docs.docker.com/compose/install/linux/) plugin

## Configuration

1. Go to https://my.telegram.org/auth?to=apps and create a developer account. Obtain your `API_ID` and `API_HASH` from there and add them to the `.env` file.
2. Enter a Telegram channel name as the `CHANNEL_USERNAME` in the `.env` file.
3. The `MSG_LIMIT` parameter can be set as high as you wish, but typically the API will not return more than 100 records at a time.
4. It's not recommended to set the `MSG_FETCH_DELAY` lower than 1000 (1 sec) to avoid the risk of having your application blocked (though, you can experiment).

## Starting the Application

> Always start the database before starting the application.

```bash
pnpm db:start
pnpm start:dev
```

## Authorization

Upon starting the application, you'll be prompted to enter your phone number and then the authorization code sent to your Telegram app.

## Shutdown

To shut down the application:

- Use CTRL + C in the terminal.
- Stop the database with `pnpm db:stop`.

## Database

The first time you start the application, MongoDB will run in a Docker container, and its volume will be created in the root directory of the repository. This volume is persistent across application restarts.

To connect to the database from another application, use the following connection string:
`mongodb://root:toor@localhost:27017/myDatabase?authSource=admin&directConnection=true&replicaSet=rs0`

To review the database records, you can use Prisma Studio. Start it by executing `pnpm prisma:studio` from the terminal (run the command from the root directory of the repository).

## FAQ

### How to get channel data by `channelId`

> May not work for some channels

```typescript
const channel = await client.getEntity(`-100${channelId}`)
```

### How to get channel by `channelName`

```typescript
const channels = await client.invoke(
  new Api.channels.GetChannels({
    id: ['channelName'],
  }),
);
```
