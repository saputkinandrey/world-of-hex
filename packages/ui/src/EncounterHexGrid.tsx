"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    speed?: number | null;
};

export type EncounterHexGridMarkerAnchor = {
    left: number;
    top: number;
};

export type EncounterHexGridMarkerPlacement = {
    x: number;
    y: number;
    direction?: string;
};

export type EncounterHexGridPath = {
    id: string;
    points: EncounterGridPoint[];
    stroke?: string;
    fill?: string;
    lineOpacity?: number;
    pointOpacity?: number;
    dashed?: boolean;
};

export type EncounterHexGridHighlight = {
    id: string;
    x: number;
    y: number;
    label?: string;
    title?: string;
    fill?: string;
    stroke?: string;
    textColor?: string;
    radiusScale?: number;
};

export type EncounterHexGridProps = {
    radius: number;
    hexSize?: number;
    strokeWidth?: number;
    center?: EncounterGridPoint;
    markers?: EncounterHexGridMarker[];
    paths?: EncounterHexGridPath[];
    highlights?: EncounterHexGridHighlight[];
    selectedMarkerId?: string | null;
    onMarkerClick?: (
        marker: EncounterHexGridMarker,
        anchor: EncounterHexGridMarkerAnchor,
    ) => void;
    onMarkerDrop?: (
        marker: EncounterHexGridMarker,
        placement: EncounterHexGridMarkerPlacement,
    ) => void;
    onMarkerDragStateChange?: (isDragging: boolean) => void;
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

const DIRECTION_ORDER = ["N", "NE", "SE", "S", "SW", "NW"] as const;

type DragState = {
    markerId: string;
    placement: EncounterHexGridMarkerPlacement;
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

const normalizeDirection = (direction?: string) => {
    const key = direction?.trim().toUpperCase();

    return DIRECTION_ORDER.includes(key as (typeof DIRECTION_ORDER)[number])
        ? key
        : undefined;
};

const rotateDirection = (direction: string | undefined, step: number) => {
    const normalized = normalizeDirection(direction) ?? "N";
    const index = DIRECTION_ORDER.indexOf(
        normalized as (typeof DIRECTION_ORDER)[number],
    );
    const nextIndex =
        (index + step + DIRECTION_ORDER.length) % DIRECTION_ORDER.length;

    return DIRECTION_ORDER[nextIndex];
};

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

const toCube = (point: EncounterGridPoint) => {
    const x = point.x;
    const z = point.y - (point.x - (isOdd(point.x) ? 1 : 0)) / 2;
    const y = -x - z;

    return { x, y, z };
};

const distanceBetweenPoints = (
    left: EncounterGridPoint,
    right: EncounterGridPoint,
) => {
    const leftCube = toCube(left);
    const rightCube = toCube(right);

    return Math.max(
        Math.abs(leftCube.x - rightCube.x),
        Math.abs(leftCube.y - rightCube.y),
        Math.abs(leftCube.z - rightCube.z),
    );
};

const buildEncounterPoints = (center: EncounterGridPoint, radius: number) => {
    const points: EncounterGridPoint[] = [];

    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
        for (let y = center.y - radius; y <= center.y + radius; y += 1) {
            const point = { x, y };
            if (distanceBetweenPoints(point, center) <= radius) {
                points.push(point);
            }
        }
    }

    return points;
};

const parseViewBox = (viewBox: string) => {
    const [minX, minY, width, height] = viewBox.split(/\s+/).map(Number);

    return { minX, minY, width, height };
};

export function EncounterHexGrid({
    radius,
    hexSize = 18,
    strokeWidth,
    center = { x: 0, y: 0 },
    markers = [],
    paths = [],
    highlights = [],
    selectedMarkerId,
    onMarkerClick,
    onMarkerDrop,
    onMarkerDragStateChange,
    sx,
    className,
}: EncounterHexGridProps) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const grid = buildHexGrid(radius, hexSize);
    const candidatePoints = useMemo(
        () => buildEncounterPoints(center, radius),
        [center, radius],
    );
    const markersById = useMemo(
        () => new Map(markers.map((marker) => [marker.id, marker])),
        [markers],
    );
    const [dragState, setDragState] = useState<DragState | null>(null);
    const dragStateRef = useRef<DragState | null>(null);
    const gridStroke = strokeWidth ?? Math.max(0.6, hexSize * 0.12);
    const markerRadius = Math.max(5, hexSize * 0.42);
    const badgeFontSize = Math.max(6, hexSize * 0.38);
    const labelFontSize = Math.max(7, hexSize * 0.33);
    const arrowStrokeWidth = Math.max(1.4, hexSize * 0.1);
    const arrowHeadLength = Math.max(4, hexSize * 0.28);
    const arrowHeadWidth = Math.max(4, hexSize * 0.26);
    const arrowStartDistance = markerRadius * 0.75;
    const arrowTipDistance = Math.max(markerRadius + 4, hexSize * 0.92);
    const pathStrokeWidth = Math.max(1.2, hexSize * 0.12);
    const pathPointRadius = Math.max(1.5, hexSize * 0.13);
    const pathFinalPointRadius = Math.max(3.2, hexSize * 0.22);
    const highlightRadius = Math.max(6, hexSize * 0.38);
    const highlightFontSize = Math.max(7, hexSize * 0.34);
    const renderedMarkers = dragState
        ? markers.map((marker) =>
              marker.id === dragState.markerId
                  ? {
                        ...marker,
                        x: dragState.placement.x,
                        y: dragState.placement.y,
                        direction: dragState.placement.direction,
                    }
                  : marker,
          )
        : markers;

    useEffect(() => {
        dragStateRef.current = dragState;
    }, [dragState]);

    useEffect(() => {
        onMarkerDragStateChange?.(Boolean(dragState));

        return () => {
            onMarkerDragStateChange?.(false);
        };
    }, [dragState, onMarkerDragStateChange]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root || !onMarkerDrop) {
            return undefined;
        }

        const handleWheel = (event: WheelEvent) => {
            if (!dragStateRef.current) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            setDragState((current) =>
                current
                    ? {
                          ...current,
                          placement: {
                              ...current.placement,
                              direction: rotateDirection(
                                  current.placement.direction,
                                  event.deltaY > 0 ? 1 : -1,
                              ),
                          },
                      }
                    : current,
            );
        };

        root.addEventListener("wheel", handleWheel, {
            passive: false,
            capture: true,
        });

        return () => {
            root.removeEventListener("wheel", handleWheel, true);
        };
    }, [onMarkerDrop]);

    useEffect(() => {
        if (!dragState || !onMarkerDrop) {
            return undefined;
        }

        const viewBox = parseViewBox(grid.viewBox);
        const toSvgPoint = (clientX: number, clientY: number) => {
            const svg = svgRef.current;
            if (!svg) {
                return null;
            }

            const rect = svg.getBoundingClientRect();
            if (!rect.width || !rect.height) {
                return null;
            }

            return {
                x:
                    viewBox.minX +
                    ((clientX - rect.left) / rect.width) * viewBox.width,
                y:
                    viewBox.minY +
                    ((clientY - rect.top) / rect.height) * viewBox.height,
            };
        };

        const findNearestPoint = (
            svgPoint: { x: number; y: number },
        ): EncounterGridPoint | null => {
            let nearestPoint: EncounterGridPoint | null = null;
            let nearestDistance = Number.POSITIVE_INFINITY;

            candidatePoints.forEach((point) => {
                const pixel = toOffsetPixel(point, hexSize, center);
                const dx = pixel.x - svgPoint.x;
                const dy = pixel.y - svgPoint.y;
                const distance = dx * dx + dy * dy;

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPoint = point;
                }
            });

            return nearestPoint;
        };

        const handleMove = (event: MouseEvent) => {
            const svgPoint = toSvgPoint(event.clientX, event.clientY);
            if (!svgPoint) {
                return;
            }

            const nextPoint = findNearestPoint(svgPoint);
            if (!nextPoint) {
                return;
            }

            setDragState((current) =>
                current
                    ? {
                          ...current,
                          placement: {
                              ...current.placement,
                              x: nextPoint.x,
                              y: nextPoint.y,
                          },
                      }
                    : current,
            );
        };

        const handleUp = (event: MouseEvent) => {
            const current = dragStateRef.current;
            dragStateRef.current = null;
            setDragState(null);

            if (!current) {
                return;
            }

            const marker = markersById.get(current.markerId);
            if (!marker) {
                return;
            }

            const changed =
                marker.x !== current.placement.x ||
                marker.y !== current.placement.y ||
                normalizeDirection(marker.direction) !==
                    normalizeDirection(current.placement.direction);

            if (changed) {
                onMarkerDrop(marker, current.placement);
                return;
            }

            if (onMarkerClick) {
                onMarkerClick(marker, {
                    left: event.clientX,
                    top: event.clientY,
                });
            }
        };

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);

        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [
        candidatePoints,
        center,
        dragState,
        grid.viewBox,
        hexSize,
        markersById,
        onMarkerClick,
        onMarkerDrop,
    ]);

    return (
        <Box
            ref={rootRef}
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
                ref={svgRef}
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
                {paths.map((path) => {
                    const projectedPoints = path.points.map((point) =>
                        toOffsetPixel(point, hexSize, center),
                    );
                    const finalPoint = projectedPoints.at(-1) ?? null;
                    const polylinePoints = projectedPoints
                        .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
                        .join(" ");
                    return (
                        <g key={path.id} pointerEvents="none">
                            {projectedPoints.length > 1 ? (
                                <polyline
                                    points={polylinePoints}
                                    fill="none"
                                    stroke={path.stroke ?? "#64748b"}
                                    strokeWidth={pathStrokeWidth}
                                    strokeOpacity={path.lineOpacity ?? 0.65}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray={path.dashed ? "6 6" : undefined}
                                    vectorEffect="non-scaling-stroke"
                                />
                            ) : null}
                            {projectedPoints.map((point, index) => {
                                const isFinalPoint = index === projectedPoints.length - 1;
                                return (
                                    <circle
                                        key={`${path.id}-${index}`}
                                        cx={point.x.toFixed(2)}
                                        cy={point.y.toFixed(2)}
                                        r={isFinalPoint ? pathFinalPointRadius : pathPointRadius}
                                        fill={path.fill ?? path.stroke ?? "#64748b"}
                                        fillOpacity={path.pointOpacity ?? (isFinalPoint ? 0.6 : 0.28)}
                                        stroke={path.stroke ?? "#64748b"}
                                        strokeOpacity={isFinalPoint ? 0.95 : 0.55}
                                        strokeWidth={isFinalPoint ? pathStrokeWidth : Math.max(0.8, pathStrokeWidth * 0.7)}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                );
                            })}
                        </g>
                    );
                })}
                {highlights.map((highlight) => {
                    const point = toOffsetPixel(highlight, hexSize, center);
                    const radiusScale = highlight.radiusScale ?? 1;
                    const radius = highlightRadius * radiusScale;
                    return (
                        <g key={highlight.id} transform={`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`} pointerEvents="none">
                            <title>{highlight.title ?? highlight.label ?? highlight.id}</title>
                            <circle
                                r={radius}
                                fill={highlight.fill ?? "rgba(245, 158, 11, 0.18)"}
                                stroke={highlight.stroke ?? "#f59e0b"}
                                strokeWidth={Math.max(1.2, hexSize * 0.12)}
                                strokeDasharray="4 3"
                                vectorEffect="non-scaling-stroke"
                            />
                            {highlight.label ? (
                                <text
                                    x="0"
                                    y="0"
                                    fill={highlight.textColor ?? "#b45309"}
                                    fontSize={highlightFontSize}
                                    fontWeight="700"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    pointerEvents="none"
                                >
                                    {highlight.label}
                                </text>
                            ) : null}
                        </g>
                    );
                })}
                {renderedMarkers.map((marker) => {
                    const point = toOffsetPixel(marker, hexSize, center);
                    const isSelected =
                        (dragState?.markerId ?? selectedMarkerId) === marker.id;
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
                            role={onMarkerClick ? "button" : undefined}
                            tabIndex={onMarkerClick ? 0 : undefined}
                            style={{
                                cursor: onMarkerClick ? "pointer" : "default",
                            }}
                            onMouseDown={(event) => {
                                if (!onMarkerClick && !onMarkerDrop) {
                                    return;
                                }

                                event.preventDefault();
                                event.stopPropagation();
                                if (event.button !== 0) {
                                    return;
                                }

                                if (!onMarkerDrop) {
                                    return;
                                }

                                setDragState({
                                    markerId: marker.id,
                                    placement: {
                                        x: marker.x,
                                        y: marker.y,
                                        direction: normalizeDirection(
                                            marker.direction,
                                        ),
                                    },
                                });
                            }}
                            onKeyDown={(event) => {
                                if (
                                    !onMarkerClick ||
                                    onMarkerDrop ||
                                    (event.key !== "Enter" &&
                                        event.key !== " ")
                                ) {
                                    return;
                                }
                                event.preventDefault();
                                event.stopPropagation();
                                const rect =
                                    event.currentTarget.getBoundingClientRect();
                                onMarkerClick(marker, {
                                    left: rect.left + rect.width / 2,
                                    top: rect.top + rect.height / 2,
                                });
                            }}
                        >
                            <title>{marker.title ?? marker.label}</title>
                            <circle
                                r={markerRadius}
                                fill={marker.fill ?? "#1d4d8f"}
                                stroke={marker.stroke ?? "#f5f8ff"}
                                strokeWidth={
                                    isSelected
                                        ? Math.max(2.4, hexSize * 0.15)
                                        : Math.max(1.2, hexSize * 0.08)
                                }
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
