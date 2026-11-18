import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

/** Vercel Express service expects a default export (Fluid / serverless). */
export default app;

/** Local / Docker: keep classic listen. Skip on Vercel. */
if (!process.env.VERCEL) {
  app.listen(env.API_PORT, env.API_HOST, () => {
    console.log(
      `Pharma API listening on http://${env.API_HOST}:${env.API_PORT} (docs: /api/docs)`,
    );
  });
}
