import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { chatRoutes } from "./routes/chat";
import { historyRoutes } from "./routes/history";
import { documentRoutes } from "./routes/document";
import { voteRoutes } from "./routes/vote";
import { suggestionsRoutes } from "./routes/suggestions";
import { filesRoutes } from "./routes/files";

const app = new Elysia()
  .use(cors())
  .use(chatRoutes)
  .use(historyRoutes)
  .use(documentRoutes)
  .use(voteRoutes)
  .use(suggestionsRoutes)
  .use(filesRoutes)
  .get("/api/health", () => ({ status: "ok" }))
  .listen(3001);

console.log(
  `Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
