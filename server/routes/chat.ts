import { Elysia, t } from "elysia";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "@/server/actions/chat";

// Default user for development (no auth)
const DEFAULT_USER = {
  id: "default-user-id",
  type: "regular" as const,
};

export const chatRoutes = new Elysia({ prefix: "/api" })
  // Get chat by ID
  .get("/chat/:id", async ({ params }) => {
    const chat = await getChatById({ id: params.id });
    if (!chat) {
      throw new Error("Chat not found");
    }
    return chat;
  })
  // Get messages for a chat
  .get("/chat/:id/messages", async ({ params }) => {
    const messages = await getMessagesByChatId({ id: params.id });
    return messages;
  })
  // Create/send chat message
  .post(
    "/chat",
    async ({ body }) => {
      const { id, message, messages, selectedChatModel, selectedVisibilityType } = body;

      const session = { user: DEFAULT_USER };

      // Check if this is a tool approval flow (all messages sent)
      const isToolApprovalFlow = Boolean(messages);

      const chat = await getChatById({ id });
      let messagesFromDb: DBMessage[] = [];
      let titlePromise: Promise<string> | null = null;

      if (chat) {
        // Only fetch messages if chat already exists and not tool approval
        if (!isToolApprovalFlow) {
          messagesFromDb = await getMessagesByChatId({ id });
        }
      } else if (message?.role === "user") {
        // Save chat immediately with placeholder title
        await saveChat({
          id,
          userId: session.user.id,
          title: "New chat",
          visibility: selectedVisibilityType,
        });

        // Start title generation in parallel (don't await)
        titlePromise = generateTitleFromUserMessage({ message });
      }

      // Use all messages for tool approval, otherwise DB messages + new message
      const uiMessages = isToolApprovalFlow
        ? (messages as ChatMessage[])
        : [...convertToUIMessages(messagesFromDb), message as ChatMessage];

      // Only save user messages to the database (not tool approval responses)
      if (message?.role === "user") {
        await saveMessages({
          messages: [
            {
              chatId: id,
              id: message.id,
              role: "user",
              parts: message.parts,
              attachments: [],
              createdAt: new Date(),
            },
          ],
        });
      }

      const streamId = generateUUID();
      await createStreamId({ streamId, chatId: id });

      const stream = createUIMessageStream({
        originalMessages: isToolApprovalFlow ? uiMessages : undefined,
        execute: async ({ writer: dataStream }) => {
          // Handle title generation in parallel
          if (titlePromise) {
            titlePromise.then((title) => {
              updateChatTitleById({ chatId: id, title });
              dataStream.write({ type: "data-chat-title", data: title });
            });
          }

          const isReasoningModel =
            selectedChatModel.includes("reasoning") ||
            selectedChatModel.includes("thinking");

          const result = streamText({
            model: getLanguageModel(selectedChatModel),
            system: systemPrompt({ selectedChatModel, requestHints: {} }),
            messages: await convertToModelMessages(uiMessages),
            stopWhen: stepCountIs(5),
            experimental_activeTools: isReasoningModel
              ? []
              : [
                  "getWeather",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                ],
            experimental_transform: isReasoningModel
              ? undefined
              : smoothStream({ chunking: "word" }),
            providerOptions: isReasoningModel
              ? {
                  anthropic: {
                    thinking: { type: "enabled", budgetTokens: 10_000 },
                  },
                }
              : undefined,
            tools: {
              getWeather,
              createDocument: createDocument({ session, dataStream }),
              updateDocument: updateDocument({ session, dataStream }),
              requestSuggestions: requestSuggestions({
                session,
                dataStream,
              }),
            },
          });

          result.consumeStream();

          dataStream.merge(
            result.toUIMessageStream({
              sendReasoning: true,
            })
          );
        },
        generateId: generateUUID,
        onFinish: async ({ messages: finishedMessages }) => {
          if (isToolApprovalFlow) {
            for (const finishedMsg of finishedMessages) {
              const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
              if (existingMsg) {
                await updateMessage({
                  id: finishedMsg.id,
                  parts: finishedMsg.parts,
                });
              } else {
                await saveMessages({
                  messages: [
                    {
                      id: finishedMsg.id,
                      role: finishedMsg.role,
                      parts: finishedMsg.parts,
                      createdAt: new Date(),
                      attachments: [],
                      chatId: id,
                    },
                  ],
                });
              }
            }
          } else if (finishedMessages.length > 0) {
            await saveMessages({
              messages: finishedMessages.map((currentMessage) => ({
                id: currentMessage.id,
                role: currentMessage.role,
                parts: currentMessage.parts,
                createdAt: new Date(),
                attachments: [],
                chatId: id,
              })),
            });
          }
        },
        onError: () => {
          return "Oops, an error occurred!";
        },
      });

      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    },
    {
      body: t.Object({
        id: t.String(),
        message: t.Optional(t.Any()),
        messages: t.Optional(t.Array(t.Any())),
        selectedChatModel: t.String(),
        selectedVisibilityType: t.Union([t.Literal("public"), t.Literal("private")]),
      }),
    }
  )
  // Delete chat
  .delete("/chat", async ({ query }) => {
    const id = query.id;
    if (!id) {
      throw new Error("Chat ID is required");
    }

    const deletedChat = await deleteChatById({ id });
    return deletedChat;
  })
  // Update chat visibility
  .patch(
    "/chat/:id/visibility",
    async ({ params, body }) => {
      const { visibility } = body;
      await import("@/lib/db/queries").then(({ updateChatVisibilityById }) =>
        updateChatVisibilityById({ chatId: params.id, visibility })
      );
      return { success: true };
    },
    {
      body: t.Object({
        visibility: t.Union([t.Literal("public"), t.Literal("private")]),
      }),
    }
  )
  // Delete trailing messages
  .delete("/messages/:id/trailing", async ({ params }) => {
    const { getMessageById, deleteMessagesByChatIdAfterTimestamp } = await import("@/lib/db/queries");
    const [message] = await getMessageById({ id: params.id });

    if (!message) {
      throw new Error("Message not found");
    }

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });

    return { success: true };
  });
