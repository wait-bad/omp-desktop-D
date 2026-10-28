/* Transpiled from design/ui/markdown.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
const MarkdownContent = ({ text, streaming }) => {
  const html = React.useMemo(() => {
    if (!text) return "";
    if (!window.marked) {
      return "<p>" + text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>") + "</p>";
    }
    try {
      return window.marked.parse(text);
    } catch (_) {
      return "<pre>" + text + "</pre>";
    }
  }, [text]);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `md-content selectable${streaming ? " md-streaming" : ""}`,
      dangerouslySetInnerHTML: { __html: html }
    }
  );
};
Object.assign(window, { MarkdownContent });

})();
