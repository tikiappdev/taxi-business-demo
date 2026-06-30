import { Banknote, CalendarCheck, CarTaxiFront, FileUp, Fuel, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { DemoNotice } from "@/components/DemoNotice";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { calendarDays, csvImports, monthlyTrend, paymentSummary, todaySummary } from "@/lib/demoData";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export default function DashboardPage() {
  const maxSales = Math.max(...monthlyTrend.map((item) => item.sales));
  const totalPayments = paymentSummary.reduce((sum, item) => sum + item.amount, 0);
  const calendarMonthSales = calendarDays.reduce((sum, day) => sum + day.sales, 0);
  const serviceFlow = ["CSV取込", "日報生成", "決済集計", "カレンダー確認", "経費管理"];

  return (
    <>
      <Section title="サービス概要" description="タクシー事業者の営業CSVを、日々の管理画面へつなげる業務管理デモです。">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-line bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-slate-900 p-2 text-white">
                <FileUp size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">CSV取込後の事務作業を一画面で確認</h3>
                <p className="mt-2 leading-7 text-slate-700">
                  LT27営業CSVの取込を起点に、日報、決済種別別の集計、月間カレンダー、経費登録までをつなげて見せる商談用デモです。
                  本画面では実データ保存を行わず、事業者との運用確認や必要項目のすり合わせに使えるよう固定データで構成しています。
                </p>
              </div>
            </div>
          </div>
          <DemoNotice title="商談用デモの前提">
            これは画面イメージ確認用のデモ表示です。本実装ではCSV解析、DB保存、権限管理、帳票出力を接続する想定です。
          </DemoNotice>
        </div>
      </Section>

      <Section title="利用フロー" description="CSVを取り込んだ後、管理者が確認する流れを画面上で説明できます。">
        <div className="grid gap-3 md:grid-cols-5">
          {serviceFlow.map((step, index) => (
            <div key={step} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-white">{index + 1}</span>
                <CalendarCheck size={18} className="text-slate-500" />
              </div>
              <p className="mt-4 text-sm font-bold text-ink">{step}</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                {index === 0 && "F1/F2/F3/F4/FAを検出した想定でプレビューします。"}
                {index === 1 && "営業明細と決済内訳を日報形式で確認します。"}
                {index === 2 && "現金、カード、IC、QR等を種別別に把握します。"}
                {index === 3 && "日別の売上、経費、利益、未取込日を確認します。"}
                {index === 4 && "燃料代などの経費を利益確認に反映します。"}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="本日売上" value={formatCurrency(todaySummary.sales)} sub="F4営業時系列とFA決済の集計想定" icon={<Banknote size={20} />} />
        <StatCard label="今月売上" value={formatCurrency(calendarMonthSales)} sub="カレンダー今月合計と同一" icon={<TrendingUp size={20} />} />
        <StatCard label="営業回数" value={`${formatNumber(todaySummary.tripCount)}回`} sub="F4レコード件数から算出" icon={<CarTaxiFront size={20} />} />
        <StatCard label="キャッシュレス比率" value={formatPercent(todaySummary.cashlessRatio)} sub="現金以外の決済金額比率" icon={<WalletCards size={20} />} />
        <StatCard label="経費合計" value={formatCurrency(todaySummary.expenses)} sub="ガソリン代・駐車場代など" icon={<Fuel size={20} />} />
        <StatCard label="差引利益" value={formatCurrency(todaySummary.profit)} sub="売上合計 - 経費合計" icon={<ReceiptText size={20} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Section title="最近取り込んだCSV" description="実保存はせず、取込履歴風の固定データを表示しています。">
          <div className="overflow-x-auto table-scroll">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-3">ファイル名</th>
                  <th className="px-3 py-3">取込日時</th>
                  <th className="px-3 py-3">検出レコード</th>
                  <th className="px-3 py-3 text-right">売上</th>
                  <th className="px-3 py-3">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {csvImports.map((item) => (
                  <tr key={item.fileName}>
                    <td className="px-3 py-3 font-medium text-ink">{item.fileName}</td>
                    <td className="px-3 py-3 text-slate-600">{item.importedAt}</td>
                    <td className="px-3 py-3 text-slate-600">{item.records}</td>
                    <td className="px-3 py-3 text-right font-semibold">{formatCurrency(item.sales)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="今日の決済内訳" description="FA決済データの決済種別コードをマッピングした表示です。">
          <div className="space-y-3">
            {paymentSummary.slice(0, 6).map((item) => (
              <div key={item.type}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{item.type}</span>
                  <span className="text-muted">{formatCurrency(item.amount)}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-slate-700" style={{ width: `${(item.amount / totalPayments) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="月間売上推移" description="CSV取込済み日の営業売上を時系列で確認する想定です。">
        <div className="flex h-64 items-end gap-4 overflow-x-auto border-b border-line px-2 pt-4">
          {monthlyTrend.map((item) => (
            <div key={item.label} className="flex min-w-20 flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t bg-slate-700" style={{ height: `${(item.sales / maxSales) * 210}px` }} />
              <p className="text-xs text-muted">{item.label}</p>
              <p className="text-xs font-semibold text-ink">{formatCurrency(item.sales)}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
