import { Elysia, t } from "elysia";
import { getChatById, getVotesByChatId, voteMessage } from "@/lib/db/queries";

export const voteRoutes = new Elysia({ prefix: "/api" })
  .get("/vote", async ({ query }) => {
    const chatId = query.chatId;
    if (!chatId) {
      throw new Error("Parameter chatId is required.");
    }

    const chat = await getChatById({ id: chatId });
    if (!chat) {
      throw new Error("Chat not found");
    }

    const votes = await getVotesByChatId({ id: chatId });
    return votes;
  })
  .patch(
    "/vote",
    async ({ body }) => {
      const { chatId, messageId, type } = body;

      if (!chatId || !messageId || !type) {
        throw new Error("Parameters chatId, messageId, and type are required.");
      }

      const chat = await getChatById({ id: chatId });
      if (!chat) {
        throw new Error("Chat not found");
      }

      await voteMessage({
        chatId,
        messageId,
        type,
      });

      return { message: "Message voted" };
    },
    {
      body: t.Object({
        chatId: t.String(),
        messageId: t.String(),
        type: t.Union([t.Literal("up"), t.Literal("down")]),
      }),
    }
  );
