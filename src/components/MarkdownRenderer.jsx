import React from 'react';

/**
 * Renderizador de Markdown ligero, seguro y optimizado para respuestas dialécticas
 */
export const MarkdownRenderer = ({ content = '', className = '' }) => {
  if (!content) return null;

  // Función para formatear fragmentos de texto en línea (negritas, cursivas, código inline)
  const renderInline = (text) => {
    // Escapar tags para seguridad básica
    const parts = [];
    // Regex para capturar **negrita**, *cursiva*, `código`
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-semibold text-white">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={match.index} className="italic text-zinc-300">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-[#161b22] border border-[#30363d] font-mono text-xs text-[#58a6ff]"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Separar el texto en bloques (párrafos, listas, citas, encabezados, bloques de código)
  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bloques de código ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="p-3 my-2 rounded-xl bg-[#0d1117] border border-[#21262d] font-mono text-xs text-zinc-200 overflow-x-auto select-text"
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Líneas vacías
    if (!trimmed) {
      elements.push(<div key={`spacer-${i}`} className="h-2" />);
      continue;
    }

    // Encabezados
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-white mt-3 mb-1 font-sans">
          {renderInline(trimmed.substring(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-white mt-3 mb-1.5 font-sans">
          {renderInline(trimmed.substring(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold text-white mt-4 mb-2 font-sans">
          {renderInline(trimmed.substring(2))}
        </h2>
      );
      continue;
    }

    // Cita en bloque (>)
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-[#58a6ff]/60 pl-3 my-2 text-zinc-300 italic text-xs sm:text-sm bg-[#161b22]/40 py-1 rounded-r-lg"
        >
          {renderInline(trimmed.substring(2))}
        </blockquote>
      );
      continue;
    }

    // Listas con viñetas (- o *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 my-1 text-xs sm:text-sm text-zinc-200 pl-1">
          <span className="text-[#58a6ff] text-base leading-none mt-0.5">•</span>
          <span className="flex-1 leading-relaxed">{renderInline(trimmed.substring(2))}</span>
        </div>
      );
      continue;
    }

    // Listas numeradas (ej. 1) o 1.)
    const numMatch = trimmed.match(/^(\d+[\.\)])\s+(.+)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-1.5 text-xs sm:text-sm text-zinc-200 pl-1">
          <span className="font-mono text-[#58a6ff] text-xs font-bold shrink-0 mt-0.5">{numMatch[1]}</span>
          <span className="flex-1 leading-relaxed">{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Párrafo estándar
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm leading-relaxed text-zinc-200 my-1 font-sans">
        {renderInline(line)}
      </p>
    );
  }

  // Cerrar bloque de código si quedó abierto al final
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre
        key="code-unclosed"
        className="p-3 my-2 rounded-xl bg-[#0d1117] border border-[#21262d] font-mono text-xs text-zinc-200 overflow-x-auto select-text"
      >
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    );
  }

  return <div className={`space-y-0.5 select-text ${className}`}>{elements}</div>;
};
