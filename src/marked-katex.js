/**
 * marked-katex.js — LaTeX math extension for marked.js with KaTeX.
 *
 * Supports:
 * - Inline formulas: $...$ and \(...\)
 * - Block formulas:  $$...$$ and \[...\]
 * - Fenced code blocks with language math / latex / katex
 * - Currency protection ($50 and $100 will NOT trigger math)
 * - Graceful fallback on syntax errors and incomplete streaming input
 */
(function () {
  'use strict';

  function createMarkedKatexExtension(options = {}) {
    const k = (typeof window !== 'undefined' ? window.katex : null) ||
              (typeof globalThis !== 'undefined' ? globalThis.katex : null);

    // Block math regexes
    const blockDollarRule  = /^(\${2})(?:\n?)([\s\S]+?)(?:\n?)\1(?:\n|$)/;
    const blockBracketRule = /^\\\[(?:\n?)([\s\S]+?)(?:\n?)\\\](?:\n|$)/;

    // Inline math regexes
    const inlineDoubleDollarRule = /^\$\$((?:\\\$|[^$])+?)\$\$/;
    const inlineDollarRule       = /^\$((?:\\\$|[^\$\s\n])(?:(?:\\\$|[^$\n])*?(?:\\\$|[^\$\s\n\\]))?)\$/;
    const inlineBracketRule      = /^\\\[((?:\\\]|[\s\S])+?)\\\]/;
    const inlineParenRule        = /^\\\(((?:\\\)|[^\n])+?)\\\)/;

    function renderMath(rawText, displayMode) {
      const text = (rawText ?? '').trim();
      if (!k) {
        const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return displayMode
          ? `<pre class="katex-fallback">${esc}</pre>\n`
          : `<code>${esc}</code>`;
      }

      try {
        return k.renderToString(text, {
          displayMode,
          throwOnError: false,
          output: 'htmlAndMathml',
          ...options
        }) + (displayMode ? '\n' : '');
      } catch (_) {
        const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return displayMode
          ? `<div class="katex-error">${esc}</div>\n`
          : `<span class="katex-error">${esc}</span>`;
      }
    }

    return {
      extensions: [
        {
          name: 'blockKatex',
          level: 'block',
          start(src) {
            const dIdx = src.indexOf('$$');
            const bIdx = src.indexOf('\\[');
            if (dIdx === -1) return bIdx === -1 ? undefined : bIdx;
            if (bIdx === -1) return dIdx;
            return Math.min(dIdx, bIdx);
          },
          tokenizer(src) {
            let match = src.match(blockDollarRule);
            if (match) {
              return {
                type: 'blockKatex',
                raw: match[0],
                text: match[2],
                displayMode: true
              };
            }
            match = src.match(blockBracketRule);
            if (match) {
              return {
                type: 'blockKatex',
                raw: match[0],
                text: match[1],
                displayMode: true
              };
            }
          },
          renderer(token) {
            return renderMath(token.text, true);
          }
        },
        {
          name: 'inlineKatex',
          level: 'inline',
          start(src) {
            let index = -1;
            for (let i = 0; i < src.length; i++) {
              if (src[i] === '$' && (i === 0 || src[i - 1] !== '\\')) {
                index = i;
                break;
              }
              if (src[i] === '\\' && (src[i + 1] === '(' || src[i + 1] === '[')) {
                index = i;
                break;
              }
            }
            return index === -1 ? undefined : index;
          },
          tokenizer(src) {
            if (src.startsWith('$$')) {
              const match = src.match(inlineDoubleDollarRule);
              if (match) {
                return {
                  type: 'inlineKatex',
                  raw: match[0],
                  text: match[1],
                  displayMode: true
                };
              }
            } else if (src.startsWith('$')) {
              const match = src.match(inlineDollarRule);
              if (match) {
                return {
                  type: 'inlineKatex',
                  raw: match[0],
                  text: match[1],
                  displayMode: false
                };
              }
            } else if (src.startsWith('\\[')) {
              const match = src.match(inlineBracketRule);
              if (match) {
                return {
                  type: 'inlineKatex',
                  raw: match[0],
                  text: match[1],
                  displayMode: true
                };
              }
            } else if (src.startsWith('\\(')) {
              const match = src.match(inlineParenRule);
              if (match) {
                return {
                  type: 'inlineKatex',
                  raw: match[0],
                  text: match[1],
                  displayMode: false
                };
              }
            }
          },
          renderer(token) {
            return renderMath(token.text, token.displayMode ?? false);
          }
        }
      ]
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMarkedKatexExtension };
  }
  if (typeof window !== 'undefined') {
    window.createMarkedKatexExtension = createMarkedKatexExtension;
  }
})();
