const CSS_IMPORT_REGEX = /@import\s+(?:url\()?['"]?([^'")\s]+\.css[^'")]*?)['"]?\)?/gi;
const HTML_LINK_REGEX = /<link[^>]+href=['"]([^'"]+\.css[^'"]*)['"][^>]*>/gi;

function stripQueryHash(input: string): string {
  const stripped = input.split(/[?#]/)[0];
  return stripped.trim();
}

export function extractCssImportsFromCss(content: string): string[] {
  const imports: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = CSS_IMPORT_REGEX.exec(content))) {
    const target = stripQueryHash(match[1]);
    if (target) imports.push(target);
  }
  return imports;
}

export function extractCssLinksFromHtml(content: string): string[] {
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = HTML_LINK_REGEX.exec(content))) {
    const target = stripQueryHash(match[1]);
    if (target) links.push(target);
  }
  return links;
}

export function normalizeCssHref(href: string): string {
  return stripQueryHash(href);
}
