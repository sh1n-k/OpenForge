import { apiFetch } from "./client";
import type { UniverseMarketScope } from "./types/common";
import type {
  SymbolCollectResponse,
  SymbolMasterStatusResponse,
  SymbolSearchResponse,
  UniverseDetail,
  UniverseSummary,
  UniverseSymbol,
} from "./types/universe";

export async function loadUniverses() {
  return apiFetch<UniverseSummary[]>("/api/v1/universes");
}

export async function loadUniverse(universeId: string) {
  return apiFetch<UniverseDetail>(`/api/v1/universes/${universeId}`);
}

export async function createUniverse(input: {
  name: string;
  description?: string;
  marketScope: UniverseMarketScope;
}) {
  return apiFetch<UniverseDetail>("/api/v1/universes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUniverse(
  universeId: string,
  input: { name?: string; description?: string },
) {
  return apiFetch<UniverseDetail>(`/api/v1/universes/${universeId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function replaceUniverseSymbols(
  universeId: string,
  symbols: UniverseSymbol[],
) {
  return apiFetch<UniverseDetail>(
    `/api/v1/universes/${universeId}/symbols`,
    {
      method: "PUT",
      body: JSON.stringify({ symbols }),
    },
  );
}

export async function archiveUniverse(universeId: string) {
  return apiFetch<void>(`/api/v1/universes/${universeId}`, {
    method: "DELETE",
  });
}

export async function searchSymbols(
  q: string,
  marketScope: UniverseMarketScope,
  exchange?: string,
  limit = 20,
) {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("marketScope", marketScope);
  if (exchange) params.set("exchange", exchange);
  params.set("limit", String(limit));
  return apiFetch<SymbolSearchResponse>(`/api/v1/symbols/search?${params}`);
}

export async function collectSymbols(marketScope: UniverseMarketScope) {
  const params = new URLSearchParams();
  params.set("marketScope", marketScope);
  return apiFetch<SymbolCollectResponse>(
    `/api/v1/symbols/collect?${params}`,
    {
      method: "POST",
    },
  );
}

export async function loadSymbolMasterStatus() {
  return apiFetch<SymbolMasterStatusResponse>("/api/v1/symbols/status");
}
