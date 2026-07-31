import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_ORIGIN = "http://localhost:3000";

export const resolveBackendOrigin = (): string => {
    return (
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        DEFAULT_BACKEND_ORIGIN
    ).replace(/\/$/, "");
};

/**
 * Nest uses a global `/api` prefix (see backend main.ts / app.apiPrefix).
 */
export const resolveBackendApiBaseUrl = (): string => {
    const origin = resolveBackendOrigin();
    return origin.endsWith("/api") ? origin : `${origin}/api`;
};

export const buildBackendApiUrl = (
    pathSegments: readonly string[],
    searchParams?: URLSearchParams,
): URL => {
    const path = pathSegments.filter(Boolean).join("/");
    const targetUrl = new URL(`${resolveBackendApiBaseUrl()}/${path}`);
    searchParams?.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });
    return targetUrl;
};

export const forwardBackendResponse = async (
    request: NextRequest,
    pathSegments: readonly string[],
): Promise<NextResponse> => {
    const targetUrl = buildBackendApiUrl(
        pathSegments,
        request.nextUrl.searchParams,
    );

    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) {
        headers.set("content-type", contentType);
    }

    const init: RequestInit = {
        method: request.method,
        headers,
        cache: "no-store",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = await request.text();
    }

    try {
        const response = await fetch(targetUrl, init);
        const text = await response.text();
        return new NextResponse(text, {
            status: response.status,
            headers: {
                "content-type":
                    response.headers.get("content-type") ?? "application/json",
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to reach backend API",
            },
            { status: 502 },
        );
    }
};
