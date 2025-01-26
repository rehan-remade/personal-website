'use client';

import katex from 'katex';
import 'katex/dist/katex.min.css';

interface KatexSpanProps {
  text: string;
  inline?: boolean;
  className?: string;
}

export default function KatexSpan({ text, inline = false, className = "" }: KatexSpanProps) {
  try {
    const html = katex.renderToString(text, {
      displayMode: !inline,
      throwOnError: false,
    });

    return (
      <span 
        className={`${className} ${inline ? 'inline-block' : 'block overflow-x-auto'}`} 
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (error) {
    console.error('KaTeX error:', error);
    return <span className={className}>{text}</span>;
  }
}