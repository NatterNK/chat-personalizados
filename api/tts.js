import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      text,
      voice = "es-ES-AlvaroNeural",
      rate = "-18%",
      pitch = "-8Hz",
    } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Valid text is required' });
    }

    // Limpieza rigurosa de caracteres y formato Markdown para locución fluida
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
          // Si el endpoint o la librería no admite SSML directo, envía rate="-18%" y pitch="-8Hz" y procesa las pausas con texto espaciado
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
