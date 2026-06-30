import Link from "next/link";
import { DemoNotice } from "@/components/DemoNotice";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { calendarDays } from "@/lib/demoData";
import { formatCurrency } from "@/lib/format";

export default function CalendarPage() {
  const monthSales = calendarDays.reduce((sum, day) => sum + day.sales, 0);
  const monthExpense = calendarDays.reduce((sum, day) => sum + day.expense, 0);
  const weekSales = calendarDays.slice(24, 30).reduce((sum, day) => sum + day.sales, 0);

  return (
    <>
      <DemoNotice title="カレンダーデモの前提">
        個人タクシーの月間売上、経費、利益、CSV未取込日を固定データで表示しています。本実装では営業CSV取込履歴とDB保存データをもとに、月次確認や確定申告準備、未取込チェックへ対応する想定です。
      </DemoNotice>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="今週合計" value={formatCurrency(weekSales)} sub="6/25 - 6/30 の営業確認" />
        <StatCard label="今月合計" value={formatCurrency(monthSales)} sub={`経費 ${formatCurrency(monthExpense)} / 月次確認用`} />
        <StatCard label="前月比" value="+8.6%" sub="デモ用の固定比較値" />
      </div>

      <Section title="月間カレンダー" description="日付セルをクリックすると、その日の日報画面へ遷移します。その日の営業CSVがまだ取り込まれていない日、営業なし日も日報側で状態を確認できます。">
        <div className="grid grid-cols-7 border-l border-t border-line text-center text-xs font-bold text-muted">
          {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
            <div key={day} className="border-b border-r border-line bg-slate-50 px-2 py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-line">
          {calendarDays.map((day) => {
            const muted = day.status !== "取込済み";
            const highSales = day.sales >= 80000;
            return (
              <Link
                key={day.date}
                href={`/daily-report?date=${day.date}`}
                className={`min-h-32 border-b border-r border-line p-3 text-left transition hover:bg-slate-50 ${
                  day.status === "CSV未取込" ? "bg-amber-50" : muted ? "bg-slate-50" : highSales ? "bg-emerald-50" : "bg-white"
                } block cursor-pointer hover:shadow-inner focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-500`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-ink">{day.day}</span>
                  <span
                    className={`rounded px-2 py-1 text-[11px] font-bold ${
                      day.status === "取込済み"
                        ? "bg-emerald-50 text-emerald-700"
                        : day.status === "CSV未取込"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {day.status}
                  </span>
                </div>
                {day.status === "取込済み" ? (
                  <div className="mt-4 space-y-1 text-xs">
                    {highSales ? <p className="inline-flex rounded bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">売上高め</p> : null}
                    <p>売上 <span className="font-bold">{formatCurrency(day.sales)}</span></p>
                    <p>経費 <span className="font-bold">{formatCurrency(day.expense)}</span></p>
                    <p>利益 <span className="font-bold">{formatCurrency(day.profit)}</span></p>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted">{day.status === "CSV未取込" ? "CSV取込待ち" : "営業データなし"}</p>
                )}
                <p className="mt-3 text-[11px] font-bold text-slate-500">日報を開く</p>
              </Link>
            );
          })}
        </div>
      </Section>
    </>
  );
}
