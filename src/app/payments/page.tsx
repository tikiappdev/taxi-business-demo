"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { DemoNotice } from "@/components/DemoNotice";
import { Section } from "@/components/Section";
import { buildFareItems, useCardImportDemo, type FareItem } from "@/contexts/CardImportDemoContext";
import { paymentAggregates, paymentDetails, type PaymentPeriod, type PaymentType, type ReconciliationStatus } from "@/lib/demoData";
import { formatCurrency, formatPercent } from "@/lib/format";

const tabs: PaymentPeriod[] = ["日次", "週次", "月次", "期間指定"];
const reconciliationOptions: ReconciliationStatus[] = ["突合済み", "差額あり", "未入金"];
type DetailStatusFilter = "すべて" | ReconciliationStatus | "未入金・差額あり";
const statusFilters: DetailStatusFilter[] = ["すべて", "突合済み", "差額あり", "未入金", "未入金・差額あり"];

function formatFareItemAmount(item: FareItem) {
  const signedAmount = item.kind === "subtract" ? -Math.abs(item.amount) : item.amount;
  return formatCurrency(signedAmount);
}

function detailPeriods(active: PaymentPeriod): PaymentPeriod[] {
  if (active === "日次") return ["日次"];
  if (active === "週次") return ["日次", "週次"];
  return ["日次", "週次", "月次", "期間指定"];
}

function reconciliationBadge(status: ReconciliationStatus) {
  const styles: Record<ReconciliationStatus, string> = {
    突合済み: "bg-emerald-50 text-emerald-700",
    差額あり: "bg-rose-50 text-rose-700",
    未入金: "bg-amber-50 text-amber-700"
  };
  return <span className={`rounded px-2 py-1 text-xs font-bold ${styles[status]}`}>{status}</span>;
}

export default function PaymentsPage() {
  const { report: cardReport, fareItemSettings } = useCardImportDemo();
  const [active, setActive] = useState<PaymentPeriod>("日次");
  const [selectedType, setSelectedType] = useState<PaymentType>("現金");
  const [statusFilter, setStatusFilter] = useState<DetailStatusFilter>("すべて");
  const [statusEdits, setStatusEdits] = useState<Record<string, ReconciliationStatus>>({});
  const [memoEdits, setMemoEdits] = useState<Record<string, string>>({});
  const aggregate = paymentAggregates[active];
  const total = aggregate.summary.reduce((sum, item) => sum + item.amount, 0);
  const max = Math.max(...aggregate.summary.map((item) => item.amount));
  const selectedSummary = aggregate.summary.find((item) => item.type === selectedType);
  const visibleDetails = paymentDetails.filter((detail) => detail.type === selectedType && detailPeriods(active).includes(detail.period));
  const statusFor = (id: string, fallback: ReconciliationStatus) => statusEdits[id] ?? fallback;
  const filterCounts: Record<DetailStatusFilter, number> = {
    すべて: visibleDetails.length,
    突合済み: visibleDetails.filter((detail) => statusFor(detail.id, detail.reconciliationStatus) === "突合済み").length,
    差額あり: visibleDetails.filter((detail) => statusFor(detail.id, detail.reconciliationStatus) === "差額あり").length,
    未入金: visibleDetails.filter((detail) => statusFor(detail.id, detail.reconciliationStatus) === "未入金").length,
    "未入金・差額あり": visibleDetails.filter((detail) => {
      const status = statusFor(detail.id, detail.reconciliationStatus);
      return status === "未入金" || status === "差額あり";
    }).length
  };
  const filteredDetails = visibleDetails.filter((detail) => {
    const status = statusFor(detail.id, detail.reconciliationStatus);
    if (statusFilter === "すべて") return true;
    if (statusFilter === "未入金・差額あり") return status === "未入金" || status === "差額あり";
    return status === statusFilter;
  });
  const cardPaymentBreakdownTotal = cardReport?.paymentBreakdown.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const cardFareItems = cardReport ? buildFareItems(fareItemSettings, cardReport.fareBreakdown).filter((item) => item.visible) : [];

  return (
    <>
      <DemoNotice title="決済集計デモの前提">
        FA決済データを読み取った想定の固定集計です。キャッシュレス決済や現金売上を確認し、入金確認のために明細ごとに「突合済み」「差額あり」「未入金」を管理できる見せ方にしています。ステータスと備考の変更、絞り込みはデモ表示です。本実装では事業者ごとのDBに保存予定です。
      </DemoNotice>

      {cardReport ? (
        <Section
          title="カード読込データから作成した決済集計"
          description="メーターSDカードの決済情報をもとに自動集計した想定のプレビューです。既存の決済集計デモとは別枠で表示しています。"
          action={<span className="rounded bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">カード読込由来</span>}
        >
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
            このデータはデモ用で、リロードすると消えます。DB保存、サーバー送信、既存決済集計への正式反映は行っていません。
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="text-xs text-muted">営業日</p>
              <p className="mt-2 text-lg font-bold text-ink">{cardReport.serviceDateLabel}</p>
              <p className="mt-1 text-xs text-muted">出庫 {cardReport.departureTime} / 入庫 {cardReport.arrivalTime}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="text-xs text-muted">総営収</p>
              <p className="mt-2 text-lg font-bold text-ink">{formatCurrency(cardReport.sales)}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="text-xs text-muted">現収+未収</p>
              <p className="mt-2 text-lg font-bold text-ink">{formatCurrency(cardReport.classifiedTotal)}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="text-xs text-muted">総営収との差額</p>
              <p className={`mt-2 text-lg font-bold ${cardReport.revenueBalance === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                {formatCurrency(cardReport.revenueBalance)}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-line bg-white p-4">
            <p className="text-sm font-bold text-ink">料金内訳補足</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              決済種別別集計には加算せず、総営収に含まれる料金内訳として確認します。設定画面の表示名・加算/減算・表示有無を反映します。
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {cardFareItems.map((item) => (
                <div key={item.key} className={`rounded-md border p-3 ${item.kind === "subtract" ? "border-rose-200 bg-rose-50" : item.key === "appDispatchFee" ? "border-indigo-200 bg-indigo-50" : "border-line bg-slate-50"}`}>
                  <p className={`text-xs ${item.kind === "subtract" ? "text-rose-700" : item.key === "appDispatchFee" ? "text-indigo-700" : "text-muted"}`}>{item.displayName}</p>
                  <p className={`mt-1 font-bold ${item.kind === "subtract" ? "text-rose-800" : item.key === "appDispatchFee" ? "text-indigo-800" : "text-ink"}`}>{formatFareItemAmount(item)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-line bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-ink">カード読込由来の決済種別別集計</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  営業明細に紐づいた決済種別ごとの件数・金額です。TFA決済金額は照合用で、総営収には二重加算していません。
                </p>
              </div>
              <span className={`w-fit rounded px-3 py-2 text-xs font-bold ${cardPaymentBreakdownTotal === cardReport.sales ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {cardPaymentBreakdownTotal === cardReport.sales ? "総営収と一致" : `差額 ${formatCurrency(cardReport.sales - cardPaymentBreakdownTotal)}`}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {cardReport.paymentBreakdown.map((item) => (
                <div key={item.type} className="rounded-md border border-line bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-ink">{item.type}</p>
                    <p className="text-xs text-muted">コード {item.code}</p>
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-800">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-muted">{item.count}件</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span className="font-bold text-ink">決済種別別合計</span>
              <span className="font-bold text-ink">{formatCurrency(cardPaymentBreakdownTotal)}</span>
            </div>
          </div>
        </Section>
      ) : null}

      <Section
        title="決済集計"
        description={`選択中の集計期間: ${aggregate.label}。FA決済データの決済種別コードを、個人タクシーの入金確認で見やすい種別へ対応付けた想定です。`}
        action={
          <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white" onClick={() => alert("CSV出力はデモ版のため実ファイルを作成しません。")}>
            <Download className="mr-1 inline" size={16} />
            CSV出力
          </button>
        }
      >
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`rounded-md border px-4 py-2 text-sm font-bold ${
                active === tab ? "border-slate-900 bg-slate-900 text-white" : "border-line bg-white text-slate-700"
              }`}
              onClick={() => setActive(tab)}
            >
              {tab}
            </button>
          ))}
          {active === "期間指定" ? (
            <div className="flex gap-2">
              <input type="date" defaultValue="2026-06-01" className="rounded-md border border-line px-3 py-2 text-sm" />
              <input type="date" defaultValue="2026-06-30" className="rounded-md border border-line px-3 py-2 text-sm" />
            </div>
          ) : null}
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
            {aggregate.range}
          </span>
        </div>
        <div className="space-y-4">
          {aggregate.summary.map((item) => {
            const activeType = item.type === selectedType;
            return (
            <button
              key={item.type}
              className={`grid w-full gap-3 rounded-lg border p-4 text-left transition lg:grid-cols-[180px_1fr_120px_100px] lg:items-center ${
                activeType ? "border-slate-900 bg-slate-100 shadow-sm" : "border-line bg-slate-50 hover:border-slate-400 hover:bg-white"
              }`}
              onClick={() => setSelectedType(item.type)}
            >
              <div>
                <p className="font-bold text-ink">{item.type}</p>
                <p className="text-xs text-muted">コード {item.code}</p>
                {activeType ? <p className="mt-1 text-xs font-bold text-slate-700">選択中</p> : null}
              </div>
              <div>
                <div className="h-3 rounded bg-white">
                  <div className="h-3 rounded bg-slate-700" style={{ width: `${Math.max(3, (item.amount / max) * 100)}%` }} />
                </div>
              </div>
              <div className="text-sm">
                <p className="font-bold">{formatCurrency(item.amount)}</p>
                <p className="text-xs text-muted">{item.count}件</p>
              </div>
              <p className="text-sm font-bold text-slate-700">{formatPercent((item.amount / total) * 100)}</p>
            </button>
          );})}
        </div>
      </Section>

      <Section
        title="決済利用明細"
        description={`選択中: ${selectedType} / ${active}。未入金・差額ありだけを絞り込んで確認できます。ステータスと備考の変更、絞り込みはデモ表示です。本実装では事業者ごとのDBに保存予定です。`}
        action={<span className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">表示 {filteredDetails.length}件 / 全{visibleDetails.length}件</span>}
      >
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="text-xs text-muted">選択中の決済種別</p>
            <p className="mt-1 text-lg font-bold text-ink">{selectedType}</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="text-xs text-muted">集計金額</p>
            <p className="mt-1 text-lg font-bold text-ink">{formatCurrency(selectedSummary?.amount ?? 0)}</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="text-xs text-muted">突合済み</p>
            <p className="mt-1 text-lg font-bold text-ink">{visibleDetails.filter((detail) => (statusEdits[detail.id] ?? detail.reconciliationStatus) === "突合済み").length}件</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="text-xs text-muted">未入金/差額あり</p>
            <p className="mt-1 text-lg font-bold text-ink">
              {visibleDetails.filter((detail) => {
                const status = statusEdits[detail.id] ?? detail.reconciliationStatus;
                return status === "未入金" || status === "差額あり";
              }).length}件
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-line bg-slate-50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink">突合ステータスで絞り込み</p>
            <p className="text-xs text-muted">未入金・差額ありは要確認明細の確認用です。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const selected = statusFilter === filter;
              const attention = filter === "未入金・差額あり";
              return (
                <button
                  key={filter}
                  className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                    selected
                      ? attention
                        ? "border-amber-700 bg-amber-100 text-amber-900"
                        : "border-slate-900 bg-slate-900 text-white"
                      : attention
                        ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "border-line bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter} {filterCounts[filter]}件
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line table-scroll">
          <table className="w-full min-w-[860px] text-left text-sm">
            <colgroup>
              <col className="w-36" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-28" />
              <col />
              <col className="w-24" />
              <col className="w-24" />
            </colgroup>
            <thead className="bg-slate-50 text-xs text-muted">
              <tr>
                <th className="whitespace-nowrap px-3 py-3">利用日時</th>
                <th className="whitespace-nowrap px-3 py-3">決済種別</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">決済金額</th>
                <th className="whitespace-nowrap px-3 py-3">突合ステータス</th>
                <th className="px-3 py-3">備考</th>
                <th className="whitespace-nowrap px-3 py-3">CSV乗務員コード</th>
                <th className="whitespace-nowrap px-3 py-3">CSV車両コード</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredDetails.map((detail) => {
                const currentStatus = statusFor(detail.id, detail.reconciliationStatus);
                const currentMemo = memoEdits[detail.id] ?? detail.memo;
                return (
                <tr key={detail.id}>
                  <td className="whitespace-nowrap px-3 py-3 font-medium">{detail.usedAt}</td>
                  <td className="whitespace-nowrap px-3 py-3">{detail.type}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold">{formatCurrency(detail.amount)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-2">
                      {reconciliationBadge(currentStatus)}
                      <select
                        value={currentStatus}
                        onChange={(event) => setStatusEdits((current) => ({ ...current, [detail.id]: event.target.value as ReconciliationStatus }))}
                        className="rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-ink"
                        aria-label={`${detail.id}の突合ステータス`}
                      >
                        {reconciliationOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="min-w-56 px-3 py-3">
                    <input
                      value={currentMemo}
                      onChange={(event) => setMemoEdits((current) => ({ ...current, [detail.id]: event.target.value }))}
                      className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink"
                      placeholder="備考を入力"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{detail.driverCode}</td>
                  <td className="whitespace-nowrap px-3 py-3">{detail.vehicleCode}</td>
                </tr>
              );})}
            </tbody>
          </table>
          {visibleDetails.length === 0 ? (
            <div className="rounded-b-lg border border-t-0 border-line bg-slate-50 p-6 text-center text-sm text-muted">
              選択中の期間・決済種別に該当する明細デモデータはありません。
            </div>
          ) : null}
          {visibleDetails.length > 0 && filteredDetails.length === 0 ? (
            <div className="rounded-b-lg border border-t-0 border-line bg-slate-50 p-6 text-center text-sm text-muted">
              該当する明細はありません。
            </div>
          ) : null}
        </div>
      </Section>
    </>
  );
}
