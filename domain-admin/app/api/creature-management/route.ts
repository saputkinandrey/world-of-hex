import { NextRequest, NextResponse } from "next/server";
import { forwardBackendResponse } from "../../../lib/backend-proxy";

export const GET = async (request: NextRequest): Promise<NextResponse> => {
    return forwardBackendResponse(request, ["creature-management"]);
};
