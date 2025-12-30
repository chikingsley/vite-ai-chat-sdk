import { Elysia, t } from "elysia";
import type { ArtifactKind } from "@/components/artifact";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from "@/lib/db/queries";

// Default user for development (no auth)
const DEFAULT_USER_ID = "default-user-id";

export const documentRoutes = new Elysia({ prefix: "/api" })
  .get("/document", async ({ query }) => {
    const id = query.id;
    if (!id) {
      throw new Error("Parameter id is missing");
    }

    const documents = await getDocumentsById({ id });
    const [document] = documents;

    if (!document) {
      throw new Error("Document not found");
    }

    return documents;
  })
  .post(
    "/document",
    async ({ query, body }) => {
      const id = query.id;
      if (!id) {
        throw new Error("Parameter id is required.");
      }

      const { content, title, kind } = body as {
        content: string;
        title: string;
        kind: ArtifactKind;
      };

      const document = await saveDocument({
        id,
        content,
        title,
        kind,
        userId: DEFAULT_USER_ID,
      });

      return document;
    },
    {
      body: t.Object({
        content: t.String(),
        title: t.String(),
        kind: t.String(),
      }),
    }
  )
  .delete("/document", async ({ query }) => {
    const id = query.id;
    const timestamp = query.timestamp;

    if (!id) {
      throw new Error("Parameter id is required.");
    }

    if (!timestamp) {
      throw new Error("Parameter timestamp is required.");
    }

    const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
      id,
      timestamp: new Date(timestamp),
    });

    return documentsDeleted;
  });
