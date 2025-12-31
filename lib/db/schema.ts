// SQLite schema types (replacing Drizzle ORM)

export interface User {
  id: string;
  email: string;
  password: string | null;
}

export interface Chat {
  id: string;
  createdAt: Date;
  title: string;
  userId: string;
  visibility: "public" | "private";
}

export interface DBMessage {
  id: string;
  chatId: string;
  role: string;
  parts: unknown;
  attachments: unknown;
  createdAt: Date;
}

export interface Vote {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
}

export interface Document {
  id: string;
  createdAt: Date;
  title: string;
  content: string | null;
  kind: "text" | "code" | "sheet";
  userId: string;
}

export interface Suggestion {
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description: string | null;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
}

export interface Stream {
  id: string;
  chatId: string;
  createdAt: Date;
}
