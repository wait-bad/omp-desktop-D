/* Transpiled from design/ui/sparks.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
const { TOOL_META: _SP_TOOL_META } = window;
const Sparkline = ({ values, width = 80, height = 18, color = "var(--accent)", glow = true }) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const stepX = width / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => [i * stepX, height - (v - min) / range * (height - 2) - 1]);
  const d = pts.map((p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`).join(" ");
  const fill = `${d} L ${width} ${height} L 0 ${height} Z`;
  return /* @__PURE__ */ React.createElement("svg", { width, height, style: { display: "block", overflow: "visible" } }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "spark-grad", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: color, stopOpacity: "0.35" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: color, stopOpacity: "0" }))), /* @__PURE__ */ React.createElement("path", { d: fill, fill: "url(#spark-grad)" }), /* @__PURE__ */ React.createElement(
    "path",
    {
      d,
      stroke: color,
      strokeWidth: "1.25",
      fill: "none",
      style: { filter: glow ? `drop-shadow(0 0 4px ${color})` : "none" }
    }
  ));
};
const TokenGauge = ({ used, total, pct, label, sub }) => {
  const r = 22;
  const C = 2 * Math.PI * r;
  const dash = Math.min(pct, 100) / 100 * C;
  const tone = pct > 80 ? "var(--rose)" : pct > 60 ? "var(--amber)" : "var(--accent)";
  return /* @__PURE__ */ React.createElement("div", { className: "token-gauge" }, /* @__PURE__ */ React.createElement("svg", { width: "56", height: "56", viewBox: "0 0 56 56" }, /* @__PURE__ */ React.createElement("circle", { cx: "28", cy: "28", r, stroke: "var(--line)", strokeWidth: "3", fill: "none" }), /* @__PURE__ */ React.createElement(
    "circle",
    {
      cx: "28",
      cy: "28",
      r,
      stroke: tone,
      strokeWidth: "3",
      strokeLinecap: "round",
      fill: "none",
      strokeDasharray: `${dash} ${C}`,
      transform: "rotate(-90 28 28)",
      style: { filter: `drop-shadow(0 0 4px ${tone})`, transition: "stroke-dasharray 600ms var(--ease-out)" }
    }
  ), /* @__PURE__ */ React.createElement("text", { x: "28", y: "31", textAnchor: "middle", fontSize: "11", fontFamily: "var(--font-mono)", fill: "var(--fg)" }, (+pct).toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "var(--d-text-sm)", color: "var(--fg-2)", fontFamily: "var(--font-mono)" } }, label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "var(--d-text-xs)", color: "var(--fg-4)" } }, sub)));
};
const ActivityRadar = ({ activity, tps }) => {
  const cells = Array.from({ length: 60 }, (_, i) => activity.find((a) => a.t === i));
  return /* @__PURE__ */ React.createElement("div", { className: "radar" }, /* @__PURE__ */ React.createElement("div", { className: "radar-row" }, cells.map((c, i) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: i,
      className: `radar-cell ${c ? "on" : ""}`,
      style: {
        background: c ? _SP_TOOL_META[c.k]?.color : "transparent",
        animationDelay: `${i * 30}ms`
      },
      title: c ? `t-${60 - i}s \xB7 ${c.k}` : ""
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "radar-foot" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-3)" } }, "\u221260s"), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--accent)" } }, tps, " t/s"), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-3)" } }, "now")));
};
Object.assign(window, { Sparkline, TokenGauge, ActivityRadar });

})();
