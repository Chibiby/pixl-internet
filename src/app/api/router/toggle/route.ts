import { NextResponse } from "next/server";
import { getSessionInfo } from "@/lib/auth";
import { togglePppoe, type BridgeAction } from "@/lib/bridge";

/**
 * POST /api/router/toggle  { pppoeUser: string, action: "enable" | "disable" }
 *
 * Admin-only. Forwards to the MikroTik bridge on the AWS VPS (BRIDGE_URL).
 * The bridge isn't built yet — without BRIDGE_URL this is a logged no-op stub,
 * so callers can be wired up now and work unchanged later.
 */
export async function POST(request: Request) {
  const { role } = await getSessionInfo();
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const pppoeUser = body?.pppoeUser as string | undefined;
  const action = body?.action as BridgeAction | undefined;

  if (!pppoeUser || (action !== "enable" && action !== "disable")) {
    return NextResponse.json(
      { error: 'Expected { pppoeUser: string, action: "enable" | "disable" }' },
      { status: 400 },
    );
  }

  const result = await togglePppoe(pppoeUser, action);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
