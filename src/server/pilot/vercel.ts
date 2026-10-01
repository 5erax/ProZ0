import { createRedisColonyPilot } from "./RedisColonyPilot";
import { createHash } from "node:crypto";
if (!process.env.REDIS_URL) throw Error("Redis storage must be configured");
const origins = ["https://5erax.github.io", "https://proz0-colony.vercel.app"];
if (process.env.VERCEL_URL) origins.push("https://" + process.env.VERCEL_URL);
const pilot = createRedisColonyPilot({
  url: process.env.REDIS_URL,
  ...(process.env.VERCEL_ENV === "preview" ? { namespace: "proz0:preview:" + createHash("sha256").update(process.env.VERCEL_GIT_COMMIT_REF ?? process.env.VERCEL_URL ?? "preview").digest("hex").slice(0, 16) } : {}),
  allowedOrigins: origins,
  secureCookies:true,
  ...(process.env.PROZ0_CREATION_KEY
    ? { creationKey: process.env.PROZ0_CREATION_KEY }
    : {}),
});
export default pilot.server;
