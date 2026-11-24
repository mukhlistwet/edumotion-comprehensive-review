import katex from 'katex';

/**
 * Safely renders mixed text and inline/display LaTeX delimited by \( ... \) or $$ ... $$.
 * Non-math segments are rendered strictly as React text nodes (no raw HTML injection).
 */
export function FormulaBlock({ content = '', blockLatex = '', className = '' }) {
  if (blockLatex) {
    const html = katex.renderToString(String(blockLatex), {
      displayMode: true,
      throwOnError: false,
      strict: false,
      trust: false
    });
    return (
      <div
        className={`overflow-x-auto py-2 text-center ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const text = String(content || '');
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\))/g);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const latex = part.slice(2, -2);
          const html = katex.renderToString(latex, {
            displayMode: true,
            throwOnError: false,
            strict: false,
            trust: false
          });
          return (
            <span
              key={idx}
              className="my-2 block overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        if (part.startsWith('\\(') && part.endsWith('\\)')) {
          const latex = part.slice(2, -2);
          const html = katex.renderToString(latex, {
            displayMode: false,
            throwOnError: false,
            strict: false,
            trust: false
          });
          return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}
