import { NextRequest, NextResponse } from "next/server";
import { forwardBackendResponse } from "../../../../lib/backend-proxy";

type RouteContext = {
    params: {
        path?: string[];
    };
};

const forward = async (
    request: NextRequest,
    context: RouteContext,
): Promise<NextResponse> => {
    const segments = context.params.path ?? [];
    return forwardBackendResponse(request, [
        "creature-management",
        ...segments,
    ]);
};

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
