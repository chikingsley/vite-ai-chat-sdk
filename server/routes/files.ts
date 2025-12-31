import { Elysia } from "elysia";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

// Simple file storage - saves to local uploads directory
// In production, you'd want to use a cloud storage service
const UPLOADS_DIR = "./uploads";

export const filesRoutes = new Elysia({ prefix: "/api" })
  .post("/files/upload", async ({ request }) => {
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
