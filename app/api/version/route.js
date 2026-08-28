import { NextResponse } from "next/server";
import { CURRENT_BUILD_INFO } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(CURRENT_BUILD_INFO, {
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
