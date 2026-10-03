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
        res.setHeader('Content-Type', 'application/json');
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
          const { text, voice = 'es-ES-AlvaroNeural', rate = '-18%', pitch = '-8Hz' } = parsed;

          if (!text || typeof text !== 'string' || !text.trim()) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Valid text is required' }));
            return;
          }

          const cleanText = text
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            .replace(/\[\d+\]/g, '')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/[*_~]/g, '')
            .replace(/^\s*[-*+>]\s+/gm, '')
            .trim();

          if (!cleanText) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Cleaned text is empty' }));
            return;
          }

          // Pausas dramáticas existenciales:
          // - Puntos suspensivos: '... <break time="800ms"/>'
          // - Puntos seguidos y aparte: '. <break time="650ms"/>'
          // - Comas: ', <break time="320ms"/>'
          const textWithBreaks = cleanText
            .replace(/\.{3}|…/g, '... <break time="800ms"/>')
            .replace(/\.([\s\n]+|$)/g, '. <break time="650ms"/>$1')
            .replace(/,([\s\n]+|$)/g, ', <break time="320ms"/>$1');

          // SSML completo para Microsoft Edge TTS (estilo existencial sombrío)
          const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="es-ES">
  <voice name="${voice}">
    <mstts:express-as style="sad">
      <prosody rate="${rate}" pitch="${pitch}">
        ${textWithBreaks}
      </prosody>
    </mstts:express-as>
  </voice>
</speak>`;

          // Alternativa con pausas espaciadas si el endpoint rechaza etiquetas SSML directas
          const spacedText = cleanText
            .replace(/\.{3}|…/g, '... \n\n ')
            .replace(/\.([\s\n]+|$)/g, '.\n\n$1')
            .replace(/,([\s\n]+|$)/g, ',  $1');

          const streamPromise = new Promise(async (resolve, reject) => {
            const timer = setTimeout(() => {
              reject(new Error('Edge-TTS stream timeout'));
            }, 12000);

            try {
              let tts = new MsEdgeTTS();
              await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

              // Intento 1: Formato SSML completo
              try {
                const { audioStream } = tts.rawToStream(ssml);
                const chunks = [];
                for await (const chunk of audioStream) {
                  chunks.push(chunk);
                }
                clearTimeout(timer);
                return resolve(Buffer.concat(chunks));
              } catch (ssmlErr) {
                // Fallback con pausas espaciadas, rate -18% y pitch -8Hz
                tts = new MsEdgeTTS();
                await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
                const { audioStream } = tts.toStream(spacedText, { rate, pitch });
                const chunks = [];
                for await (const chunk of audioStream) {
                  chunks.push(chunk);
                }
                clearTimeout(timer);
                return resolve(Buffer.concat(chunks));
              }
            } catch (err) {
              clearTimeout(timer);
              reject(err);
            }
          });

          const buffer = await streamPromise;

          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(buffer);
        } catch (err) {
          console.error('[Vite Dev TTS Error]:', err.message);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Error generating neural audio', fallback: true }));
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
