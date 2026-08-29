import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice = "es-ES-AlvaroNeural", rate = "0%", pitch = "0%" } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Valid text is required' });
    }

    // Limpieza de caracteres y formato Markdown para locución limpia
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
      return res.status(400).json({ error: 'Cleaned text is empty' });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const streamPromise = new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Edge-TTS stream timeout'));
      }, 12000);

      try {
        const { audioStream } = tts.toStream(cleanText, { rate, pitch });
        const chunks = [];
        for await (const chunk of audioStream) {
          chunks.push(chunk);
        }
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });

    const buffer = await streamPromise;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Edge-TTS Error:', error);
    return res.status(500).json({
      error: error.message || 'Error al sintetizar voz neuronal',
      fallback: true,
    });
  }
}
