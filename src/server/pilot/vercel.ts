import { createRedisColonyPilot } from "./RedisColonyPilot";
if (!process.env.REDIS_URL) throw Error("Redis storage must be configured");
const origins = ["https://5erax.github.io", "https://proz0-colony.vercel.app"];
if (process.env.VERCEL_URL) origins.push("https://" + process.env.VERCEL_URL);
const pilot = createRedisColonyPilot({
  url: process.env.REDIS_URL,
  allowedOrigins: origins,
  ...(process.env.PROZ0_CREATION_KEY
    ? { creationKey: process.env.PROZ0_CREATION_KEY }
    : {}),
});
export default pilot.server;
