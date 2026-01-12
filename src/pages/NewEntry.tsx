import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const STORE_OPTIONS = ["臨安店", "南科店"] as const;
const GENDER_OPTIONS = ["男", "女"] as const;
const TAINAN_OPTIONS = ["是", "否"] as const;
const AGE_OPTIONS = ["18以下", "18-24", "25-34", "35-44", "45-54", "55以上"] as const;

const SOURCES = [
  "Google 搜尋",
  "Facebook 廣告",
  "Facebook 轉發",
  "Instagram",
  "TikTok & YouTube",
  "Dcard",
  "Mobile 01",
  "PTT",
  "親友介紹",
  "純粹路過",
  "其他",
  "業配貼文（FB、IG）",
] as const;

const PURPOSES = [
  "驗光配鏡",
  "購買隱形眼鏡",
  "調整眼鏡",
  "單純買框",
  "問題諮詢",
  "單純看看",
  "購買其他商品",
  "住戶視力檢查",
] as const;

type FormState = {
  form_date: string;
  customer_name: string;
  gender: (typeof GENDER_OPTIONS)[number];
  store: (typeof STORE_OPTIONS)[number];
  age_range: (typeof AGE_OPTIONS)[number];
  is_tainan: (typeof TAINAN_OPTIONS)[number];
  source_tags: string[];
  visit_purposes: string[];
  search_keyword: string;
  detail_desc: string;
};

function Chip({
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
        "focus:outline-none focus:ring-2 focus:ring-black/20",
        active
          ? "bg-black text-white border-black"
          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SingleChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((opt) => (
          <Chip key={opt} label={opt} active={opt === value} onClick={() => onChange(opt)} />
        ))}
      </div>
    </div>
  );
}

export default function NewEntry() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const defaultForm: FormState = useMemo(
    () => ({
      form_date: today,
      customer_name: "",
      gender: "男",
      store: "臨安店",
      age_range: "25-34",
      is_tainan: "是",
      source_tags: [],
      visit_purposes: [],
      search_keyword: "",
      detail_desc: "",
    }),
    [today]
  );

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);

  const toggleMulti = (field: "source_tags" | "visit_purposes", v: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(v)
        ? prev[field].filter((x) => x !== v)
        : [...prev[field], v],
    }));
  };

  const resetAll = () => {
    const ok = window.confirm("重置填寫內容？");
    if (!ok) return;
    setForm(defaultForm);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.customer_name.trim()) return alert("請填寫顧客姓名");
    if (!form.detail_desc.trim()) return alert("請填寫詳細描述");
    if (form.source_tags.length === 0) return alert("請至少選擇 1 個來源");
    if (form.visit_purposes.length === 0) return alert("請至少選擇 1 個來店目的");

    setSaving(true);
    const { error } = await supabase.from("visits").insert([form]);
    setSaving(false);

    if (error) return alert("新增失敗：" + error.message);

    alert("新增成功！");
    setForm(defaultForm); // 送出成功也直接整份歸零
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h1 className="text-lg font-semibold text-slate-900">新增資料</h1>
        <p className="text-sm text-slate-500 mt-1">
          店內同仁可直接用手機掃 QR Code 進來填寫（全部選項皆按鈕化）。
        </p>
      </div>

      <form
        onSubmit={submit}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            <div className="text-slate-700 mb-1">日期</div>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
              type="date"
              value={form.form_date}
              onChange={(e) => setForm({ ...form, form_date: e.target.value })}
            />
          </label>

          <label className="text-sm">
            <div className="text-slate-700 mb-1">顧客姓名（必填）</div>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
          </label>

          <label className="text-sm md:col-span-2">
            <div className="text-slate-700 mb-1">搜尋關鍵字（可空）</div>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
              value={form.search_keyword}
              onChange={(e) => setForm({ ...form, search_keyword: e.target.value })}
            />
          </label>

          <label className="text-sm md:col-span-2">
            <div className="text-slate-700 mb-1">詳細描述（必填）</div>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2 min-h-[120px]"
              value={form.detail_desc}
              onChange={(e) => setForm({ ...form, detail_desc: e.target.value })}
            />
          </label>
        </div>

        <SingleChoiceChips
          label="門店"
          options={STORE_OPTIONS}
          value={form.store}
          onChange={(v) => setForm({ ...form, store: v })}
        />

        <SingleChoiceChips
          label="性別"
          options={GENDER_OPTIONS}
          value={form.gender}
          onChange={(v) => setForm({ ...form, gender: v })}
        />

        <SingleChoiceChips
          label="年齡範圍"
          options={AGE_OPTIONS}
          value={form.age_range}
          onChange={(v) => setForm({ ...form, age_range: v })}
        />

        <SingleChoiceChips
          label="是否為台南人"
          options={TAINAN_OPTIONS}
          value={form.is_tainan}
          onChange={(v) => setForm({ ...form, is_tainan: v })}
        />

        <div>
          <div className="text-sm font-medium text-slate-800 mb-2">來源（可複選，至少 1）</div>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <Chip
                key={s}
                label={s}
                active={form.source_tags.includes(s)}
                onClick={() => toggleMulti("source_tags", s)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-800 mb-2">來店目的（可複選，至少 1）</div>
          <div className="flex flex-wrap gap-2">
            {PURPOSES.map((p) => (
              <Chip
                key={p}
                label={p}
                active={form.visit_purposes.includes(p)}
                onClick={() => toggleMulti("visit_purposes", p)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-black text-white py-3 font-medium hover:bg-black/90 disabled:opacity-60"
          >
            {saving ? "儲存中..." : "送出"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={resetAll}
            className="w-full rounded-xl border border-slate-200 py-3 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            一鍵重填
          </button>
        </div>
      </form>
    </div>
  );
}
