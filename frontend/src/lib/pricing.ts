// Per-tool price lookup, sourced from the operator's pricing model.
//
// `check_price` cannot quote a published DYNAMIC tool — it answers
// "Unknown tool_id: list_capabilities" for the whole factory read vocabulary.
// The pricing model (get_pricing_model, a FREE read) DOES list every published
// tool with its price_sats, so we derive the metered-read price from there and
// cache it for the session. One free fetch prices every register.

import { getPricingModel, type PricedTool } from "./mcp";

let cache: Map<string, number> | null = null;
let inflight: Promise<Map<string, number>> | null = null;

function toolNames(t: PricedTool): string[] {
  return [t.tool_name, t.name, t.tool_id].filter((s): s is string => typeof s === "string");
}

async function loadPrices(): Promise<Map<string, number>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const m = new Map<string, number>();
    try {
      const pm = await getPricingModel();
      for (const t of pm.tools ?? []) {
        if (typeof t.price_sats !== "number") continue;
        for (const n of toolNames(t)) m.set(n, t.price_sats);
      }
    } catch {
      /* leave the map empty — callers treat a miss as "price unknown" */
    }
    cache = m;
    inflight = null;
    return m;
  })();
  return inflight;
}

/// The price in sats for a graph read tool key (e.g. "context_pack"), matched
/// against the pricing model by full name (`cypher_<key>`), bare key, or suffix.
/// Returns null when the model doesn't list it (shown as "price unknown").
export async function priceForTool(toolId: string): Promise<number | null> {
  const m = await loadPrices();
  if (m.has(`cypher_${toolId}`)) return m.get(`cypher_${toolId}`)!;
  if (m.has(toolId)) return m.get(toolId)!;
  for (const [name, price] of m) if (name.endsWith(toolId)) return price;
  return null;
}

/// Drop the cached prices so the next lookup re-reads the model (after a
/// Pricing Studio change, say).
export function invalidatePriceCache(): void {
  cache = null;
}
