/**
 * `npm run dev`. Watch mode is always a development build, so NODE_ENV is set before anything that reads it loads:
 * `DEV_MODE` is fixed when `src/utils/config/env.ts` is first evaluated, and a static import would evaluate it first.
 */
process.env.NODE_ENV = "development";
const { startWatch } = await import("./watch.ts");
await startWatch(process.argv.slice(2));
