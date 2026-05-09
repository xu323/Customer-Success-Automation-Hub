/**
 * Lightweight inline-SVG sparkline. No charting library, no external assets.
 * Pass an array of numbers; the component renders a smooth polyline with the
 * latest point highlighted.
 */
export function Sparkline({
  values,
  width = 80,
  height = 24,
  stroke = "#0078d4",
  fill = "rgba(0, 120, 212, 0.18)",
  showArea = true,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  showArea?: boolean;
  className?: string;
}) {
  if (!values || values.length === 0) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const polyPoints = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = showArea
    ? `M ${points[0][0]},${height} L ${polyPoints
        .split(" ")
        .map((p) => `L ${p}`)
        .join(" ")
        .slice(2)} L ${points[points.length - 1][0]},${height} Z`
    : "";
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      {showArea && <path d={areaPath} fill={fill} />}
      <polyline
        points={polyPoints}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2} fill={stroke} />
    </svg>
  );
}
