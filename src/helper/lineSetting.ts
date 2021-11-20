import { Client, middleware } from "@line/bot-sdk";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "default",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "default",
};
middleware(config);
const client = new Client(config);

export default client;
