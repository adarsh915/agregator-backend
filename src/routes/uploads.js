const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');
const util = require('util');

const pump = util.promisify(pipeline);

function registerUploadRoutes(app, { authService }) {
  // Middleware to verify authentication
  async function authenticate(request, reply) {
    const authHeader = request.headers.authorization || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!token) {
      return reply.code(401).send({ error: 'Authorization token required' });
    }

    const session = await authService.getSession(token);
    if (!session) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    request.session = session;
  }

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '../../uploads/logos');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // POST /api/v1/uploads/logo - Upload enterprise logo
  app.post('/api/v1/uploads/logo', { preHandler: authenticate }, async (request, reply) => {
    try {
      console.log('📝 POST /api/v1/uploads/logo - Upload request received');

      const data = await request.file();

      if (!data) {
        console.error('❌ No file provided');
        return reply.code(400).send({ error: 'No file provided' });
      }

      // Validate file type (only images)
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        console.error('❌ Invalid file type:', data.mimetype);
        return reply.code(400).send({ 
          error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
        });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      const chunks = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      if (buffer.length > maxSize) {
        console.error('❌ File too large:', buffer.length);
        return reply.code(400).send({ 
          error: 'File too large. Maximum size is 5MB.' 
        });
      }

      // Generate unique filename
      const ext = path.extname(data.filename);
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const filename = `logo_${timestamp}_${randomStr}${ext}`;
      const filepath = path.join(uploadsDir, filename);

      // Save file
      fs.writeFileSync(filepath, buffer);

      const logoUrl = `/api/v1/uploads/logos/${filename}`;
      const storagePath = `uploads/logos/${filename}`;

      console.log('✅ File uploaded successfully:', { filename, size: buffer.length });

      return reply.code(200).send({
        ok: true,
        message: 'File uploaded successfully',
        data: {
          filename,
          logoUrl,
          storagePath,
          size: buffer.length,
          mimetype: data.mimetype
        }
      });
    } catch (error) {
      console.error('💥 Exception in POST /api/v1/uploads/logo:', error);
      request.log.error(error);
      return reply.code(500).send({ 
        error: error.message || 'Failed to upload file' 
      });
    }
  });

  // DELETE /api/v1/uploads/logo - Delete uploaded logo
  app.delete('/api/v1/uploads/logo', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { storagePath } = request.body;

      if (!storagePath) {
        return reply.code(400).send({ error: 'Storage path is required' });
      }

      console.log('📝 DELETE /api/v1/uploads/logo - Delete request:', { storagePath });

      const filepath = path.join(__dirname, '../../', storagePath);

      // Check if file exists
      if (!fs.existsSync(filepath)) {
        console.error('❌ File not found:', filepath);
        return reply.code(404).send({ error: 'File not found' });
      }

      // Delete file
      fs.unlinkSync(filepath);

      console.log('✅ File deleted successfully:', storagePath);

      return reply.code(200).send({
        ok: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('💥 Exception in DELETE /api/v1/uploads/logo:', error);
      request.log.error(error);
      return reply.code(500).send({ 
        error: error.message || 'Failed to delete file' 
      });
    }
  });
}

module.exports = { registerUploadRoutes };
