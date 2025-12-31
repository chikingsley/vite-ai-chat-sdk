import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Elysia } from "elysia";

// Simple file storage - saves to local uploads directory
// In production, you'd want to use a cloud storage service
const UPLOADS_DIR = "./uploads";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export const filesRoutes = new Elysia()
  // Serve uploaded files at /uploads/:filename
  .get("/uploads/:filename", async ({ params, set }) => {
    try {
      const filepath = join(UPLOADS_DIR, params.filename);
      const file = await readFile(filepath);
      const ext = params.filename.split(".").pop()?.toLowerCase() || "";
      set.headers["content-type"] =
        MIME_TYPES[ext] || "application/octet-stream";
      set.headers["cache-control"] = "public, max-age=31536000";
      return file;
    } catch {
      set.status = 404;
      return { error: "File not found" };
    }
  })
  // Upload endpoint at /api/files/upload
  .post("/api/files/upload", async ({ request }) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File;

      if (!file) {
        throw new Error("No file uploaded");
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size should be less than 5MB");
      }

      // Validate file type
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        throw new Error("File type should be JPEG or PNG");
      }

      // Ensure uploads directory exists
      await mkdir(UPLOADS_DIR, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const filepath = join(UPLOADS_DIR, filename);

      // Save file
      const buffer = await file.arrayBuffer();
      await writeFile(filepath, Buffer.from(buffer));

      // Return file info
      return {
        url: `/uploads/${filename}`,
        pathname: filename,
        contentType: file.type,
        contentDisposition: `attachment; filename="${file.name}"`,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Failed to process request");
    }
  });
