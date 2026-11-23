/**
 * Render agenda rich text only after allowlist sanitization. Tiptap output is
 * untrusted HTML once it passes through shared storage / documents.
 * No scriptable URL, event attributes, SVG, styling, forms or embeds survive.
 */
const ALLOWED = new Set([
  "P", "BR", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI",
  "BLOCKQUOTE", "H1", "H2", "H3", "H4", "A", "PRE", "CODE",
  "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "HR", "SPAN",
]);
const REMOVE_ENTIRELY = new Set([
  "SCRIPT", "STYLE", "SVG", "MATH", "IFRAME", "OBJECT", "EMBED",
  "FORM", "INPUT", "BUTTON", "LINK", "META", "BASE", "TEMPLATE",
]);
export function sanitizeAgendaHtml(html: string): string {
  if (!html) return "";
  if (typeof DOMParser === "undefined") {
    return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  function clean(node: Node): void {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 8) { node.removeChild(child); continue; }
      if (child.nodeType !== 1) continue;
      const el = child as Element;
      if (REMOVE_ENTIRELY.has(el.tagName)) { el.remove(); continue; }
      if (!ALLOWED.has(el.tagName)) {
        clean(el);
        el.replaceWith(...Array.from(el.childNodes));
        continue;
      }
      const sourceHref = el.tagName === "A" ? el.getAttribute("href") ?? "" : "";
      for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
      if (el.tagName === "A") {
        const uri = sourceHref.trim();
        if (/^(https?:\/\/|mailto:)/i.test(uri)) {
          el.setAttribute("href", uri);
          el.setAttribute("rel", "nofollow noopener noreferrer");
          el.setAttribute("target", "_blank");
        }
      }
      clean(el);
    }
  }
  clean(doc.body);
  return doc.body.innerHTML;
}
