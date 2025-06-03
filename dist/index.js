import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import 'dotenv/config';
import { Api } from 'telegram/tl/index.js';

var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var app, PORT, MESSAGES_FILE2;
var init_api = __esm({
  "src/api/index.ts"() {
    app = express();
    PORT = process.env.PORT || 3e3;
    MESSAGES_FILE2 = path.resolve(process.cwd(), "output", "messages.json");
    app.get("/messages", (req, res) => {
      if (!fs.existsSync(MESSAGES_FILE2)) {
        return res.status(404).json({ error: "messages.json not found" });
      }
      const data = fs.readFileSync(MESSAGES_FILE2, "utf8");
      try {
        const messages = JSON.parse(data);
        res.json(messages);
      } catch (e) {
        res.status(500).json({ error: "Invalid JSON" });
      }
    });
    app.listen(PORT, () => {
      console.log(`API \u0441\u0435\u0440\u0432\u0435\u0440 \u0437\u0430\u043F\u0443\u0449\u0435\u043D \u043D\u0430 http://localhost:${PORT}`);
    });
  }
});

// src/utils/env.ts
var getEnvironmentVariables = () => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env;
  } else if (typeof process !== "undefined" && process.env) {
    return process.env;
  } else {
    return {};
  }
};
var getEnvVar = (name, type = "string", required = true, transform) => {
  const envVars = getEnvironmentVariables();
  const rawValue = envVars[name];
  const transformFn = ((value) => value);
  if (rawValue === void 0) {
    if (required) {
      throw new Error(`Environment variable ${name} is required but not set.`);
    } else {
      return transformFn(void 0);
    }
  }
  switch (type) {
    case "string[]":
      return transformFn(
        rawValue.split(",").map((item) => item.trim())
      );
    case "number":
      const numberValue = Number(rawValue);
      if (isNaN(numberValue)) {
        throw new Error(`Environment variable ${name} is not a valid number.`);
      }
      return transformFn(numberValue);
    case "address":
    case "hex":
      return transformFn(rawValue);
    case "boolean":
      return transformFn(
        rawValue.toLowerCase() === "true"
      );
    default:
      return transformFn(rawValue);
  }
};

// src/config.ts
var apiId = getEnvVar("API_ID", "number");
var apiHash = getEnvVar("API_HASH", "string");
var fetchDelay = getEnvVar("MSG_FETCH_DELAY", "number");
var channelUsername = getEnvVar("CHANNEL_USERNAME", "string");
getEnvVar("PHONE_NUMBER", "string", false);
getEnvVar("TWO_FACTOR_PASSWORD", "string", false);
var savedSession = getEnvVar("SAVED_SESSION", "string", false);

// src/utils/common.ts
var delay = (ms) => new Promise((resolve3) => setTimeout(resolve3, ms));
var MESSAGES_FILE = path.resolve(process.cwd(), "output", "messages.json");
var PHOTOS_DIR = path.resolve(process.cwd(), "output", "photos");
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}
function extractHeading(text) {
  if (!text) return null;
  const firstLine = text.split(/\n|\r/)[0];
  return firstLine.trim() || null;
}
function extractTags(text) {
  if (!text) return [];
  const lines = text.trim().split(/\r?\n/);
  const lastLine = lines[lines.length - 1];
  return (lastLine.match(/#([^\s#]+)/g) || []).map((tag) => tag.slice(1));
}
function extractBodyText(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  if (lines.length <= 2) return null;
  const body = lines.slice(1, -1).join("\n").trim();
  return body === "" ? null : body;
}
var messageToJsonObject = (message, photoPath) => {
  const date = message.date;
  const msgId = message.id;
  const msgText = message.message ?? null;
  let mediaType = "\u041D\u0435\u0442";
  if (message.media) {
    mediaType = message.media.className.replace("MessageMedia", "");
  }
  const heading = extractHeading(msgText);
  const tags = extractTags(msgText);
  const body = extractBodyText(msgText);
  const obj = {
    id: msgId,
    date,
    text: body,
    media: mediaType,
    heading,
    tags
  };
  if (photoPath) obj.photoPath = photoPath;
  return obj;
};
var createMessageFile = (_channelName) => {
  const outputDir = path.resolve(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, "[]", { encoding: "utf8" });
    console.log(`
\u0421\u043E\u0437\u0434\u0430\u043D \u0444\u0430\u0439\u043B \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439: ${MESSAGES_FILE}`);
  } else {
    console.log(`
\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0431\u0443\u0434\u0443\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B \u0432 \u0444\u0430\u0439\u043B: ${MESSAGES_FILE}`);
  }
  return MESSAGES_FILE;
};
var writeMessagesToFile = async (filePath, messages, client) => {
  let fileContent = "[]";
  if (fs.existsSync(filePath)) {
    fileContent = fs.readFileSync(filePath, { encoding: "utf8" });
  }
  let jsonData = [];
  try {
    jsonData = JSON.parse(fileContent);
  } catch {
    jsonData = [];
  }
  const idMap = /* @__PURE__ */ new Map();
  for (const msg of jsonData) {
    idMap.set(msg.id, msg);
  }
  for (const message of messages) {
    let photoPath;
    if (message.media && message.media instanceof Api.MessageMediaPhoto) {
      photoPath = await downloadPhotoMiniapp(client, message);
    }
    const obj = messageToJsonObject(message, photoPath);
    if (idMap.has(obj.id)) {
      idMap.get(obj.id).text = obj.text;
      if (photoPath) idMap.get(obj.id).photoPath = photoPath;
    } else {
      idMap.set(obj.id, obj);
    }
  }
  const result = Array.from(idMap.values()).sort((a, b) => b.date - a.date);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), { encoding: "utf8" });
};
async function downloadPhotoMiniapp(client, message) {
  if (message.media && message.media instanceof Api.MessageMediaPhoto) {
    const filePath = path.join(PHOTOS_DIR, `photo_${message.id}.jpg`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    try {
      const buffer = await client.downloadMedia(message);
      if (buffer) {
        fs.writeFileSync(filePath, buffer);
        return filePath;
      }
    } catch (e) {
      console.log(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u044F \u0444\u043E\u0442\u043E \u0434\u043B\u044F \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F ${message.id}:`, e);
    }
  }
  return void 0;
}
var fetchAllMessages = async (client) => {
  let offsetId = 0;
  let totalMessages = 0;
  const outputFilePath = createMessageFile();
  while (true) {
    const result = await client.invoke(
      new Api.messages.GetHistory({
        peer: channelUsername,
        limit: 100,
        offsetId
      })
    );
    const messages = result.messages;
    if (messages.length === 0) {
      console.log(`
\u0412\u0441\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u0430.`);
      break;
    }
    totalMessages += messages.length;
    await writeMessagesToFile(outputFilePath, messages, client);
    console.log(`\u0412\u0441\u0435\u0433\u043E \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E \u0438 \u0432\u044B\u0432\u0435\u0434\u0435\u043D\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439: ${totalMessages}`);
    offsetId = Math.min(...messages.map((m) => m.id));
    await delay(fetchDelay);
  }
};

// src/index.ts
var getSessionFromEnv = async () => {
  return savedSession || "";
};
var main = async () => {
  console.log("TG Parser \u0437\u0430\u043F\u0443\u0449\u0435\u043D");
  console.log(`\u0411\u0443\u0434\u0443\u0442 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0438\u0437 \u043A\u0430\u043D\u0430\u043B\u0430: @${channelUsername}`);
  const stringSession = new StringSession(await getSessionFromEnv());
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5
  });
  try {
    await client.connect();
    console.log("\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D!");
  } catch (error) {
    console.log(`
\u274C \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F: ${error.message}`);
    await client.disconnect();
    return;
  }
  await fetchAllMessages(client);
  await client.disconnect();
  console.log("\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u044B \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F...");
};
var shutdown = (isError = false) => {
  console.log("\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u044B \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F...");
  process.exit(isError ? 1 : 0);
};
process.once("SIGTERM", () => shutdown());
process.once("SIGINT", () => shutdown());
process.once("unhandledRejection", (error) => {
  console.log(`
\u274C \u041D\u0435\u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430: ${error?.message || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}`);
  shutdown(true);
});
if (process.env.NODE_ENV === "api") {
  Promise.resolve().then(() => init_api());
} else {
  (async () => {
    await main();
    shutdown();
  })().catch((error) => {
    console.log(`
\u274C \u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F: ${error?.message || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}`);
    shutdown(true);
  });
}
