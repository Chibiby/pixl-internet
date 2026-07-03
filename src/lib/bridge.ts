import "server-only";

export type BridgeAction = "enable" | "disable";

export interface BridgeResult {
  ok: boolean;
  stubbed: boolean;
  message: string;
}

/**
 * Forwards a PPPoE enable/disable request to the MikroTik bridge service
 * (BRIDGE_URL on the AWS VPS). The bridge isn't built yet, so when BRIDGE_URL
 * is unset this is a no-op stub that logs and reports success — ready to wire
 * up later without touching callers.
 */
export async function togglePppoe(
  pppoeUser: string,
  action: BridgeAction,
): Promise<BridgeResult> {
  const bridgeUrl = process.env.BRIDGE_URL;

  if (!bridgeUrl) {
    console.info(`[bridge stub] ${action} PPPoE user "${pppoeUser}" (BRIDGE_URL not set)`);
    return {
      ok: true,
      stubbed: true,
      message: `Stub: would ${action} ${pppoeUser} (BRIDGE_URL not configured)`,
    };
  }

  try {
    const res = await fetch(`${bridgeUrl.replace(/\/$/, "")}/pppoe/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.BRIDGE_API_KEY
          ? { Authorization: `Bearer ${process.env.BRIDGE_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({ pppoeUser, action }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, stubbed: false, message: `Bridge error ${res.status}: ${text}` };
    }
    return { ok: true, stubbed: false, message: `Bridge ${action}d ${pppoeUser}` };
  } catch (err) {
    return {
      ok: false,
      stubbed: false,
      message: `Bridge unreachable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
