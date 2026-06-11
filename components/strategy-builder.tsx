"use client";

import { CopyPlus, GitBranchPlus, Trash2 } from "lucide-react";
import type {
  Comparator,
  IndicatorOperand,
  PriceField,
  StrategyCondition,
  StrategyConfig,
  StrategyGroup,
  StrategyNode,
  StrategyOperand
} from "@/lib/types/strategy";

const comparators: Comparator[] = [">", ">=", "<", "<=", "==", "!=", "crosses_above", "crosses_below"];
const priceFields: PriceField[] = ["open", "high", "low", "close", "volume"];

type StrategyBuilderProps = {
  value: StrategyConfig;
  onChange: (strategy: StrategyConfig) => void;
};

const blankCondition = (): StrategyCondition => ({
  type: "condition",
  left: { type: "price", field: "close" },
  comparator: ">",
  right: { type: "value", value: 0 }
});

const blankGroup = (): StrategyGroup => ({
  type: "group",
  operator: "AND",
  conditions: [blankCondition()]
});

function cloneStrategy(strategy: StrategyConfig) {
  return structuredClone(strategy) as StrategyConfig;
}

function updateNode(root: StrategyGroup, path: number[], updater: (node: StrategyNode) => StrategyNode) {
  if (path.length === 0) {
    return updater(root) as StrategyGroup;
  }

  const [head, ...tail] = path;
  const node = root.conditions[head];

  if (!node) {
    return root;
  }

  if (tail.length === 0) {
    root.conditions[head] = updater(node);
    return root;
  }

  if (node.type === "group") {
    updateNode(node, tail, updater);
  }

  return root;
}

function getNode(root: StrategyGroup, path: number[]): StrategyNode | null {
  return path.reduce<StrategyNode | null>((node, index) => {
    if (!node || node.type !== "group") {
      return null;
    }
    return node.conditions[index] ?? null;
  }, root);
}

function OperandEditor({
  operand,
  onChange
}: {
  operand: StrategyOperand;
  onChange: (operand: StrategyOperand) => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <select
        className="rounded-lg border border-white/10 bg-graphite-900 px-3 py-2 text-sm text-white"
        onChange={(event) => {
          const type = event.target.value;
          if (type === "price") {
            onChange({ type: "price", field: "close" });
          } else if (type === "indicator") {
            onChange({ type: "indicator", name: "rsi", params: { length: 14 }, timeframe: "1D" });
          } else {
            onChange({ type: "value", value: 0 });
          }
        }}
        value={operand.type}
      >
        <option value="price">Price</option>
        <option value="indicator">Indicator</option>
        <option value="value">Number</option>
      </select>

      {operand.type === "price" ? (
        <div className="grid grid-cols-2 gap-2">
          <select
            className="rounded-lg border border-white/10 bg-graphite-900 px-3 py-2 text-sm text-white"
            onChange={(event) => onChange({ ...operand, field: event.target.value as PriceField })}
            value={operand.field}
          >
            {priceFields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-white/10 bg-graphite-900 px-3 py-2 text-sm text-white"
            onChange={(event) => onChange({ ...operand, timeframe: event.target.value || undefined })}
            placeholder="Timeframe"
            value={operand.timeframe ?? ""}
          />
        </div>
      ) : null}

      {operand.type === "indicator" ? (
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-lg border border-white/10 bg-graphite-900 px-3 py-2 text-sm text-white"
              onChange={(event) => onChange({ ...operand, name: event.target.value.toLowerCase() })}
              placeholder="rsi"
              value={operand.name}
            />
            <input
              className="rounded-lg border border-white/10 bg-graphite-900 px-3 py-2 text-sm text-white"
              onChange={(event) => onChange({ ...operand, timeframe: event.target.value || undefined })}
              placeholder="1D / 1H"
              value={operand.timeframe ?? ""}
            />
          </div>
          <input
            className="rounded-lg border border-white/10 bg-graphite-900 px-3 py-2 text-sm text-white"
            onChange={(event) => onChange({ ...operand, field: event.target.value || undefined })}
            placeholder="Output field (optional)"
            value={operand.field ?? ""}
          />
          <textarea
            className="min-h-20 rounded-lg border border-white/10 bg-graphite-900 px-3 py-2 font-mono text-xs text-white"
            defaultValue={JSON.stringify(operand.params, null, 2)}
            onBlur={(event) => {
              try {
                const params = JSON.parse(event.target.value) as IndicatorOperand["params"];
                onChange({ ...operand, params });
              } catch {
                event.currentTarget.value = JSON.stringify(operand.params, null, 2);
              }
            }}
          />
        </div>
      ) : null}

      {operand.type === "value" ? (
        <input
          className="rounded-lg border border-white/10 bg-graphite-900 px-3 py-2 text-sm text-white"
          onChange={(event) => onChange({ ...operand, value: Number(event.target.value) })}
          type="number"
          value={operand.value}
        />
      ) : null}
    </div>
  );
}

function RuleNode({
  node,
  path,
  root,
  onRootChange,
  canRemove
}: {
  node: StrategyNode;
  path: number[];
  root: StrategyGroup;
  onRootChange: (root: StrategyGroup) => void;
  canRemove: boolean;
}) {
  function mutate(updater: (node: StrategyNode) => StrategyNode) {
    const nextRoot = structuredClone(root) as StrategyGroup;
    onRootChange(updateNode(nextRoot, path, updater));
  }

  function removeNode() {
    const nextRoot = structuredClone(root) as StrategyGroup;
    const parentPath = path.slice(0, -1);
    const removeIndex = path[path.length - 1];
    const parent = getNode(nextRoot, parentPath);

    if (parent?.type === "group" && parent.conditions.length > 1) {
      parent.conditions.splice(removeIndex, 1);
      onRootChange(nextRoot);
    }
  }

  if (node.type === "condition") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Condition</p>
          <button
            className="rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-dangerline disabled:opacity-30"
            disabled={!canRemove}
            onClick={removeNode}
            type="button"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Remove condition</span>
          </button>
        </div>
        <div className="grid gap-3 xl:grid-cols-[1fr_160px_1fr]">
          <OperandEditor operand={node.left} onChange={(left) => mutate((current) => ({ ...(current as StrategyCondition), left }))} />
          <select
            className="rounded-xl border border-white/10 bg-graphite-900 px-3 py-2 text-sm text-white"
            onChange={(event) => mutate((current) => ({ ...(current as StrategyCondition), comparator: event.target.value as Comparator }))}
            value={node.comparator}
          >
            {comparators.map((comparator) => (
              <option key={comparator} value={comparator}>
                {comparator}
              </option>
            ))}
          </select>
          <OperandEditor operand={node.right} onChange={(right) => mutate((current) => ({ ...(current as StrategyCondition), right }))} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-mintline/20 bg-mintline/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GitBranchPlus className="h-4 w-4 text-mintline" aria-hidden="true" />
          <select
            className="rounded-lg border border-white/10 bg-graphite-900 px-3 py-2 text-sm text-white"
            onChange={(event) => mutate((current) => ({ ...(current as StrategyGroup), operator: event.target.value as "AND" | "OR" }))}
            value={node.operator}
          >
            <option value="AND">AND group</option>
            <option value="OR">OR group</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            onClick={() => mutate((current) => ({ ...(current as StrategyGroup), conditions: [...(current as StrategyGroup).conditions, blankCondition()] }))}
            type="button"
          >
            <CopyPlus className="h-4 w-4" aria-hidden="true" />
            Condition
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            onClick={() => mutate((current) => ({ ...(current as StrategyGroup), conditions: [...(current as StrategyGroup).conditions, blankGroup()] }))}
            type="button"
          >
            <GitBranchPlus className="h-4 w-4" aria-hidden="true" />
            Group
          </button>
          {path.length > 0 ? (
            <button
              className="rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-dangerline disabled:opacity-30"
              disabled={!canRemove}
              onClick={removeNode}
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Remove group</span>
            </button>
          ) : null}
        </div>
      </div>
      <div className="space-y-3">
        {node.conditions.map((child, index) => (
          <RuleNode
            key={`${path.join(".")}.${index}`}
            canRemove={node.conditions.length > 1}
            node={child}
            onRootChange={onRootChange}
            path={[...path, index]}
            root={root}
          />
        ))}
      </div>
    </div>
  );
}

export function StrategyBuilder({ value, onChange }: StrategyBuilderProps) {
  function updateStrategy(updater: (strategy: StrategyConfig) => void) {
    const next = cloneStrategy(value);
    updater(next);
    onChange(next);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 rounded-3xl border border-white/10 bg-graphite-900/75 p-5 lg:grid-cols-4">
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Strategy name</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            onChange={(event) => updateStrategy((strategy) => { strategy.name = event.target.value; })}
            value={value.name}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Symbol</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            onChange={(event) => updateStrategy((strategy) => { strategy.symbol = event.target.value.toUpperCase(); strategy.data.symbol = event.target.value.toUpperCase(); })}
            value={value.symbol}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Bucket</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            onChange={(event) => updateStrategy((strategy) => { strategy.data.bucket = event.target.value; })}
            value={value.data.bucket}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Parquet path</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            onChange={(event) => updateStrategy((strategy) => { strategy.data.path = event.target.value; })}
            value={value.data.path}
          />
        </label>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-mintline">Entry logic</h2>
          <RuleNode
            canRemove={false}
            node={value.entry}
            onRootChange={(entry) => updateStrategy((strategy) => { strategy.entry = entry; })}
            path={[]}
            root={value.entry}
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-amberline">Exit logic</h2>
          <RuleNode
            canRemove={false}
            node={value.exit}
            onRootChange={(exit) => updateStrategy((strategy) => { strategy.exit = exit; })}
            path={[]}
            root={value.exit}
          />
        </div>
      </section>

      <section className="grid gap-3 rounded-3xl border border-white/10 bg-graphite-900/75 p-5 sm:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Initial capital</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            onChange={(event) => updateStrategy((strategy) => { strategy.risk.initialCapital = Number(event.target.value); })}
            type="number"
            value={value.risk.initialCapital}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Position size %</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            onChange={(event) => updateStrategy((strategy) => { strategy.risk.positionSizePct = Number(event.target.value); })}
            type="number"
            value={value.risk.positionSizePct}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Fee bps</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            onChange={(event) => updateStrategy((strategy) => { strategy.risk.feeBps = Number(event.target.value); })}
            type="number"
            value={value.risk.feeBps}
          />
        </label>
      </section>
    </div>
  );
}
