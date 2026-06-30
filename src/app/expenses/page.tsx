"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { DemoNotice } from "@/components/DemoNotice";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { expenses as initialExpenses, type ExpenseCategory } from "@/lib/demoData";
import { formatCurrency } from "@/lib/format";

const categories: ExpenseCategory[] = ["ガソリン代", "駐車場代", "保険料", "洗車代", "修理代", "通信費", "その他"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [category, setCategory] = useState<ExpenseCategory>("ガソリン代");
  const [amount, setAmount] = useState("3200");
  const [memo, setMemo] = useState("臨時経費");
  const total = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses]);
  const fuelTotal = useMemo(() => expenses.filter((item) => item.category === "ガソリン代").reduce((sum, item) => sum + item.amount, 0), [expenses]);
  const parkingTotal = useMemo(() => expenses.filter((item) => item.category === "駐車場代").reduce((sum, item) => sum + item.amount, 0), [expenses]);
  const otherTotal = total - fuelTotal - parkingTotal;

  return (
    <>
      <DemoNotice title="経費管理デモの前提">
        経費追加は画面上だけに一時反映され、保存は行いません。本実装ではDB保存、領収書画像アップロード、日報や月次利益への自動反映を想定しています。
      </DemoNotice>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="今月経費" value={formatCurrency(total)} sub="1週間分デモ経費の合計" />
        <StatCard label="ガソリン代" value={formatCurrency(fuelTotal)} sub="日報・カレンダーの経費と連動想定" />
        <StatCard label="駐車場代" value={formatCurrency(parkingTotal)} sub="待機場・一時駐車のサンプル" />
        <StatCard label="その他経費" value={formatCurrency(otherTotal)} sub="修理代、通信費、洗車代など" />
      </div>

      <Section title="経費追加フォーム" description="追加内容は画面上の一覧に一時反映するだけで、保存は行いません。">
        <div className="grid gap-3 lg:grid-cols-[150px_160px_140px_1fr_150px_auto]">
          <label className="text-xs font-bold text-muted">
            日付
            <input type="date" defaultValue="2026-06-30" className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-normal text-ink" />
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
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-normal text-ink" defaultValue="現金">
              <option>現金</option>
              <option>法人カード</option>
              <option>口座振替</option>
            </select>
          </label>
          <button
            className="self-end rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            onClick={() => {
              const numericAmount = Number(amount) || 0;
              setExpenses((current) => [
                { id: `EX-${String(current.length + 1).padStart(3, "0")}`, date: "2026-06-30", category, amount: numericAmount, method: "現金", memo },
                ...current
              ]);
            }}
          >
            追加
          </button>
        </div>
        <button className="mt-4 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold" onClick={() => alert("領収書画像アップロードはデモ版のためボタンのみです。")}>
          <Upload className="mr-1 inline" size={16} />
          領収書画像アップロード
        </button>
      </Section>

      <Section title="経費一覧" description={`合計 ${formatCurrency(total)}`}>
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
              {expenses.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">{item.date}</td>
                  <td className="px-3 py-3 font-medium">{item.category}</td>
                  <td className="px-3 py-3 text-right font-semibold">{formatCurrency(item.amount)}</td>
                  <td className="px-3 py-3">{item.method}</td>
                  <td className="px-3 py-3 text-slate-600">{item.memo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
