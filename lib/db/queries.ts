import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import { generateUUID } from "../utils";
import type {
  Chat,
  DBMessage,
  Document,
  Suggestion,
  User,
  Vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

// Database path - stored in data directory
const DB_PATH = process.env.DATABASE_PATH || "./data/chat.db";

// Ensure data directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    email TEXT NOT NULL UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS Chat (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    createdAt TEXT NOT NULL,
    title TEXT NOT NULL,
    userId TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'private',
    FOREIGN KEY (userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS Message (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    chatId TEXT NOT NULL,
    role TEXT NOT NULL,
    parts TEXT NOT NULL,
    attachments TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (chatId) REFERENCES Chat(id)
  );

  CREATE TABLE IF NOT EXISTS Vote (
    chatId TEXT NOT NULL,
    messageId TEXT NOT NULL,
    isUpvoted INTEGER NOT NULL,
    PRIMARY KEY (chatId, messageId),
    FOREIGN KEY (chatId) REFERENCES Chat(id),
    FOREIGN KEY (messageId) REFERENCES Message(id)
  );

  CREATE TABLE IF NOT EXISTS Document (
    id TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    kind TEXT NOT NULL DEFAULT 'text',
    userId TEXT NOT NULL,
    PRIMARY KEY (id, createdAt),
    FOREIGN KEY (userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS Suggestion (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    documentId TEXT NOT NULL,
    documentCreatedAt TEXT NOT NULL,
    originalText TEXT NOT NULL,
    suggestedText TEXT NOT NULL,
    description TEXT,
    isResolved INTEGER NOT NULL DEFAULT 0,
    userId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS Stream (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    chatId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (chatId) REFERENCES Chat(id)
  );

  CREATE INDEX IF NOT EXISTS idx_chat_userId ON Chat(userId);
  CREATE INDEX IF NOT EXISTS idx_chat_createdAt ON Chat(createdAt);
  CREATE INDEX IF NOT EXISTS idx_message_chatId ON Message(chatId);
  CREATE INDEX IF NOT EXISTS idx_message_createdAt ON Message(createdAt);
  CREATE INDEX IF NOT EXISTS idx_document_id ON Document(id);
  CREATE INDEX IF NOT EXISTS idx_stream_chatId ON Stream(chatId);
`);

// Helper to parse dates from SQLite
function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

// Helper to format dates for SQLite
function formatDate(date: Date): string {
  return date.toISOString();
}

// Helper to parse a User row
function parseUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    password: row.password as string | null,
  };
}

// Helper to parse a Chat row
function parseChat(row: Record<string, unknown>): Chat {
  return {
    id: row.id as string,
    createdAt: parseDate(row.createdAt as string),
    title: row.title as string,
    userId: row.userId as string,
    visibility: row.visibility as "public" | "private",
  };
}

// Helper to parse a Message row
function parseMessage(row: Record<string, unknown>): DBMessage {
  return {
    id: row.id as string,
    chatId: row.chatId as string,
    role: row.role as string,
    parts: JSON.parse(row.parts as string),
    attachments: JSON.parse(row.attachments as string),
    createdAt: parseDate(row.createdAt as string),
  };
}

// Helper to parse a Vote row
function parseVote(row: Record<string, unknown>): Vote {
  return {
    chatId: row.chatId as string,
    messageId: row.messageId as string,
    isUpvoted: Boolean(row.isUpvoted),
  };
}

// Helper to parse a Document row
function parseDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    createdAt: parseDate(row.createdAt as string),
    title: row.title as string,
    content: row.content as string | null,
    kind: row.kind as "text" | "code" | "sheet",
    userId: row.userId as string,
  };
}

// Helper to parse a Suggestion row
function parseSuggestion(row: Record<string, unknown>): Suggestion {
  return {
    id: row.id as string,
    documentId: row.documentId as string,
    documentCreatedAt: parseDate(row.documentCreatedAt as string),
    originalText: row.originalText as string,
    suggestedText: row.suggestedText as string,
    description: row.description as string | null,
    isResolved: Boolean(row.isResolved),
    userId: row.userId as string,
    createdAt: parseDate(row.createdAt as string),
  };
}

export async function getUser(email: string): Promise<User[]> {
  try {
    const stmt = db.prepare("SELECT * FROM User WHERE email = ?");
    const rows = stmt.all(email) as Record<string, unknown>[];
    return rows.map(parseUser);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    const id = generateUUID();
    const stmt = db.prepare(
      "INSERT INTO User (id, email, password) VALUES (?, ?, ?)"
    );
    stmt.run(id, email, hashedPassword);
    return { id, email };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    const id = generateUUID();
    const stmt = db.prepare(
      "INSERT INTO User (id, email, password) VALUES (?, ?, ?)"
    );
    stmt.run(id, email, password);
    return [{ id, email }];
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    const stmt = db.prepare(
      "INSERT INTO Chat (id, createdAt, userId, title, visibility) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(id, formatDate(new Date()), userId, title, visibility);
    return { id };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    db.prepare("DELETE FROM Vote WHERE chatId = ?").run(id);
    db.prepare("DELETE FROM Message WHERE chatId = ?").run(id);
    db.prepare("DELETE FROM Stream WHERE chatId = ?").run(id);

    const stmt = db.prepare(
      "DELETE FROM Chat WHERE id = ? RETURNING id, createdAt, title, userId, visibility"
    );
    const row = stmt.get(id) as Record<string, unknown> | null;
    return row ? parseChat(row) : null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const chatRows = db
      .prepare("SELECT id FROM Chat WHERE userId = ?")
      .all(userId) as { id: string }[];

    if (chatRows.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = chatRows.map((c) => c.id);
    const placeholders = chatIds.map(() => "?").join(",");

    db.prepare(`DELETE FROM Vote WHERE chatId IN (${placeholders})`).run(
      ...chatIds
    );
    db.prepare(`DELETE FROM Message WHERE chatId IN (${placeholders})`).run(
      ...chatIds
    );
    db.prepare(`DELETE FROM Stream WHERE chatId IN (${placeholders})`).run(
      ...chatIds
    );

    const result = db.prepare("DELETE FROM Chat WHERE userId = ?").run(userId);

    return { deletedCount: result.changes };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;
    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const selectedChat = db
        .prepare("SELECT * FROM Chat WHERE id = ?")
        .get(startingAfter) as Record<string, unknown> | null;

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      const rows = db
        .prepare(
          "SELECT * FROM Chat WHERE userId = ? AND createdAt > ? ORDER BY createdAt DESC LIMIT ?"
        )
        .all(id, selectedChat.createdAt as string, extendedLimit) as Record<
        string,
        unknown
      >[];
      filteredChats = rows.map(parseChat);
    } else if (endingBefore) {
      const selectedChat = db
        .prepare("SELECT * FROM Chat WHERE id = ?")
        .get(endingBefore) as Record<string, unknown> | null;

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      const rows = db
        .prepare(
          "SELECT * FROM Chat WHERE userId = ? AND createdAt < ? ORDER BY createdAt DESC LIMIT ?"
        )
        .all(id, selectedChat.createdAt as string, extendedLimit) as Record<
        string,
        unknown
      >[];
      filteredChats = rows.map(parseChat);
    } else {
      const rows = db
        .prepare(
          "SELECT * FROM Chat WHERE userId = ? ORDER BY createdAt DESC LIMIT ?"
        )
        .all(id, extendedLimit) as Record<string, unknown>[];
      filteredChats = rows.map(parseChat);
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const row = db.prepare("SELECT * FROM Chat WHERE id = ?").get(id) as Record<
      string,
      unknown
    > | null;
    if (!row) {
      return null;
    }
    return parseChat(row);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    const stmt = db.prepare(
      "INSERT INTO Message (id, chatId, role, parts, attachments, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const insertMany = db.transaction(() => {
      for (const msg of messages) {
        stmt.run(
          msg.id,
          msg.chatId,
          msg.role,
          JSON.stringify(msg.parts),
          JSON.stringify(msg.attachments),
          formatDate(msg.createdAt)
        );
      }
    });

    insertMany();
    return { count: messages.length };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    const stmt = db.prepare("UPDATE Message SET parts = ? WHERE id = ?");
    stmt.run(JSON.stringify(parts), id);
    return { id };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const rows = db
      .prepare("SELECT * FROM Message WHERE chatId = ? ORDER BY createdAt ASC")
      .all(id) as Record<string, unknown>[];
    return rows.map(parseMessage);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const existingVote = db
      .prepare("SELECT * FROM Vote WHERE messageId = ?")
      .get(messageId) as Record<string, unknown> | null;

    if (existingVote) {
      const stmt = db.prepare(
        "UPDATE Vote SET isUpvoted = ? WHERE messageId = ? AND chatId = ?"
      );
      stmt.run(type === "up" ? 1 : 0, messageId, chatId);
    } else {
      const stmt = db.prepare(
        "INSERT INTO Vote (chatId, messageId, isUpvoted) VALUES (?, ?, ?)"
      );
      stmt.run(chatId, messageId, type === "up" ? 1 : 0);
    }
    return { chatId, messageId };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const rows = db
      .prepare("SELECT * FROM Vote WHERE chatId = ?")
      .all(id) as Record<string, unknown>[];
    return rows.map(parseVote);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    const createdAt = formatDate(new Date());
    const stmt = db.prepare(
      "INSERT INTO Document (id, createdAt, title, content, kind, userId) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, createdAt, title, content, kind, userId);

    const row = db
      .prepare("SELECT * FROM Document WHERE id = ? AND createdAt = ?")
      .get(id, createdAt) as Record<string, unknown>;
    return [parseDocument(row)];
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const rows = db
      .prepare("SELECT * FROM Document WHERE id = ? ORDER BY createdAt ASC")
      .all(id) as Record<string, unknown>[];
    return rows.map(parseDocument);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const row = db
      .prepare("SELECT * FROM Document WHERE id = ? ORDER BY createdAt DESC")
      .get(id) as Record<string, unknown> | null;
    return row ? parseDocument(row) : undefined;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const ts = formatDate(timestamp);

    db.prepare(
      "DELETE FROM Suggestion WHERE documentId = ? AND documentCreatedAt > ?"
    ).run(id, ts);

    const rows = db
      .prepare(
        "DELETE FROM Document WHERE id = ? AND createdAt > ? RETURNING *"
      )
      .all(id, ts) as Record<string, unknown>[];
    return rows.map(parseDocument);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    const stmt = db.prepare(
      "INSERT INTO Suggestion (id, documentId, documentCreatedAt, originalText, suggestedText, description, isResolved, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    const insertMany = db.transaction(() => {
      for (const s of suggestions) {
        stmt.run(
          s.id,
          s.documentId,
          formatDate(s.documentCreatedAt),
          s.originalText,
          s.suggestedText,
          s.description,
          s.isResolved ? 1 : 0,
          s.userId,
          formatDate(s.createdAt)
        );
      }
    });

    insertMany();
    return { count: suggestions.length };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const rows = db
      .prepare("SELECT * FROM Suggestion WHERE documentId = ?")
      .all(documentId) as Record<string, unknown>[];
    return rows.map(parseSuggestion);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const rows = db
      .prepare("SELECT * FROM Message WHERE id = ?")
      .all(id) as Record<string, unknown>[];
    return rows.map(parseMessage);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const ts = formatDate(timestamp);

    const messageRows = db
      .prepare("SELECT id FROM Message WHERE chatId = ? AND createdAt >= ?")
      .all(chatId, ts) as { id: string }[];

    const messageIds = messageRows.map((m) => m.id);

    if (messageIds.length > 0) {
      const placeholders = messageIds.map(() => "?").join(",");

      db.prepare(
        `DELETE FROM Vote WHERE chatId = ? AND messageId IN (${placeholders})`
      ).run(chatId, ...messageIds);

      db.prepare(
        `DELETE FROM Message WHERE chatId = ? AND id IN (${placeholders})`
      ).run(chatId, ...messageIds);
    }

    return { count: messageIds.length };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    const stmt = db.prepare("UPDATE Chat SET visibility = ? WHERE id = ?");
    stmt.run(visibility, chatId);
    return { chatId };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    const stmt = db.prepare("UPDATE Chat SET title = ? WHERE id = ?");
    stmt.run(title, chatId);
    return { chatId };
  } catch (error) {
    console.warn("Failed to update title for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const cutoffDate = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );
    const ts = formatDate(cutoffDate);

    const result = db
      .prepare(
        `SELECT COUNT(*) as count FROM Message m
         INNER JOIN Chat c ON m.chatId = c.id
         WHERE c.userId = ? AND m.createdAt >= ? AND m.role = 'user'`
      )
      .get(id, ts) as { count: number };

    return result?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    const stmt = db.prepare(
      "INSERT INTO Stream (id, chatId, createdAt) VALUES (?, ?, ?)"
    );
    stmt.run(streamId, chatId, formatDate(new Date()));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const rows = db
      .prepare("SELECT id FROM Stream WHERE chatId = ? ORDER BY createdAt ASC")
      .all(chatId) as { id: string }[];
    return rows.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}
