"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { DemoNotice } from "@/components/DemoNotice";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { expenses as initialExpenses, type ExpenseCategory } from "@/lib/demoData";
import { formatCurrency, formatPercent } from "@/lib/format";

type ExpenseView = "一覧" | "カレンダー" | "月次集計" | "項目別集計";
type ExpenseItem = (typeof initialExpenses)[number];

const categories: ExpenseCategory[] = ["ガソリン代", "駐車場代", "保険料", "洗車代", "修理代", "通信費", "事業用備品", "その他"];
const views: ExpenseView[] = ["一覧", "カレンダー", "月次集計", "項目別集計"];
const monthLabels: Record<string, string> = {
  "2026-06": "2026年6月",
  "2026-05": "2026年5月",
  "2026-04": "2026年4月"
};
const salesByMonth: Record<string, number> = {
  "2026-06": 1841920,
  "2026-05": 1724000,
  "2026-04": 1686000
};
const demoBaseMonth = "2026-06";

function sumAmount(items: ExpenseItem[]) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year}年${Number(monthNumber)}月`;
}

function addMonths(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function firstExpenseDateInMonth(items: ExpenseItem[], month: string) {
  return items
    .filter((item) => item.date.startsWith(month))
    .map((item) => item.date)
    .sort()[0] ?? "";
}

function ExpenseTable({ items, emptyMessage = "該当する経費明細はありません。" }: { items: ExpenseItem[]; emptyMessage?: string }) {
  return (
    <div className="overflow-x-auto table-scroll">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-muted">
          <tr>
            <th className="px-3 py-3">日付</th>
            <th className="px-3 py-3">カテゴリ</th>
            <th className="px-3 py-3 text-right">金額</th>
            <th className="px-3 py-3">支払方法</th>
            <th className="px-3 py-3">メモ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-3">{item.date}</td>
              <td className="px-3 py-3 font-medium">{item.category}</td>
              <td className="px-3 py-3 text-right font-semibold">{formatCurrency(item.amount)}</td>
              <td className="px-3 py-3">{item.method}</td>
              <td className="px-3 py-3 text-slate-600">{item.memo || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? (
        <div className="rounded-b-lg border border-t-0 border-line bg-slate-50 p-6 text-center text-sm text-muted">
          {emptyMessage}
        </div>
      ) : null}
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [activeView, setActiveView] = useState<ExpenseView>("月次集計");
  const [calendarMonth, setCalendarMonth] = useState(demoBaseMonth);
  const [categoryMonth, setCategoryMonth] = useState(demoBaseMonth);
  const [selectedDate, setSelectedDate] = useState("2026-06-30");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>("ガソリン代");
  const [entryDate, setEntryDate] = useState("2026-06-30");
  const [category, setCategory] = useState<ExpenseCategory>("ガソリン代");
  const [amount, setAmount] = useState("3200");
  const [memo, setMemo] = useState("臨時経費");
  const [method, setMethod] = useState("現金");

  const juneExpenses = useMemo(() => expenses.filter((item) => item.date.startsWith("2026-06")), [expenses]);
  const total = useMemo(() => sumAmount(juneExpenses), [juneExpenses]);
  const fuelTotal = useMemo(() => sumAmount(juneExpenses.filter((item) => item.category === "ガソリン代")), [juneExpenses]);
  const vehicleTotal = useMemo(
    () => sumAmount(juneExpenses.filter((item) => ["修理代", "洗車代", "駐車場代", "保険料"].includes(item.category))),
    [juneExpenses]
  );
  const communicationOtherTotal = useMemo(
    () => sumAmount(juneExpenses.filter((item) => ["通信費", "事業用備品", "その他"].includes(item.category))),
    [juneExpenses]
  );
  const receiptMissingCount = useMemo(() => juneExpenses.filter((_, index) => index % 3 === 0).length, [juneExpenses]);

  const allExpensesByDate = useMemo(() => {
    return expenses.reduce<Record<string, ExpenseItem[]>>((grouped, item) => {
      grouped[item.date] = [...(grouped[item.date] ?? []), item];
      return grouped;
    }, {});
  }, [expenses]);

  const calendarMonthExpenses = useMemo(() => expenses.filter((item) => item.date.startsWith(calendarMonth)), [calendarMonth, expenses]);
  const calendarMonthTotal = useMemo(() => sumAmount(calendarMonthExpenses), [calendarMonthExpenses]);
  const calendarMonthLabel = formatMonth(calendarMonth);

  const calendarCells = useMemo(() => {
    const [year, monthNumber] = calendarMonth.split("-").map(Number);
    const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const emptyCells = Array.from({ length: firstWeekday }, () => null);
    const dayCells = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${calendarMonth}-${String(day).padStart(2, "0")}`;
      const items = allExpensesByDate[date] ?? [];
      return { day, date, items, amount: sumAmount(items) };
    });
    return [...emptyCells, ...dayCells];
  }, [allExpensesByDate, calendarMonth]);

  const selectedDateItems = selectedDate.startsWith(calendarMonth) ? allExpensesByDate[selectedDate] ?? [] : [];
  const selectableMonths = useMemo(() => {
    const months = new Set(["2026-06", "2026-05", "2026-04", calendarMonth, ...expenses.map((item) => item.date.slice(0, 7))]);
    return Array.from(months).sort().reverse();
  }, [calendarMonth, expenses]);

  const changeCalendarMonth = (month: string) => {
    setCalendarMonth(month);
    setSelectedDate(firstExpenseDateInMonth(expenses, month));
  };

  const monthlyBreakdown = useMemo(() => {
    return categories
      .map((itemCategory) => {
        const items = calendarMonthExpenses.filter((item) => item.category === itemCategory);
        const categoryTotal = sumAmount(items);
        return {
          category: itemCategory,
          total: categoryTotal,
          count: items.length,
          ratio: calendarMonthTotal > 0 ? (categoryTotal / calendarMonthTotal) * 100 : 0
        };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [calendarMonthExpenses, calendarMonthTotal]);
  const maxMonthlyBreakdownTotal = Math.max(...monthlyBreakdown.map((item) => item.total), 1);

  const monthlySummary = useMemo(() => {
    return selectableMonths.map((month) => {
      const items = expenses.filter((item) => item.date.startsWith(month));
      const categoryTotals = categories
        .map((itemCategory) => ({
          category: itemCategory,
          amount: sumAmount(items.filter((item) => item.category === itemCategory))
        }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      const amountTotal = sumAmount(items);
      return {
        month,
        label: monthLabels[month],
        total: amountTotal,
        count: items.length,
        mainCategory: categoryTotals[0]?.category ?? "-",
        ratio: salesByMonth[month] ? (amountTotal / salesByMonth[month]) * 100 : 0
      };
    });
  }, [expenses, selectableMonths]);
  const maxMonthlyTotal = Math.max(...monthlySummary.map((item) => item.total), 1);

  const categoryMonthExpenses = useMemo(() => expenses.filter((item) => item.date.startsWith(categoryMonth)), [categoryMonth, expenses]);
  const categoryMonthTotal = useMemo(() => sumAmount(categoryMonthExpenses), [categoryMonthExpenses]);
  const categoryMonthLabel = formatMonth(categoryMonth);
  const categorySummary = useMemo(() => {
    return categories.map((itemCategory) => {
      const items = categoryMonthExpenses.filter((item) => item.category === itemCategory);
      const categoryTotal = sumAmount(items);
      return {
        category: itemCategory,
        total: categoryTotal,
        count: items.length,
        ratio: categoryMonthTotal > 0 ? (categoryTotal / categoryMonthTotal) * 100 : 0
      };
    });
  }, [categoryMonthExpenses, categoryMonthTotal]);
  const maxCategoryTotal = Math.max(...categorySummary.map((item) => item.total), 1);
  const selectedCategoryItems = categoryMonthExpenses.filter((item) => item.category === selectedCategory);

  return (
    <>
      <DemoNotice title="経費管理デモの前提">
        ガソリン代、駐車場代、修理代、通信費などの事業用経費を記録し、一覧、カレンダー、月次集計、項目別集計で確認する想定です。経費追加は画面上だけに一時反映され、保存は行いません。本実装ではDB保存、領収書画像保存、月次/年次集計、確定申告向け出力を予定しています。
      </DemoNotice>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="今月経費" value={formatCurrency(total)} sub="2026年6月の事業用経費" />
        <StatCard label="ガソリン代" value={formatCurrency(fuelTotal)} sub="燃料費の月次確認" />
        <StatCard label="車両関連費" value={formatCurrency(vehicleTotal)} sub="修理・洗車・駐車場・保険料" />
        <StatCard label="通信・その他" value={formatCurrency(communicationOtherTotal)} sub="通信費、備品、その他" />
        <StatCard label="件数" value={`${juneExpenses.length}件`} sub="今月の経費明細" />
        <StatCard label="領収書未添付" value={`${receiptMissingCount}件`} sub="デモ表示" />
      </div>

      <Section
        title={`${calendarMonthLabel}の経費内訳`}
        description="選択中の月に何へいくら使ったかをカテゴリ別に確認できます。月次確認や確定申告準備の元データとして使う想定です。"
        action={
          <select
            value={calendarMonth}
            onChange={(event) => changeCalendarMonth(event.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink"
            aria-label="経費内訳の表示月を選択"
          >
            {selectableMonths.map((month) => (
              <option key={month} value={month}>{formatMonth(month)}</option>
            ))}
          </select>
        }
      >
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-line bg-slate-50 p-4">
            <p className="text-xs font-bold text-muted">月間合計</p>
            <p className="mt-1 text-2xl font-bold text-ink">{formatCurrency(calendarMonthTotal)}</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-4">
            <p className="text-xs font-bold text-muted">件数</p>
            <p className="mt-1 text-2xl font-bold text-ink">{calendarMonthExpenses.length}件</p>
          </div>
        </div>
        {monthlyBreakdown.length > 0 ? (
          <div className="space-y-3">
            {monthlyBreakdown.map((item) => (
              <div key={item.category} className="grid gap-3 rounded-lg border border-line bg-slate-50 p-4 lg:grid-cols-[140px_1fr_120px_90px] lg:items-center">
                <div>
                  <p className="font-bold text-ink">{item.category}</p>
                  <p className="text-xs text-muted">{item.count}件</p>
                </div>
                <div className="h-3 rounded bg-white">
                  <div className="h-3 rounded bg-slate-700" style={{ width: `${Math.max(3, (item.total / maxMonthlyBreakdownTotal) * 100)}%` }} />
                </div>
                <p className="text-sm font-bold text-ink">{formatCurrency(item.total)}</p>
                <p className="text-sm font-bold text-slate-700">{formatPercent(item.ratio)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-muted">
            この月の経費内訳はありません。
          </div>
        )}
      </Section>

      <Section title="経費追加フォーム" description="個人タクシーの事業用経費として追加した想定です。追加内容は一覧、カレンダー、月次集計、項目別集計へ画面上だけ一時反映します。">
        <div className="grid gap-3 lg:grid-cols-[150px_160px_140px_1fr_150px_auto]">
          <label className="text-xs font-bold text-muted">
            日付
            <input value={entryDate} onChange={(event) => setEntryDate(event.target.value)} type="date" className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-normal text-ink" />
          </label>
          <label className="text-xs font-bold text-muted">
            カテゴリ
            <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-normal text-ink">
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-muted">
            金額
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-normal text-ink" placeholder="金額" />
          </label>
          <label className="text-xs font-bold text-muted">
            メモ
            <input value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-normal text-ink" placeholder="メモ" />
          </label>
          <label className="text-xs font-bold text-muted">
            支払方法
            <select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-normal text-ink">
              <option>現金</option>
              <option>事業用カード</option>
              <option>口座振替</option>
            </select>
          </label>
          <button
            type="button"
            className="self-end rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            onClick={() => {
              const numericAmount = Number(amount) || 0;
              const nextItem = { id: `EX-DEMO-${Date.now()}`, date: entryDate, category, amount: numericAmount, method, memo };
              setExpenses((current) => [nextItem, ...current]);
              setSelectedDate(entryDate);
              setCalendarMonth(entryDate.slice(0, 7));
              setCategoryMonth(entryDate.slice(0, 7));
              setSelectedCategory(category);
            }}
          >
            追加
          </button>
        </div>
        <button type="button" className="mt-4 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold" onClick={() => alert("領収書画像アップロードはデモ版のためボタンのみです。")}>
          <Upload className="mr-1 inline" size={16} />
          領収書画像アップロード
        </button>
      </Section>

      <div className="rounded-lg border border-line bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {views.map((view) => (
            <button
              type="button"
              key={view}
              className={`rounded-md border px-4 py-2 text-sm font-bold transition ${
                activeView === view ? "border-slate-900 bg-slate-900 text-white" : "border-line bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setActiveView(view)}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {activeView === "一覧" ? (
        <Section title="経費一覧" description={`2026年6月の事業用経費を中心に表示しています。合計 ${formatCurrency(total)} / ${juneExpenses.length}件`}>
          <ExpenseTable items={juneExpenses} />
        </Section>
      ) : null}

      {activeView === "カレンダー" ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Section
            title={`${calendarMonthLabel}の経費カレンダー`}
            description="表示月を切り替えて、過去月の経費や日別の支出を確認できます。本実装では、保存済み経費データをもとに月別・日別の確認ができる想定です。"
          >
            <div className="mb-4 rounded-lg border border-line bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-muted">表示中の年月</p>
                  <h3 className="mt-1 text-xl font-bold text-ink">{calendarMonthLabel}</h3>
                  <p className="mt-1 text-sm text-slate-700">
                    月間経費 {formatCurrency(calendarMonthTotal)} / {calendarMonthExpenses.length}件
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold hover:bg-slate-100" onClick={() => changeCalendarMonth(addMonths(calendarMonth, -1))}>
                    ← 前月
                  </button>
                  <button type="button" className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold hover:bg-slate-100" onClick={() => changeCalendarMonth(demoBaseMonth)}>
                    今月
                  </button>
                  <button type="button" className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold hover:bg-slate-100" onClick={() => changeCalendarMonth(addMonths(calendarMonth, 1))}>
                    翌月 →
                  </button>
                  <select
                    value={calendarMonth}
                    onChange={(event) => changeCalendarMonth(event.target.value)}
                    className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink"
                    aria-label="表示月を選択"
                  >
                    {selectableMonths.map((month) => (
                      <option key={month} value={month}>{formatMonth(month)}</option>
                    ))}
                  </select>
                </div>
              </div>
              {calendarMonthExpenses.length === 0 ? (
                <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-muted">この月の経費はありません。</p>
              ) : null}
            </div>
            <div className="grid grid-cols-7 border-l border-t border-line text-center text-xs font-bold text-muted">
              {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
                <div key={day} className="border-b border-r border-line bg-slate-50 px-2 py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-l border-line">
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="min-h-28 border-b border-r border-line bg-slate-100" />;
                }
                const hasExpense = day.amount > 0;
                const selected = selectedDate === day.date;
                return (
                  <button
                    type="button"
                    key={day.date}
                    className={`min-h-28 border-b border-r border-line p-3 text-left transition ${
                      selected ? "bg-slate-900 text-white" : hasExpense ? "bg-emerald-50 hover:bg-emerald-100" : "bg-slate-50 text-slate-500 hover:bg-white"
                    }`}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    <span className="text-sm font-bold">{day.day}</span>
                    {hasExpense ? (
                      <div className="mt-4 space-y-1 text-xs">
                        <p className={selected ? "text-white" : "text-slate-700"}>経費</p>
                        <p className="font-bold">{formatCurrency(day.amount)}</p>
                        <p>{day.items.length}件</p>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs">経費なし</p>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            title="選択日の経費明細"
            description={selectedDate ? `${selectedDate} / ${formatCurrency(sumAmount(selectedDateItems))} / ${selectedDateItems.length}件` : `${calendarMonthLabel}の日付を選択してください`}
          >
            {selectedDate ? <ExpenseTable items={selectedDateItems} emptyMessage="この日の経費はありません。" /> : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-muted">
                この月の経費はありません。
              </div>
            )}
          </Section>
        </div>
      ) : null}

      {activeView === "月次集計" ? (
        <Section title="月次集計" description="月次確認や申告準備に使う想定です。月ごとの経費合計、件数、主なカテゴリ、売上に対する経費比率をデモ表示しています。">
          <div className="space-y-4">
            {monthlySummary.map((item) => (
              <div key={item.month} className="grid gap-3 rounded-lg border border-line bg-slate-50 p-4 lg:grid-cols-[150px_1fr_120px_150px_120px_150px] lg:items-center">
                <div>
                  <p className="text-sm font-bold text-ink">{item.label}</p>
                  <p className="text-xs text-muted">月次確認</p>
                </div>
                <div>
                  <div className="h-3 rounded bg-white">
                    <div className="h-3 rounded bg-slate-700" style={{ width: `${Math.max(4, (item.total / maxMonthlyTotal) * 100)}%` }} />
                  </div>
                </div>
                <p className="text-sm font-bold text-ink">{formatCurrency(item.total)}</p>
                <p className="text-sm text-slate-700">{item.count}件 / {item.mainCategory}</p>
                <p className="text-sm font-bold text-slate-700">{formatPercent(item.ratio)}</p>
                <button
                  type="button"
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setCategoryMonth(item.month);
                    setCalendarMonth(item.month);
                    setSelectedDate(firstExpenseDateInMonth(expenses, item.month));
                    setActiveView("項目別集計");
                  }}
                >
                  この月の内訳を見る
                </button>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {activeView === "項目別集計" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Section
            title={`${categoryMonthLabel}の項目別集計`}
            description="表示月を切り替えて、月ごとの経費カテゴリ別内訳を確認できます。確定申告時に経費科目ごとの確認に使える想定です。"
            action={
              <select
                value={categoryMonth}
                onChange={(event) => setCategoryMonth(event.target.value)}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink"
                aria-label="項目別集計の表示月を選択"
              >
                {selectableMonths.map((month) => (
                  <option key={month} value={month}>{formatMonth(month)}</option>
                ))}
              </select>
            }
          >
            <div className="space-y-3">
              {categorySummary.map((item) => {
                const selected = item.category === selectedCategory;
                return (
                  <button
                    type="button"
                    key={item.category}
                    className={`grid w-full gap-3 rounded-lg border p-4 text-left transition lg:grid-cols-[130px_1fr_110px_90px] lg:items-center ${
                      selected ? "border-slate-900 bg-slate-100 shadow-sm" : "border-line bg-slate-50 hover:border-slate-400 hover:bg-white"
                    }`}
                    onClick={() => setSelectedCategory(item.category)}
                  >
                    <div>
                      <p className="font-bold text-ink">{item.category}</p>
                      <p className="text-xs text-muted">{item.count}件</p>
                    </div>
                    <div className="h-3 rounded bg-white">
                      <div className="h-3 rounded bg-slate-700" style={{ width: `${Math.max(3, (item.total / maxCategoryTotal) * 100)}%` }} />
                    </div>
                    <p className="text-sm font-bold text-ink">{formatCurrency(item.total)}</p>
                    <p className="text-sm font-bold text-slate-700">{formatPercent(item.ratio)}</p>
                  </button>
                );
              })}
            </div>
            {categoryMonthExpenses.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-muted">
                この月の経費内訳はありません。
              </div>
            ) : null}
          </Section>

          <Section title="カテゴリ明細" description={`${categoryMonthLabel} / ${selectedCategory} / ${formatCurrency(sumAmount(selectedCategoryItems))} / ${selectedCategoryItems.length}件`}>
            <ExpenseTable items={selectedCategoryItems} />
          </Section>
        </div>
      ) : null}
    </>
  );
}
