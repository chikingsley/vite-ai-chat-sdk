import { Elysia } from "elysia";
import { getSuggestionsByDocumentId } from "@/lib/db/queries";

export const suggestionsRoutes = new Elysia({ prefix: "/api" }).get(
  "/suggestions",
  async ({ query }) => {
    const documentId = query.documentId;
    if (!documentId) {
      throw new Error("Parameter documentId is required.");
    }

    const suggestions = await getSuggestionsByDocumentId({
      documentId,
    });

    return suggestions;
  }
);
