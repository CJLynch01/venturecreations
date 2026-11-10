// Photo uploads from the admin forms (shirts and blog covers).
// Photos go to the shop's S3 bucket when AWS keys are set. The test site saves them to /new-images instead.
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
// Read the keys when first needed (the .env file loads after this module on a local run)
let client;
function bucket() {
  // Region and bucket default to the shop's own bucket, so only the two keys are required
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
  const AWS_REGION = process.env.AWS_REGION || "us-east-2";
  const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || "venturecreations-images";   // Render names it S3_BUCKET
  if (!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION && S3_BUCKET_NAME)) return null;
  client ||= new S3Client({ region: AWS_REGION, credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY } });
  return { client, name: S3_BUCKET_NAME, region: AWS_REGION };
}
const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/public/new-images/uploads");

// Which AWS setting names the server can't see (names only, never values), for the dashboard
export const missingAwsKeys = () => ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"].filter(k => !process.env[k]);

export const uploadsEnabled = () => Boolean(bucket() || process.env.TEST_SITE);

export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => cb(null, Boolean(TYPES[file.mimetype])),
}).array("photos", 12);

// "Sugar Skull Bloom!" -> "sugar-skull-bloom"
const folderName = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "misc";

// Saves the photos and returns their public URLs in the same order
export async function savePhotos(files, folder) {
  const s3 = bucket(), urls = [];
  if (!s3 && !process.env.TEST_SITE) throw new Error("Photo uploads need the AWS keys in Render");
  for (const f of files) {
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.${TYPES[f.mimetype]}`;
    if (s3) {
      const key = `uploads/${folderName(folder)}/${name}`;
      await s3.client.send(new PutObjectCommand({ Bucket: s3.name, Key: key, Body: f.buffer, ContentType: f.mimetype, CacheControl: "public, max-age=31536000" }));
      urls.push(`https://${s3.name}.s3.${s3.region}.amazonaws.com/${key}`);
    } else {
      await fs.mkdir(LOCAL_DIR, { recursive: true });
      await fs.writeFile(path.join(LOCAL_DIR, name), f.buffer);
      urls.push(`/new-images/uploads/${name}`);
    }
  }
  return urls;
}
