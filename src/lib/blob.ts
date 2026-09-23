import { put } from "@vercel/blob";
import * as fs from "fs";
import * as path from "path";

export async function uploadCakeImage(
  fileName: string,
  fileBuffer: Buffer | Blob,
  contentType: string = "image/jpeg"
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // 1. Vercel Blob in Production
  if (token) {
    const blob = await put(`cakes/${Date.now()}-${fileName}`, fileBuffer, {
      access: "public",
      contentType,
      token,
    });
    return blob.url;
  }

  // 2. Safe Local Storage Fallback for Dev/Offline
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filePath = path.join(uploadsDir, safeName);

  if (Buffer.isBuffer(fileBuffer)) {
    fs.writeFileSync(filePath, fileBuffer);
  } else {
    const arrayBuffer = await fileBuffer.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  }

  return `/uploads/${safeName}`;
}
