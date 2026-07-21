const path = require('path');
const fs   = require('fs');
const { makeAuthenticate } = require('../middleware/authenticate');

// Magic byte signatures for allowed image types (H-6 fix)
function isValidImageBuffer(buf) {
  if (buf.length < 4) return false;
  const [b0, b1, b2, b3] = buf;
  const isPNG  = b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47;
  const isJPEG = b0 === 0xFF && b1 === 0xD8;
  const isGIF  = b0 === 0x47 && b1 === 0x49 && b2 === 0x46;
  const isWEBP = b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46; // RIFF prefix
  return isPNG || isJPEG || isGIF || isWEBP;
}

function registerUploadRoutes(app, { authService }) {
  const authenticate = makeAuthenticate(authService);

  // Uploads root — all file operations must stay within this directory
  const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

  // Ensure uploads/logos directory exists
  const logosDir = path.join(UPLOADS_ROOT, 'logos');
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }

  // POST /api/v1/uploads/logo — Upload enterprise logo
  app.post('/api/v1/uploads/logo', { preHandler: authenticate }, async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'No file provided' });
      }

      // Validate MIME type (header-level check)
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
        });
      }

      // Read full buffer
      const chunks = [];
      for await (const chunk of data.file) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      // Validate file size (5 MB)
      if (buffer.length > 5 * 1024 * 1024) {
        return reply.code(400).send({ error: 'File too large. Maximum size is 5MB.' });
      }

      // H-6: Validate actual file content via magic bytes
      if (!isValidImageBuffer(buffer)) {
        return reply.code(400).send({ error: 'File content does not match an allowed image format.' });
      }

      // Generate unique filename (safe extension from MIME, not from client filename)
      const mimeToExt = {
        'image/jpeg': '.jpg', 'image/jpg': '.jpg',
        'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
      };
      const ext       = mimeToExt[data.mimetype] || '.bin';
      const filename  = `logo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filepath  = path.join(logosDir, filename);

      fs.writeFileSync(filepath, buffer);

      const logoUrl     = `/api/v1/uploads/logos/${filename}`;
      const storagePath = `uploads/logos/${filename}`;

      return reply.code(200).send({
        ok: true,
        message: 'File uploaded successfully',
        data: { filename, logoUrl, storagePath, size: buffer.length, mimetype: data.mimetype },
      });
    } catch (error) {
      request.log.error('Upload error:', error);
      // H-7: never expose error.message to the client
      return reply.code(500).send({ error: 'Failed to upload file' });
    }
  });

  // DELETE /api/v1/uploads/logo — Delete uploaded logo
  app.delete('/api/v1/uploads/logo', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { storagePath } = request.body;

      if (!storagePath) {
        return reply.code(400).send({ error: 'Storage path is required' });
      }

      // C-2 fix: resolve and verify the path stays inside UPLOADS_ROOT
      const filepath = path.resolve(UPLOADS_ROOT, storagePath.replace(/^uploads[/\\]/, ''));
      if (!filepath.startsWith(UPLOADS_ROOT + path.sep)) {
        return reply.code(400).send({ error: 'Invalid storage path' });
      }

      if (!fs.existsSync(filepath)) {
        return reply.code(404).send({ error: 'File not found' });
      }

      fs.unlinkSync(filepath);
      return reply.code(200).send({ ok: true, message: 'File deleted successfully' });
    } catch (error) {
      request.log.error('Delete upload error:', error);
      return reply.code(500).send({ error: 'Failed to delete file' });
    }
  });
}

module.exports = { registerUploadRoutes };
