import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice = "es-ES-AlvaroNeural", rate = "0%", pitch = "0%" } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

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

    const { audioStream } = tts.toStream(cleanText, { rate, pitch });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('TTS Error:', error);
    return res.status(500).json({ error: error.message || 'Error generating neural audio' });
  }
}
