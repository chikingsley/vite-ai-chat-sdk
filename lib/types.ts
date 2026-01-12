import type { InferUITool, UIMessage, ToolSet } from "ai";
import { z } from "zod";
import { tool } from "ai";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";

// Search tool definition (matches backend)
export const searchTool = tool({
  description: "Search Monday.com database",
  inputSchema: z.object({
    query: z.string(),
    boards: z.array(z.string()).optional(),
    limit: z.number().optional(),
  }),
  execute: async () => {
    // This is a placeholder - actual execution happens on the backend
    return [];
  },
});

export type SearchResult = {
  id: string;
  type: string;
  name: string;
  contractor?: string;
  monday_url?: string | null;
  files?: Array<{
    name: string;
    fileName: string;
    url: string;
    extension?: string;
    size?: number;
  }>;
  [key: string]: unknown;
};

// Simple session type (replaces next-auth Session)
export interface Session {
  user?: {
    id: string;
    email?: string | null;
  } | null;
}

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type searchToolType = InferUITool<typeof searchTool>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  search: searchToolType;
};

export type CustomUIDataTypes = {
  textDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
