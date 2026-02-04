import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

const SQRT_3 = Math.sqrt(3);

export type EncounterHexGridProps = {
  radius: number;
  hexSize?: number;
  strokeWidth?: number;
  sx?: SxProps<Theme>;
  className?: string;
};

type HexGrid = {
  viewBox: string;
  polygons: string[];
};

const buildHexGrid = (radius: number, size: number): HexGrid => {
  const coords: Array<[number, number]> = [];
  const limit = Math.max(0, Math.round(radius));

  for (let q = -limit; q <= limit; q += 1) {
    for (let r = -limit; r <= limit; r += 1) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= limit) {
        coords.push([q, r]);
      }
    }
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const polygons = coords.map(([q, r]) => {
    const x = size * 1.5 * q;
    const y = size * (SQRT_3 * r + SQRT_3 * 0.5 * q);

    minX = Math.min(minX, x - size);
    maxX = Math.max(maxX, x + size);
    minY = Math.min(minY, y - size);
    maxY = Math.max(maxY, y + size);

    const points: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 180) * (60 * i);
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      points.push(`${px.toFixed(2)},${py.toFixed(2)}`);
    }
    return points.join(" ");
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { viewBox: "0 0 0 0", polygons: [] };
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return {
    viewBox: `${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`,
    polygons,
  };
};

export function EncounterHexGrid({
  radius,
  hexSize = 18,
  strokeWidth,
  sx,
  className,
}: EncounterHexGridProps) {
  const grid = buildHexGrid(radius, hexSize);
  const gridStroke = strokeWidth ?? Math.max(0.6, hexSize * 0.12);

  return (
    <Box
      className={className}
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "text.secondary",
        ...sx,
      }}
    >
      <svg
        viewBox={grid.viewBox}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {grid.polygons.map((points, index) => (
          <polygon
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth={gridStroke}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </Box>
  );
}
