import type { MarketType, UniverseMarketScope } from "./common";

export type UniverseReference = {
  id: string;
  name: string;
  description: string | null;
  marketScope: UniverseMarketScope;
};

export type UniverseSummary = {
  id: string;
  name: string;
  description: string | null;
  marketScope: UniverseMarketScope;
  symbolCount: number;
  strategyCount: number;
  updatedAt: string;
};

export type UniverseSymbol = {
  symbol: string;
  market: MarketType;
  exchange: string;
  displayName: string;
  sortOrder: number;
};

export type UniverseDetail = {
  id: string;
  name: string;
  description: string | null;
  marketScope: UniverseMarketScope;
  symbolCount: number;
  strategyCount: number;
  symbols: UniverseSymbol[];
  createdAt: string;
  updatedAt: string;
};

export type SymbolSearchItem = {
  code: string;
  name: string;
  exchange: string;
  marketScope: UniverseMarketScope;
};

export type SymbolSearchResponse = {
  query: string;
  total: number;
  items: SymbolSearchItem[];
};

export type SymbolMasterMarketStatus = {
  marketScope: UniverseMarketScope;
  totalCount: number;
  collectedAt: string | null;
  needsUpdate: boolean;
  exchangeCounts: { exchange: string; count: number }[];
};

export type SymbolMasterStatusResponse = {
  markets: SymbolMasterMarketStatus[];
  totalCount?: number;
  collectedAt?: string | null;
  needsUpdate?: boolean;
  kospiCount?: number;
  kosdaqCount?: number;
};

export type SymbolCollectResponse = {
  marketScope: UniverseMarketScope;
  success: boolean;
  totalCount: number;
  exchangeCounts: { exchange: string; count: number }[];
  errors: string[];
};
