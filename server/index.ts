import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { chatRoutes } from "./routes/chat";
import { documentRoutes } from "./routes/document";
import { filesRoutes } from "./routes/files";
import { historyRoutes } from "./routes/history";
import { suggestionsRoutes } from "./routes/suggestions";
import { voteRoutes } from "./routes/vote";

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
