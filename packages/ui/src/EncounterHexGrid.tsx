import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

const SQRT_3 = Math.sqrt(3);
const HALF_SQRT_3 = SQRT_3 / 2;

export type EncounterGridPoint = {
    x: number;
    y: number;
};

export type EncounterHexGridMarker = {
    id: string;
    x: number;
    y: number;
    label: string;
    badge?: string;
    title?: string;
    fill?: string;
    stroke?: string;
    textColor?: string;
    direction?: string;
    arrowColor?: string;
};

export type EncounterHexGridProps = {
    radius: number;
    hexSize?: number;
    strokeWidth?: number;
    center?: EncounterGridPoint;
    markers?: EncounterHexGridMarker[];
    sx?: SxProps<Theme>;
    className?: string;
};

type HexGrid = {
    viewBox: string;
    polygons: string[];
};

type DirectionVector = {
    x: number;
    y: number;
};

const DIRECTION_TO_VECTOR: Record<string, DirectionVector> = {
    N: { x: 0, y: -1 },
    NE: { x: HALF_SQRT_3, y: -0.5 },
    SE: { x: HALF_SQRT_3, y: 0.5 },
    S: { x: 0, y: 1 },
    SW: { x: -HALF_SQRT_3, y: 0.5 },
    NW: { x: -HALF_SQRT_3, y: -0.5 },
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

const isOdd = (value: number) => Math.abs(value % 2) === 1;

const toDirectionVector = (direction?: string) => {
    const key = direction?.trim().toUpperCase();
    if (!key) {
        return null;
    }

    return DIRECTION_TO_VECTOR[key] ?? null;
};

const toOffsetPixel = (
    point: EncounterGridPoint,
    size: number,
    center: EncounterGridPoint,
) => {
    const pointX = size * 1.5 * point.x;
    const pointY = size * SQRT_3 * (point.y + (isOdd(point.x) ? 0.5 : 0));
    const centerX = size * 1.5 * center.x;
    const centerY = size * SQRT_3 * (center.y + (isOdd(center.x) ? 0.5 : 0));

    return {
        x: pointX - centerX,
        y: pointY - centerY,
    };
};

export function EncounterHexGrid({
    radius,
    hexSize = 18,
    strokeWidth,
    center = { x: 0, y: 0 },
    markers = [],
    sx,
    className,
}: EncounterHexGridProps) {
    const grid = buildHexGrid(radius, hexSize);
    const gridStroke = strokeWidth ?? Math.max(0.6, hexSize * 0.12);
    const markerRadius = Math.max(5, hexSize * 0.42);
    const badgeFontSize = Math.max(6, hexSize * 0.38);
    const labelFontSize = Math.max(7, hexSize * 0.33);
    const arrowStrokeWidth = Math.max(1.4, hexSize * 0.1);
    const arrowHeadLength = Math.max(4, hexSize * 0.28);
    const arrowHeadWidth = Math.max(4, hexSize * 0.26);
    const arrowStartDistance = markerRadius * 0.75;
    const arrowTipDistance = Math.max(markerRadius + 4, hexSize * 0.92);

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
                {markers.map((marker) => {
                    const point = toOffsetPixel(marker, hexSize, center);
                    const badgeText =
                        marker.badge ??
                        marker.label.trim().slice(0, 2).toUpperCase();
                    const directionVector = toDirectionVector(marker.direction);
                    const arrowColor =
                        marker.arrowColor ?? marker.stroke ?? "#0f172a";
                    const arrow = directionVector
                        ? (() => {
                              const tipX = directionVector.x * arrowTipDistance;
                              const tipY = directionVector.y * arrowTipDistance;
                              const shaftEndX =
                                  tipX - directionVector.x * arrowHeadLength;
                              const shaftEndY =
                                  tipY - directionVector.y * arrowHeadLength;
                              const tailX =
                                  directionVector.x * arrowStartDistance;
                              const tailY =
                                  directionVector.y * arrowStartDistance;
                              const perpendicularX = -directionVector.y;
                              const perpendicularY = directionVector.x;
                              const leftX =
                                  shaftEndX +
                                  perpendicularX * (arrowHeadWidth / 2);
                              const leftY =
                                  shaftEndY +
                                  perpendicularY * (arrowHeadWidth / 2);
                              const rightX =
                                  shaftEndX -
                                  perpendicularX * (arrowHeadWidth / 2);
                              const rightY =
                                  shaftEndY -
                                  perpendicularY * (arrowHeadWidth / 2);

                              return {
                                  shaft: `${tailX.toFixed(2)},${tailY.toFixed(
                                      2,
                                  )} ${shaftEndX.toFixed(2)},${shaftEndY.toFixed(
                                      2,
                                  )}`,
                                  head: `${tipX.toFixed(2)},${tipY.toFixed(
                                      2,
                                  )} ${leftX.toFixed(2)},${leftY.toFixed(
                                      2,
                                  )} ${rightX.toFixed(2)},${rightY.toFixed(2)}`,
                              };
                          })()
                        : null;

                    return (
                        <g
                            key={marker.id}
                            transform={`translate(${point.x.toFixed(2)} ${point.y.toFixed(
                                2,
                            )})`}
                        >
                            <title>{marker.title ?? marker.label}</title>
                            <circle
                                r={markerRadius}
                                fill={marker.fill ?? "#1d4d8f"}
                                stroke={marker.stroke ?? "#f5f8ff"}
                                strokeWidth={Math.max(1.2, hexSize * 0.08)}
                                vectorEffect="non-scaling-stroke"
                            />
                            {arrow ? (
                                <>
                                    <polyline
                                        points={arrow.shaft}
                                        fill="none"
                                        stroke={arrowColor}
                                        strokeWidth={arrowStrokeWidth}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                    <polygon
                                        points={arrow.head}
                                        fill={arrowColor}
                                    />
                                </>
                            ) : null}
                            <text
                                x="0"
                                y="0"
                                fill={marker.textColor ?? "#ffffff"}
                                fontSize={badgeFontSize}
                                fontWeight="700"
                                textAnchor="middle"
                                dominantBaseline="central"
                                pointerEvents="none"
                            >
                                {badgeText}
                            </text>
                            <text
                                x={markerRadius + 4}
                                y="0"
                                fill="currentColor"
                                fontSize={labelFontSize}
                                fontWeight="600"
                                dominantBaseline="central"
                                stroke="rgba(255,255,255,0.75)"
                                strokeWidth={Math.max(1.6, hexSize * 0.09)}
                                paintOrder="stroke"
                                pointerEvents="none"
                            >
                                {marker.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </Box>
    );
}
