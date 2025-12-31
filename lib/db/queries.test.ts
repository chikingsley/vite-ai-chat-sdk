import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";

// Test database path - separate from production
const TEST_DB_PATH = "./data/test-chat.db";

// We need to set the env before importing queries
process.env.DATABASE_PATH = TEST_DB_PATH;

// Now import the queries (they will use our test db)
// Note: We import dynamically to ensure env is set first
let queries: typeof import("./queries");

beforeAll(async () => {
  // Clean up any existing test db
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH);
  }

  // Import queries - this will create the test database
  queries = await import("./queries");
});

afterAll(() => {
  // Clean up test database
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH);
  }
});

describe("User queries", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "password123";

  test("createUser creates a new user", async () => {
    const result = await queries.createUser(testEmail, testPassword);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.email).toBe(testEmail);
  });

  test("getUser retrieves user by email", async () => {
    const users = await queries.getUser(testEmail);

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe(testEmail);
    expect(users[0].password).toBeDefined();
  });

  test("getUser returns empty array for non-existent user", async () => {
    const users = await queries.getUser("nonexistent@example.com");

    expect(users).toHaveLength(0);
  });

  test("createGuestUser creates a guest user", async () => {
    const result = await queries.createGuestUser();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBeDefined();
    expect(result[0].email).toMatch(/^guest-/);
  });
});

describe("Chat queries", () => {
  let userId: string;
  let chatId: string;

  beforeAll(async () => {
    // Create a user for chat tests
    const user = await queries.createUser(
      `chat-test-${Date.now()}@example.com`,
      "password"
    );
    userId = user.id;
  });

  test("saveChat creates a new chat", async () => {
    chatId = `chat-${Date.now()}`;
    const result = await queries.saveChat({
      id: chatId,
      userId,
      title: "Test Chat",
      visibility: "private",
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(chatId);
  });

  test("getChatById retrieves chat by id", async () => {
    const chat = await queries.getChatById({ id: chatId });

    expect(chat).toBeDefined();
    expect(chat?.id).toBe(chatId);
    expect(chat?.title).toBe("Test Chat");
    expect(chat?.userId).toBe(userId);
    expect(chat?.visibility).toBe("private");
  });

  test("getChatById returns null for non-existent chat", async () => {
    const chat = await queries.getChatById({ id: "nonexistent" });

    expect(chat).toBeNull();
  });

  test("getChatsByUserId retrieves chats for user", async () => {
    // Create a second chat
    await queries.saveChat({
      id: `chat-2-${Date.now()}`,
      userId,
      title: "Test Chat 2",
      visibility: "private",
    });

    const result = await queries.getChatsByUserId({
      id: userId,
      limit: 10,
      startingAfter: null,
      endingBefore: null,
    });

    expect(result.chats.length).toBeGreaterThanOrEqual(2);
    expect(result.hasMore).toBe(false);
  });

  test("updateChatTitleById updates chat title", async () => {
    await queries.updateChatTitleById({
      chatId,
      title: "Updated Title",
    });

    const chat = await queries.getChatById({ id: chatId });
    expect(chat?.title).toBe("Updated Title");
  });

  test("updateChatVisibilityById updates visibility", async () => {
    await queries.updateChatVisibilityById({
      chatId,
      visibility: "public",
    });

    const chat = await queries.getChatById({ id: chatId });
    expect(chat?.visibility).toBe("public");
  });

  test("deleteChatById removes chat", async () => {
    const tempChatId = `temp-chat-${Date.now()}`;
    await queries.saveChat({
      id: tempChatId,
      userId,
      title: "Temp Chat",
      visibility: "private",
    });

    const deleted = await queries.deleteChatById({ id: tempChatId });
    expect(deleted?.id).toBe(tempChatId);

    const chat = await queries.getChatById({ id: tempChatId });
    expect(chat).toBeNull();
  });
});

describe("Message queries", () => {
  let chatId: string;
  let messageId: string;

  beforeAll(async () => {
    // Create user and chat for message tests
    const user = await queries.createUser(
      `msg-test-${Date.now()}@example.com`,
      "password"
    );
    chatId = `msg-chat-${Date.now()}`;
    await queries.saveChat({
      id: chatId,
      userId: user.id,
      title: "Message Test Chat",
      visibility: "private",
    });
  });

  test("saveMessages saves multiple messages", async () => {
    messageId = `msg-${Date.now()}`;
    const messages = [
      {
        id: messageId,
        chatId,
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
        attachments: [],
        createdAt: new Date(),
      },
      {
        id: `msg-2-${Date.now()}`,
        chatId,
        role: "assistant",
        parts: [{ type: "text", text: "Hi there!" }],
        attachments: [],
        createdAt: new Date(),
      },
    ];

    const result = await queries.saveMessages({ messages });

    expect(result.count).toBe(2);
  });

  test("getMessagesByChatId retrieves messages", async () => {
    const messages = await queries.getMessagesByChatId({ id: chatId });

    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0].chatId).toBe(chatId);
    expect(messages[0].parts).toBeDefined();
  });

  test("getMessageById retrieves message by id", async () => {
    const messages = await queries.getMessageById({ id: messageId });

    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe(messageId);
  });

  test("updateMessage updates message parts", async () => {
    const newParts = [{ type: "text", text: "Updated message" }];
    await queries.updateMessage({ id: messageId, parts: newParts });

    const messages = await queries.getMessageById({ id: messageId });
    expect(messages[0].parts).toEqual(newParts);
  });
});

describe("Vote queries", () => {
  let chatId: string;
  let messageId: string;

  beforeAll(async () => {
    // Create user, chat, and message for vote tests
    const user = await queries.createUser(
      `vote-test-${Date.now()}@example.com`,
      "password"
    );
    chatId = `vote-chat-${Date.now()}`;
    messageId = `vote-msg-${Date.now()}`;

    await queries.saveChat({
      id: chatId,
      userId: user.id,
      title: "Vote Test Chat",
      visibility: "private",
    });

    await queries.saveMessages({
      messages: [
        {
          id: messageId,
          chatId,
          role: "assistant",
          parts: [{ type: "text", text: "Rate me!" }],
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
  });

  test("voteMessage creates upvote", async () => {
    const result = await queries.voteMessage({
      chatId,
      messageId,
      type: "up",
    });

    expect(result.chatId).toBe(chatId);
    expect(result.messageId).toBe(messageId);
  });

  test("getVotesByChatId retrieves votes", async () => {
    const votes = await queries.getVotesByChatId({ id: chatId });

    expect(votes).toHaveLength(1);
    expect(votes[0].isUpvoted).toBe(true);
  });

  test("voteMessage updates existing vote", async () => {
    await queries.voteMessage({
      chatId,
      messageId,
      type: "down",
    });

    const votes = await queries.getVotesByChatId({ id: chatId });
    expect(votes[0].isUpvoted).toBe(false);
  });
});

describe("Document queries", () => {
  let userId: string;
  let documentId: string;

  beforeAll(async () => {
    const user = await queries.createUser(
      `doc-test-${Date.now()}@example.com`,
      "password"
    );
    userId = user.id;
  });

  test("saveDocument creates a document", async () => {
    documentId = `doc-${Date.now()}`;
    const result = await queries.saveDocument({
      id: documentId,
      title: "Test Document",
      kind: "text",
      content: "Hello world",
      userId,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(documentId);
    expect(result[0].title).toBe("Test Document");
  });

  test("getDocumentById retrieves latest document version", async () => {
    const doc = await queries.getDocumentById({ id: documentId });

    expect(doc).toBeDefined();
    expect(doc?.id).toBe(documentId);
    expect(doc?.content).toBe("Hello world");
  });

  test("getDocumentsById retrieves all versions", async () => {
    // Wait a bit to ensure different createdAt timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Save a new version
    await queries.saveDocument({
      id: documentId,
      title: "Test Document v2",
      kind: "text",
      content: "Updated content",
      userId,
    });

    const docs = await queries.getDocumentsById({ id: documentId });

    expect(docs.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Stream queries", () => {
  let chatId: string;

  beforeAll(async () => {
    const user = await queries.createUser(
      `stream-test-${Date.now()}@example.com`,
      "password"
    );
    chatId = `stream-chat-${Date.now()}`;

    await queries.saveChat({
      id: chatId,
      userId: user.id,
      title: "Stream Test Chat",
      visibility: "private",
    });
  });

  test("createStreamId creates a stream", async () => {
    const streamId = `stream-${Date.now()}`;

    // Should not throw
    await queries.createStreamId({ streamId, chatId });
  });

  test("getStreamIdsByChatId retrieves stream ids", async () => {
    const streamId = `stream-2-${Date.now()}`;
    await queries.createStreamId({ streamId, chatId });

    const streamIds = await queries.getStreamIdsByChatId({ chatId });

    expect(streamIds.length).toBeGreaterThanOrEqual(1);
    expect(streamIds).toContain(streamId);
  });
});

describe("Message count queries", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await queries.createUser(
      `count-test-${Date.now()}@example.com`,
      "password"
    );
    userId = user.id;

    // Create chat and messages for count test
    const chatId = `count-chat-${Date.now()}`;
    await queries.saveChat({
      id: chatId,
      userId,
      title: "Count Test Chat",
      visibility: "private",
    });

    await queries.saveMessages({
      messages: [
        {
          id: `count-msg-1-${Date.now()}`,
          chatId,
          role: "user",
          parts: [{ type: "text", text: "Message 1" }],
          attachments: [],
          createdAt: new Date(),
        },
        {
          id: `count-msg-2-${Date.now()}`,
          chatId,
          role: "user",
          parts: [{ type: "text", text: "Message 2" }],
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
  });

  test("getMessageCountByUserId counts user messages", async () => {
    const count = await queries.getMessageCountByUserId({
      id: userId,
      differenceInHours: 24,
    });

    expect(count).toBeGreaterThanOrEqual(2);
  });
});
