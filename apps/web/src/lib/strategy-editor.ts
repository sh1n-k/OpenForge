import type { StrategyDetail } from "@/lib/api";

export type BuilderIndicatorType =
  | "sma"
  | "ema"
  | "rsi"
  | "macd"
  | "volume_sma"
  | "rolling_high"
  | "rolling_low";

export type BuilderConditionOperator =
  | "greater_than"
  | "less_than"
  | "greater_equal"
  | "less_equal"
  | "cross_above"
  | "cross_below"
  | "equals";

export type BuilderOperandType = "price" | "indicator" | "value";
export type BuilderPriceField = "close" | "open" | "high" | "low" | "volume";
export type BuilderLogic = "AND" | "OR";

export type BuilderIndicatorDefinition = {
  id: BuilderIndicatorType;
  label: string;
  outputs: string[];
  defaultOutput: string;
  defaults: Record<string, number>;
};

export type BuilderMetadata = {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  tags: string[];
};

export type BuilderIndicator = {
  id: string;
  indicatorId: BuilderIndicatorType;
  alias: string;
  output: string;
  params: Record<string, number>;
};

export type BuilderOperand =
  | { type: "price"; field: BuilderPriceField }
  | { type: "indicator"; alias: string; output: string }
  | { type: "value"; value: number };

export type BuilderCondition = {
  id: string;
  left: BuilderOperand;
  operator: BuilderConditionOperator;
  right: BuilderOperand;
};

export type BuilderConditionGroup = {
  logic: BuilderLogic;
  conditions: BuilderCondition[];
};

export type BuilderRiskState = {
  stopLoss: { enabled: boolean; percent: number };
  takeProfit: { enabled: boolean; percent: number };
  trailingStop: { enabled: boolean; percent: number };
};

export type BuilderState = {
  metadata: BuilderMetadata;
  indicators: BuilderIndicator[];
  entry: BuilderConditionGroup;
  exit: BuilderConditionGroup;
  risk: BuilderRiskState;
};

export const indicatorCatalog: BuilderIndicatorDefinition[] = [
  {
    id: "sma",
    label: "SMA",
    outputs: ["value"],
    defaultOutput: "value",
    defaults: { period: 20 },
  },
  {
    id: "ema",
    label: "EMA",
    outputs: ["value"],
    defaultOutput: "value",
    defaults: { period: 20 },
  },
  {
    id: "rsi",
    label: "RSI",
    outputs: ["value"],
    defaultOutput: "value",
    defaults: { period: 14 },
  },
  {
    id: "macd",
    label: "MACD",
    outputs: ["value", "signal"],
    defaultOutput: "value",
    defaults: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  },
  {
    id: "volume_sma",
    label: "Volume SMA",
    outputs: ["value"],
    defaultOutput: "value",
    defaults: { period: 20 },
  },
  {
    id: "rolling_high",
    label: "Rolling High",
    outputs: ["value"],
    defaultOutput: "value",
    defaults: { period: 20 },
  },
  {
    id: "rolling_low",
    label: "Rolling Low",
    outputs: ["value"],
    defaultOutput: "value",
    defaults: { period: 20 },
  },
];

export const conditionOperators: BuilderConditionOperator[] = [
  "greater_than",
  "less_than",
  "greater_equal",
  "less_equal",
  "cross_above",
  "cross_below",
  "equals",
];

export const priceFields: BuilderPriceField[] = [
  "close",
  "open",
  "high",
  "low",
  "volume",
];

export function makeDefaultBuilderState(
  name: string,
  description: string | null,
): BuilderState {
  return {
    metadata: {
      id: slugify(name),
      name,
      description: description ?? "",
      category: "custom",
      author: "OpenForge",
      tags: [],
    },
    indicators: [],
    entry: { logic: "AND", conditions: [] },
    exit: { logic: "AND", conditions: [] },
    risk: {
      stopLoss: { enabled: false, percent: 0 },
      takeProfit: { enabled: false, percent: 0 },
      trailingStop: { enabled: false, percent: 0 },
    },
  };
}

export function makeBuilderPayload(state: BuilderState) {
  return {
    builderState: {
      metadata: {
        id: state.metadata.id || slugify(state.metadata.name),
        name: state.metadata.name,
        description: state.metadata.description,
        category: state.metadata.category,
        author: state.metadata.author,
        tags: state.metadata.tags.filter(Boolean),
      },
      indicators: state.indicators.map((indicator) => ({
        indicatorId: indicator.indicatorId,
        alias: indicator.alias,
        params: indicator.params,
        output: indicator.output,
      })),
      entry: {
        logic: state.entry.logic,
        conditions: state.entry.conditions.map(serializeCondition),
      },
      exit: {
        logic: state.exit.logic,
        conditions: state.exit.conditions.map(serializeCondition),
      },
      risk: {
        stopLoss: state.risk.stopLoss,
        takeProfit: state.risk.takeProfit,
        trailingStop: state.risk.trailingStop,
      },
    },
  };
}

export function makeCodePayload(source: string) {
  return {
    source,
    sourceKind: "openforge_yaml",
  };
}

export function makeCodeTemplate(name: string, description: string | null) {
  return [
    'version: "1.0"',
    "metadata:",
    `  name: "${escapeYaml(name)}"`,
    `  description: "${escapeYaml(description ?? "")}"`,
    '  author: "OpenForge"',
    "  tags: []",
    "strategy:",
    `  id: "${slugify(name)}"`,
    '  category: "custom"',
    "  indicators: []",
    "  entry:",
    '    logic: "AND"',
    "    conditions: []",
    "  exit:",
    '    logic: "AND"',
    "    conditions: []",
    "risk:",
    "  stop_loss:",
    "    enabled: false",
    "    percent: 0",
    "  take_profit:",
    "    enabled: false",
    "    percent: 0",
    "  trailing_stop:",
    "    enabled: false",
    "    percent: 0",
  ].join("\n");
}

export function deriveBuilderState(strategy: StrategyDetail): BuilderState {
  const rawState = strategy.latestVersion?.payload?.builderState;
  if (!rawState || typeof rawState !== "object" || Array.isArray(rawState)) {
    return makeDefaultBuilderState(strategy.name, strategy.description);
  }

  const source = rawState as Record<string, unknown>;
  const metadataSource =
    source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
      ? (source.metadata as Record<string, unknown>)
      : {};
  const indicatorsSource = Array.isArray(source.indicators)
    ? source.indicators
    : [];
  const entrySource =
    source.entry && typeof source.entry === "object" && !Array.isArray(source.entry)
      ? (source.entry as Record<string, unknown>)
      : {};
  const exitSource =
    source.exit && typeof source.exit === "object" && !Array.isArray(source.exit)
      ? (source.exit as Record<string, unknown>)
      : {};
  const riskSource =
    source.risk && typeof source.risk === "object" && !Array.isArray(source.risk)
      ? (source.risk as Record<string, unknown>)
      : {};

  return {
    metadata: {
      id: stringValue(metadataSource.id, slugify(strategy.name)),
      name: stringValue(metadataSource.name, strategy.name),
      description: stringValue(metadataSource.description, strategy.description ?? ""),
      category: stringValue(metadataSource.category, "custom"),
      author: stringValue(metadataSource.author, "OpenForge"),
      tags: Array.isArray(metadataSource.tags)
        ? metadataSource.tags
            .map((tag) => (typeof tag === "string" ? tag : ""))
            .filter(Boolean)
        : [],
    },
    indicators: indicatorsSource
      .map((item, index) => parseIndicator(item, index))
      .filter((item): item is BuilderIndicator => item !== null),
    entry: parseGroup(entrySource),
    exit: parseGroup(exitSource),
    risk: parseRisk(riskSource),
  };
}

export function deriveCodeSource(strategy: StrategyDetail) {
  const source = strategy.latestVersion?.payload?.source;
  if (typeof source === "string" && source.trim().length > 0) {
    return source;
  }
  return makeCodeTemplate(strategy.name, strategy.description);
}

export function createEmptyCondition(): BuilderCondition {
  return {
    id: createId("cond"),
    left: { type: "price", field: "close" },
    operator: "greater_than",
    right: { type: "value", value: 0 },
  };
}

export function createDefaultIndicator(indicatorId: BuilderIndicatorType): BuilderIndicator {
  const definition = indicatorCatalog.find((item) => item.id === indicatorId)!;
  return {
    id: createId("indicator"),
    indicatorId,
    alias: makeDefaultAlias(indicatorId),
    output: definition.defaultOutput,
    params: { ...definition.defaults },
  };
}

export function getIndicatorDefinition(indicatorId: BuilderIndicatorType) {
  return indicatorCatalog.find((item) => item.id === indicatorId)!;
}

function parseIndicator(value: unknown, index: number): BuilderIndicator | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const source = value as Record<string, unknown>;
  const indicatorId = source.indicatorId;
  if (typeof indicatorId !== "string") {
    return null;
  }
  const definition = indicatorCatalog.find((item) => item.id === indicatorId);
  if (!definition) {
    return null;
  }

  const paramsSource =
    source.params && typeof source.params === "object" && !Array.isArray(source.params)
      ? (source.params as Record<string, unknown>)
      : {};

  return {
    id: createId(`indicator-${index}`),
    indicatorId: definition.id,
    alias: stringValue(source.alias, makeDefaultAlias(definition.id, index + 1)),
    output: stringValue(source.output, definition.defaultOutput),
    params: Object.fromEntries(
      Object.entries(definition.defaults).map(([key, defaultValue]) => [
        key,
        numberValue(paramsSource[key], defaultValue),
      ]),
    ),
  };
}

function parseGroup(source: Record<string, unknown>): BuilderConditionGroup {
  return {
    logic: source.logic === "OR" ? "OR" : "AND",
    conditions: Array.isArray(source.conditions)
      ? source.conditions
          .map((item, index) => parseCondition(item, index))
          .filter((item): item is BuilderCondition => item !== null)
      : [],
  };
}

function parseCondition(value: unknown, index: number): BuilderCondition | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const source = value as Record<string, unknown>;
  const left = parseOperand(source.left);
  const right = parseOperand(source.right);
  const operator = source.operator;
  if (!left || !right || typeof operator !== "string") {
    return null;
  }

  return {
    id: createId(`cond-${index}`),
    left,
    operator: conditionOperators.includes(operator as BuilderConditionOperator)
      ? (operator as BuilderConditionOperator)
      : "greater_than",
    right,
  };
}

function parseOperand(value: unknown): BuilderOperand | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const source = value as Record<string, unknown>;
  if (source.type === "price" && typeof source.field === "string") {
    return {
      type: "price",
      field: priceFields.includes(source.field as BuilderPriceField)
        ? (source.field as BuilderPriceField)
        : "close",
    };
  }
  if (
    source.type === "indicator" &&
    typeof source.alias === "string" &&
    typeof source.output === "string"
  ) {
    return {
      type: "indicator",
      alias: source.alias,
      output: source.output,
    };
  }
  if (source.type === "value") {
    return {
      type: "value",
      value: numberValue(source.value, 0),
    };
  }
  return null;
}

function parseRisk(source: Record<string, unknown>): BuilderRiskState {
  return {
    stopLoss: parseRiskItem(source.stopLoss),
    takeProfit: parseRiskItem(source.takeProfit),
    trailingStop: parseRiskItem(source.trailingStop),
  };
}

function parseRiskItem(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { enabled: false, percent: 0 };
  }
  const source = value as Record<string, unknown>;
  return {
    enabled: source.enabled === true,
    percent: numberValue(source.percent, 0),
  };
}

function serializeCondition(condition: BuilderCondition) {
  return {
    left: condition.left,
    operator: condition.operator,
    right: condition.right,
  };
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number"
    ? value
    : typeof value === "string" && value.trim().length > 0
      ? Number(value)
      : fallback;
}

function makeDefaultAlias(indicatorId: BuilderIndicatorType, index = 1) {
  return `${indicatorId}_${index}`;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "strategy";
}

function escapeYaml(value: string) {
  return value.replace(/"/g, '\\"');
}
