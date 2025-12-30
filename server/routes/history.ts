import { Elysia } from "elysia";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";

// Default user for development (no auth)
const DEFAULT_USER_ID = "default-user-id";

export const historyRoutes = new Elysia({ prefix: "/api" })
  .get("/history", async ({ query }) => {
    const limit = Number.parseInt(query.limit || "10", 10);
    const startingAfter = query.starting_after || null;
    const endingBefore = query.ending_before || null;

    if (startingAfter && endingBefore) {
      throw new Error("Only one of starting_after or ending_before can be provided.");
    }

    const chats = await getChatsByUserId({
      id: DEFAULT_USER_ID,
      limit,
      startingAfter,
      endingBefore,
    });

    return chats;
  })
  .delete("/history", async () => {
    const result = await deleteAllChatsByUserId({ userId: DEFAULT_USER_ID });
    return result;
  });
