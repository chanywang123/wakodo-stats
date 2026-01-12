import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type VisitRow = {
  id?: number;
  form_date: string; // YYYY-MM-DD
  store: string;
  gender: string;
  age_range: string;
  is_tainan: string;
  source_tags: string[] | null;
  visit_purposes: string[] | null;
};

type RangeKey = "today" | "7d" | "month" | "year" | "custom";

const STORE_OPTIONS = ["全部", "臨安店", "南科店"] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

function countBy(items: string[]) {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

function pct(n: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function SegButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full border text-sm transition select-none",
        active
          ? "bg-black text-white border-black"
          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function Dashboard() {
  const today = useMemo(() => toYMD(new Date()), []);
  const [range, setRange] = useState<RangeKey>("today");
  const [store, setStore] = useState<(typeof STORE_OPTIONS)[number]>("全部");
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (range === "today") {
      const y = toYMD(now);
      return { startDate: y, endDate: y };
    }
    if (range === "7d") {
      return { startDate: toYMD(addDays(now, -6)), endDate: toYMD(now) };
    }
    if (range === "month") {
      return { startDate: toYMD(startOfMonth(now)), endDate: toYMD(now) };
    }
    if (range === "year") {
      return { startDate: toYMD(startOfYear(now)), endDate: toYMD(now) };
    }
    return { startDate: customStart, endDate: customEnd };
  }, [range, customStart, customEnd]);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);

    // Supabase 的篩選可以在 select() 後鏈式使用 gte/lte 來做區間查詢
    //（此處 form_date 是 YYYY-MM-DD 字串，做篩選很直覺）
    let q = supabase
      .from("visits")
      .select("id, form_date, store, gender, age_range, is_tainan, source_tags, visit_purposes")
      .gte("form_date", startDate)
      .lte("form_date", endDate);

    if (store !== "全部") q = q.eq("store", store);

    const { data, error } = await q;

    setLoading(false);
    if (error) {
      setErr(error.message);
      setRows([]);
      return;
    }

    setRows((data ?? []) as VisitRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, startDate, endDate, store]);

  const total = rows.length;

  const storeCounts = useMemo(() => countBy(rows.map((r) => r.store || "未填")), [rows]);
  const genderCounts = useMemo(() => countBy(rows.map((r) => r.gender || "未填")), [rows]);
  const ageCounts = useMemo(() => countBy(rows.map((r) => r.age_range || "未填")), [rows]);
  const tainanCounts = useMemo(() => countBy(rows.map((r) => r.is_tainan || "未填")), [rows]);

  const sourceCounts = useMemo(() => {
    const all: string[] = [];
    for (const r of rows) {
      if (Array.isArray(r.source_tags)) all.push(...r.source_tags);
    }
    return countBy(all);
  }, [rows]);

  const purposeCounts = useMemo(() => {
    const all: string[] = [];
    for (const r of rows) {
      if (Array.isArray(r.visit_purposes)) all.push(...r.visit_purposes);
    }
    return countBy(all);
  }, [rows]);

  const dayCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const d = r.form_date || "未填";
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">儀表板</h1>
            <div className="text-sm text-slate-500 mt-1">
              區間：{startDate} ～ {endDate}　門店：{store}
            </div>
          </div>

          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/90"
          >
            重新整理
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <SegButton active={range === "today"} label="今天" onClick={() => setRange("today")} />
          <SegButton active={range === "7d"} label="近 7 天" onClick={() => setRange("7d")} />
          <SegButton active={range === "month"} label="本月" onClick={() => setRange("month")} />
          <SegButton active={range === "year"} label="今年" onClick={() => setRange("year")} />
          <SegButton active={range === "custom"} label="自訂" onClick={() => setRange("custom")} />
        </div>

        {range === "custom" && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm">
              <div className="text-slate-700 mb-1">開始</div>
              <input
                className="border border-slate-200 rounded-xl px-3 py-2"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <div className="text-slate-700 mb-1">結束</div>
              <input
                className="border border-slate-200 rounded-xl px-3 py-2"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {STORE_OPTIONS.map((s) => (
            <SegButton key={s} active={store === s} label={s} onClick={() => setStore(s)} />
          ))}
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            讀取失敗：{err}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">總筆數</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">{loading ? "…" : total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">來源項目數（加總）</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {loading ? "…" : sourceCounts.reduce((a, b) => a + b.count, 0)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">目的項目數（加總）</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {loading ? "…" : purposeCounts.reduce((a, b) => a + b.count, 0)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">每日平均（筆）</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {loading ? "…" : Math.round((total / Math.max(dayCounts.length, 1)) * 10) / 10}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatTable title="來源 Top" total={sourceCounts.reduce((a, b) => a + b.count, 0)} rows={sourceCounts.slice(0, 12)} />
        <StatTable title="來店目的 Top" total={purposeCounts.reduce((a, b) => a + b.count, 0)} rows={purposeCounts.slice(0, 12)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatTable title="門店" total={total} rows={storeCounts} />
        <StatTable title="性別" total={total} rows={genderCounts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatTable title="年齡範圍" total={total} rows={ageCounts} />
        <StatTable title="是否台南人" total={total} rows={tainanCounts} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="text-sm font-medium text-slate-800 mb-3">每日筆數</div>
        <div className="overflow-auto">
          <table className="min-w-[520px] w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4">日期</th>
                <th className="py-2 pr-4">筆數</th>
              </tr>
            </thead>
            <tbody>
              {dayCounts.map((r) => (
                <tr key={r.date} className="border-t border-slate-100">
                  <td className="py-2 pr-4">{r.date}</td>
                  <td className="py-2 pr-4">{r.count}</td>
                </tr>
              ))}
              {dayCounts.length === 0 && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={2}>
                    （此範圍尚無資料）
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatTable({
  title,
  total,
  rows,
}: {
  title: string;
  total: number;
  rows: { label: string; count: number }[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="text-sm font-medium text-slate-800 mb-3">{title}</div>
      <div className="overflow-auto">
        <table className="min-w-[520px] w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2 pr-4">項目</th>
              <th className="py-2 pr-4">次數</th>
              <th className="py-2 pr-4">占比</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-slate-100">
                <td className="py-2 pr-4">{r.label}</td>
                <td className="py-2 pr-4">{r.count}</td>
                <td className="py-2 pr-4">{pct(r.count, total)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-4 text-slate-500" colSpan={3}>
                  （此範圍尚無資料）
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
