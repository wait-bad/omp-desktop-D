/**
 * test-marked-katex-unit.js
 * Verification test suite for offline KaTeX integration in marked.js.
 */
const marked = require('./src/marked.min.js');
const katex = require('./src/katex.min.js');
globalThis.katex = katex;
const { createMarkedKatexExtension } = require('./src/marked-katex.js');

// 1. Install extension
marked.use(createMarkedKatexExtension());

// 2. Wire code blocks for ```math / ```latex
marked.use({
  renderer: {
    code(text, lang) {
      const language = (lang ?? '').split(/\s/)[0].toLowerCase();
      if (language === 'math' || language === 'latex' || language === 'katex') {
        try {
          return katex.renderToString(text.trim(), {
            displayMode: true,
            throwOnError: false,
            output: 'htmlAndMathml'
          }) + '\n';
        } catch (_) {}
      }
      return false;
    }
  }
});

const testCases = [
  { name: 'Inline dollar formula', input: 'Energy formula is $E = mc^2$ in physics.', expectKatexCount: 1 },
  { name: 'Single-char math identifier', input: 'Given variables $x$ and $y$.', expectKatexCount: 2 },
  { name: 'Multiple formulas in one paragraph', input: 'Let $x$ be an integer, $y$ be a real number, and $z = x + y$. Then $E = mc^2$ and $a^2 + b^2 = c^2$.', expectKatexCount: 5 },
  { name: 'Currency protection ($50 and $100)', input: 'I bought this for $50 and that for $100.', expectKatexCount: 0 },
  { name: 'Inline parentheses \\(...\\)', input: 'The theorem \\(a^2 + b^2 = c^2\\) is proven.', expectKatexCount: 1 },
  { name: 'Block double dollar single line', input: '$$E = mc^2$$', expectKatexCount: 1, expectDisplay: true },
  { name: 'Block double dollar multiline', input: '$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n$$', expectKatexCount: 1, expectDisplay: true },
  { name: 'Block brackets \\[...\\]', input: '\\[\n\\sum_{n=1}^\\infty \\frac{1}{n^2} = \\frac{\\pi^2}{6}\n\\]', expectKatexCount: 1, expectDisplay: true },
  { name: 'Chinese context with LaTeX macro', input: '这是一个著名的公式：$\\alpha + \\beta = 1$ 对吧？', expectKatexCount: 1 },
  { name: 'Chinese inline fractions', input: '已知函数 $f(x) = \\frac{1}{x+1}$，求其导数。', expectKatexCount: 1 },
  { name: 'Inline double dollar inside paragraph', input: 'Equation $$x = y$$ embedded here.', expectKatexCount: 1, expectDisplay: true },
  { name: 'Code block ```math fenced', input: '```math\n\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1\n```', expectKatexCount: 1, expectDisplay: true },
  { name: 'Unclosed dollar during streaming', input: 'Streaming response: $E = mc^2 without close', expectKatexCount: 0 }
];

let failed = 0;
for (const tc of testCases) {
  const output = marked.parse(tc.input);
  const katexMatches = output.match(/class="katex"/g);
  const count = katexMatches ? katexMatches.length : 0;
  const hasDisplay = output.includes('katex-display');

  if (count !== tc.expectKatexCount) {
    console.error(`[FAIL] ${tc.name}: expected ${tc.expectKatexCount} KaTeX instance(s), got ${count}.\nOutput: ${output}`);
    failed++;
  } else if (tc.expectDisplay && !hasDisplay) {
    console.error(`[FAIL] ${tc.name}: expected display mode math, got: ${output}`);
    failed++;
  } else {
    console.log(`[PASS] ${tc.name} (found ${count} katex instances)`);
  }
}

if (failed === 0) {
  console.log(`\nAll ${testCases.length} tests passed successfully!`);
} else {
  console.error(`\n${failed} tests failed!`);
  process.exit(1);
}
