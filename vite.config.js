import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const ttsDevPlugin = () => ({
  name: 'vite-plugin-edge-tts-dev',
  configureServer(server) {
    server.middlewares.use('/api/tts', async (req, res, next) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const { text, voice = 'es-ES-AlvaroNeural', rate = '0%', pitch = '0%' } = parsed;

          if (!text) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Text is required' }));
            return;
          }

          const tts = new MsEdgeTTS();
          await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

          const cleanText = text
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            .replace(/\[\d+\]/g, '')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/[*_~]/g, '')
            .replace(/^\s*[-*+>]\s+/gm, '')
            .trim();

          const { audioStream } = tts.toStream(cleanText, { rate, pitch });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');

          const chunks = [];
          for await (const chunk of audioStream) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          res.end(buffer);
        } catch (err) {
          console.error('[Vite Dev TTS Error]:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ttsDevPlugin(),
  ],
});
