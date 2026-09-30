import { createRedisColonyPilot } from "./RedisColonyPilot";
if (!process.env.REDIS_URL)
  throw Error("Set REDIS_URL for the shared world store");
const pilot = createRedisColonyPilot({
  url: process.env.REDIS_URL,
  allowedOrigins: (
    process.env.PROZ0_ALLOWED_ORIGINS ??
    "http://127.0.0.1:4173,http://127.0.0.1:5173,https://5erax.github.io"
  ).split(","),
  ...(process.env.PROZ0_CREATION_KEY
    ? { creationKey: process.env.PROZ0_CREATION_KEY }
    : {}),
});
await pilot.ready();
await new Promise<void>((done) =>
  pilot.server.listen(
    Number(process.env.PORT ?? 8787),
    process.env.PROZ0_HOST ?? "127.0.0.1",
    done,
  ),
);
console.log(
  "ProZ0 private colony pilot ready. Shared worlds are stored in Redis.",
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void pilot.close().then(() => process.exit(0));
  });
