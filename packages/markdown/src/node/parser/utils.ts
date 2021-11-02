import { htmlEscape, isFunction } from '@vitebook/core/node';
import type Token from 'markdown-it/lib/token';

import type { MarkdownHeader } from '../../shared';

/**
 * Resolve headers from `markdown-it` tokens.
 */
export const resolveHeadersFromTokens = (
  tokens: Token[],
  {
    level,
    allowHtml,
    escapeText,
    slugify,
    format,
  }: {
    level: number[];
    allowHtml: boolean;
    escapeText: boolean;
    slugify: (str: string) => string;
    format?: (str: string) => string;
  },
): MarkdownHeader[] => {
  const headers: MarkdownHeader[] = [];

  // A temp headers stack for generating the headers tree.
  const stack: MarkdownHeader[] = [];

  // Push a header to the headers tree.
  const push = (header: MarkdownHeader): void => {
    while (stack.length !== 0 && header.level <= stack[0].level) {
      stack.shift();
    }

    if (stack.length === 0) {
      headers.push(header);
      stack.push(header);
    } else {
      stack[0].children.push(header);
      stack.unshift(header);
    }
  };

  tokens.forEach((_, idx) => {
    const token = tokens[idx];

    // If the token type does not match, skip.
    if (token?.type !== 'heading_open') {
      return;
    }

    // Get the level from the tag, `h1 -> 1`.
    const headerLevel = Number.parseInt(token.tag.slice(1), 10);

    // If the level should not be extracted, skip.
    if (!level.includes(headerLevel)) {
      return;
    }

    // The next token of 'heading_open' contains the heading content.
    const nextToken = tokens[idx + 1];

    // If the next token does not exist, skip.
    if (!nextToken) {
      return;
    }

    const title = resolveTitleFromToken(nextToken, {
      allowHtml,
      escapeText,
    });

    /**
     * The id of the heading anchor is the slugified result of `markdown-it-anchor` if the id
     * does not exist, we'll slugify the title ourselves.
     */
    const slug = token.attrGet('id') ?? slugify(title);

    // Push the header to tree.
    push({
      level: headerLevel,
      title: isFunction(format) ? format(title) : title,
      slug,
      children: [],
    });
  });

  return headers;
};

/**
 * Resolve header title from `markdown-it` token. Typically using the next token of
 * `heading_open` token.
 */
export const resolveTitleFromToken = (
  token: Token,
  {
    allowHtml,
    escapeText,
  }: {
    allowHtml: boolean;
    escapeText: boolean;
  },
): string => {
  // Children of the token contains the parsed result of the heading title.
  const children = token.children ?? [];

  // Type of tokens to be included in the heading title.
  const titleTokenTypes = ['text', 'emoji', 'code_inline'];

  // Include 'html_inline' or not.
  if (allowHtml) {
    titleTokenTypes.push('html_inline');
  }

  // Filter the token type to be included in the title.
  const titleTokens = children.filter(
    (item) =>
      titleTokenTypes.includes(item.type) &&
      // Filter permalink symbol that generated by `markdown-it-anchor`.
      !item.meta?.isPermalinkSymbol,
  );

  // Get title from tokens.
  return titleTokens
    .reduce((result, item) => {
      if (escapeText) {
        // Escape the content of 'code_inline' and 'text'.
        if (item.type === 'code_inline' || item.type === 'text') {
          return `${result}${htmlEscape(item.content)}`;
        }
      }

      // Keep the content of 'emoji' and 'html_inline'.
      return `${result}${item.content}`;
    }, '')
    .trim();
};

// eslint-disable-next-line no-control-regex
const rControl = /[\u0000-\u001f]/g;
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g;
const rCombining = /[\u0300-\u036F]/g;

export const slugify = (str: string): string =>
  str
    .normalize('NFKD')
    // Remove accents
    .replace(rCombining, '')
    // Remove control characters
    .replace(rControl, '')
    // Replace special characters
    .replace(rSpecial, '-')
    // Remove continuos separators
    .replace(/-{2,}/g, '-')
    // Remove prefixing and trailing separators
    .replace(/^-+|-+$/g, '')
    // Ensure it doesn't start with a number (#121)
    .replace(/^(\d)/, '_$1')
    // Lowercase
    .toLowerCase();

/**
 * Global constants and env variables will be statically replaced by Vite in build mode. This
 * util helps avoid that by inserting escape sequences.
 *
 * @see https://vitejs.dev/guide/env-and-mode.html#production-replacement
 */
export function preventViteConstantsReplacement(
  source: string,
  define?: Record<string, unknown>,
): string {
  source = source
    .replace(/\bimport\.meta/g, 'import.<wbr/>meta')
    .replace(/\bprocess\.env/g, 'process.<wbr/>env');

  // Also avoid replacing defines.
  if (define) {
    const regex = new RegExp(
      `\\b(${Object.keys(define)
        .map((key) => key.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&'))
        .join('|')})`,
      'g',
    );

    source = source.replace(regex, (_) => `${_[0]}<wbr/>${_.slice(1)}`);
  }

  return source;
}
