// Reads the color tokens from styles.css for the token tests.
import css from '../styles.css?raw';

export type Tokens = Record<string, string>;

function block(selector: string): Tokens {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No ${selector} block in styles.css`);
  const body = css.slice(start, css.indexOf('}', start));
  const tokens: Tokens = {};
  for (const match of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

export const lightTokens = block(':root');
export const darkTokens = block(":root[data-theme='dark']");
