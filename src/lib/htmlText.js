// client/src/lib/htmlText.js

/**
 * Converts HTML (such as rich-text card descriptions) into clean plain text
 * with all named and numeric HTML entities (&amp;, &lt;, &gt;, &quot;, &#39;, &nbsp;, &rarr;, etc.)
 * properly decoded.
 */
export function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') return '';
  if (html === '<p></p>' || html === '<p><br></p>') return '';

  // Add spaces at block boundaries so adjacent paragraphs/list items do not run together
  const spaced = html
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ');

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(spaced, 'text/html');
    return (doc.body?.textContent || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Fallback for non-DOM environments
  return spaced
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}
