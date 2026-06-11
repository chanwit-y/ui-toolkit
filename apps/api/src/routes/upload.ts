import { Hono } from 'hono';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const BLOCKED_TYPES = new Set([
  'application/x-msdownload',
  'application/x-executable',
]);

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
};

function uniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return `${name}-${suffix}${ext}`;
}

async function saveFile(file: File) {
  if (BLOCKED_TYPES.has(file.type)) {
    throw new Error('This file type is not allowed.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)} MB limit.`);
  }

  const filename = uniqueFilename(file.name);
  const filePath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return {
    filename,
    originalName: file.name,
    mimetype: file.type,
    size: file.size,
    url: `/uploads/${filename}`,
    path: filePath,
  };
}

export const uploadRoutes = new Hono();

uploadRoutes.post('/upload/single', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['image'] || body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, message: 'No file uploaded' }, 400);
    }

    const saved = await saveFile(file);

    return c.json({
      success: true,
      message: 'File uploaded successfully',
      data: saved,
    });
  } catch (err: any) {
    return c.json({
      success: false,
      message: err.message || 'File upload failed',
    }, 400);
  }
});

uploadRoutes.post('/upload/multiple', async (c) => {
  try {
    const body = await c.req.parseBody({ all: true });
    const rawFiles = body['images'] || body['files'];

    const files = Array.isArray(rawFiles) ? rawFiles : rawFiles ? [rawFiles] : [];
    const validFiles = files.filter((f): f is File => f instanceof File);

    if (validFiles.length === 0) {
      return c.json({ success: false, message: 'No files uploaded' }, 400);
    }

    const saved = await Promise.all(validFiles.map(saveFile));

    return c.json({
      success: true,
      message: `${saved.length} files uploaded successfully`,
      data: saved,
    });
  } catch (err: any) {
    return c.json({
      success: false,
      message: err.message || 'Files upload failed',
    }, 400);
  }
});

uploadRoutes.delete('/upload/:filename', async (c) => {
  const filename = c.req.param('filename');

  if (!filename) {
    return c.json({ success: false, message: 'Filename is required' }, 400);
  }

  const filePath = path.join(uploadsDir, filename);

  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    return c.json({ success: true, message: 'File deleted successfully', data: { filename } });
  } catch {
    return c.json({ success: false, message: 'File not found or could not be deleted' }, 404);
  }
});

uploadRoutes.get('/uploads/:filename', async (c) => {
  const filename = c.req.param('filename');

  if (!filename) {
    return c.json({ success: false, message: 'Filename is required' }, 400);
  }

  const filePath = path.join(uploadsDir, filename);

  try {
    await fs.access(filePath);
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';

    c.header('Content-Type', mimeType);
    c.header('Content-Length', fileBuffer.length.toString());
    return c.body(fileBuffer);
  } catch {
    return c.json({ success: false, message: 'File not found' }, 404);
  }
});
