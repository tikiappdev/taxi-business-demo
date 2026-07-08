"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, Download } from "lucide-react";
import { DemoNotice } from "@/components/DemoNotice";
import { Section } from "@/components/Section";
import { buildFareBreakdownRows, useCardImportDemo } from "@/contexts/CardImportDemoContext";
import { dailyReports } from "@/lib/demoData";
import { formatCurrency } from "@/lib/format";

function dummyOutput(label: string) {
  alert(`${label}はデモ版のため実ファイルは作成しません。`);
}

function DailyReportContent() {
  const { report: cardReport, fareItemLabels } = useCardImportDemo();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDate = searchParams.get("date") ?? "2026-06-30";
  const report = dailyReports[selectedDate];
  const availableDates = Object.keys(dailyReports).sort().reverse();

  if (!report) {
    return (
      <>
        <DemoNotice title="日報デモの前提">
          URLの日付に応じて日報デモデータを切り替えます。登録されていない日は空状態を表示します。本実装では事業者ごとの取込済みCSVとDB保存データを参照する想定です。
        </DemoNotice>
        <Section
          title="デモデータ未登録日"
          description="この日付の日報デモデータは登録されていません。カレンダーや日付選択で登録済みの日付を選ぶと、帳票内容が切り替わります。"
          action={
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => router.push(`/daily-report?date=${event.target.value}`)}
              className="rounded-md border border-line px-3 py-2 text-sm"
            />
          }
        >
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-lg font-bold text-ink">{selectedDate}</p>
            <p className="mt-2 text-sm text-muted">デモデータ未登録日です。本実装では事業者ごとのDBから対象日の取込状況と日報を検索する想定です。</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {availableDates.map((date) => (
                <Link key={date} href={`/daily-report?date=${date}`} className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold hover:bg-slate-100">
                  {date}
                </Link>
              ))}
            </div>
          </div>
        </Section>
      </>
    );
  }

  if (report.status === "CSV未取込") {
    return (
      <>
        <DemoNotice title="日報デモの前提">
          URLの日付に応じて日報デモデータを切り替えます。CSV未取込日は、未登録日とは分けて取込待ちの状態として表示します。
        </DemoNotice>
        <Section
          title="CSV未取込日"
          description="この日は営業CSVがまだ取り込まれていない想定です。カレンダー上でも、その日の営業CSVが未取込の日として確認できます。"
          action={
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => router.push(`/daily-report?date=${event.target.value}`)}
              className="rounded-md border border-line px-3 py-2 text-sm"
            />
          }
        >
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="text-lg font-bold text-amber-900">{report.date}</p>
            <p className="mt-2 text-sm leading-6 text-amber-900">{report.note}</p>
            <p className="mt-3 text-sm text-amber-800">本実装ではCSV取込後に、日報、決済集計、カレンダー、月次・確定申告向け集計へ自動反映する想定です。</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {availableDates.map((date) => (
                <Link key={date} href={`/daily-report?date=${date}`} className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-bold hover:bg-amber-100">
                  {date}
                </Link>
              ))}
            </div>
          </div>
        </Section>
      </>
    );
  }

  const reportRows = [
    ["取込状態", report.status],
    ["CSV上の乗務員コード", report.driverCode],
    ["CSV上の車両コード", report.vehicleCode],
    ["出庫時刻", report.departureTime],
    ["入庫時刻", report.arrivalTime],
    ["営業回数", `${report.tripCount}回`],
    ["CSV種別", "F1/F2/F3/F4/FA"]
  ];
  const cardPaymentBreakdownTotal = cardReport?.paymentBreakdown.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const cardFareBreakdownRows = cardReport ? buildFareBreakdownRows(fareItemLabels, cardReport.fareBreakdown) : [];

  return (
    <>
      <DemoNotice title="日報デモの前提">
        日付選択またはカレンダーからの遷移で、日報デモデータが切り替わります。日々の売上確認、決済内訳確認、月次・確定申告向けの元データとして使う想定です。本実装では取込済みCSVとDB保存データから日報を自動生成します。
      </DemoNotice>

      {cardReport ? (
        <Section
          title="カード読込データから作成した日報プレビュー"
          description="メーターSDカードの生データから自動生成した想定の日報プレビューです。既存の日報デモと同じように営業日、出庫/入庫、営業明細を確認できます。"
          action={<span className="rounded bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">カード読込由来</span>}
        >
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
            このデータはデモ用で、リロードすると消えます。DB保存、サーバー送信、既存日報への正式反映は行っていません。
          </div>
          <section className="rounded-lg border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-300 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-500">営業日報</p>
                  <h3 className="mt-1 text-2xl font-bold tracking-normal text-ink">{cardReport.serviceDateLabel}</h3>
                  <p className="mt-2 text-sm text-muted">メーターSDカードのTF4/TFA/SPY解析結果を、日報帳票に近い形で表示しています。</p>
                </div>
                <span className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">デモデータ</span>
              </div>
            </div>

            <div className="grid gap-0 border-b border-slate-300 lg:grid-cols-[1fr_320px]">
              <div className="grid grid-cols-2 border-slate-300 md:grid-cols-3 lg:border-r">
                {[
                  ["営業日", cardReport.date],
                  ["出庫時刻", cardReport.departureTime],
                  ["入庫時刻", cardReport.arrivalTime],
                  ["営業回数", `${cardReport.tripCount}回`],
                  ["乗務員コード候補", cardReport.driverCodeCandidate],
                  ["車両番号候補", cardReport.vehicleCodeCandidate]
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-r border-slate-200 p-4 last:border-r-0 md:last:border-r">
                    <p className="text-xs font-bold text-muted">{label}</p>
                    <p className="mt-2 text-lg font-bold text-ink">{value || "未取得"}</p>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 p-5">
                <p className="text-sm font-bold text-muted">営業収支</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between"><span>総営収</span><span className="font-bold">{formatCurrency(cardReport.sales)}</span></div>
                  <div className="flex justify-between"><span>現収</span><span className="font-bold text-emerald-700">{formatCurrency(cardReport.cashTotal)}</span></div>
                  <div className="flex justify-between"><span>未収</span><span className="font-bold text-sky-700">{formatCurrency(cardReport.uncollectedTotal)}</span></div>
                  <div className="border-t border-line pt-3">
                    <div className="flex justify-between"><span className="font-bold">現収+未収</span><span className="font-bold">{formatCurrency(cardReport.classifiedTotal)}</span></div>
                    <div className="mt-2 flex justify-between"><span className="font-bold">差額</span><span className={`font-bold ${cardReport.revenueBalance === 0 ? "text-emerald-700" : "text-amber-700"}`}>{formatCurrency(cardReport.revenueBalance)}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-5 rounded-lg border border-line bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-base font-bold text-ink">料金内訳</h4>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      基本料金・後続料金・迎車料金・各種料金は総営収の内訳です。{fareItemLabels.appDispatchFee}はTF4のF3固定料金として表示し、現収・未収・決済集計へ別加算していません。
                    </p>
                  </div>
                  <span className="w-fit rounded bg-white px-3 py-2 text-xs font-bold text-slate-700">カード読込由来</span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {cardFareBreakdownRows.map((item) => (
                    <div key={item.key} className={`rounded-md border p-3 ${item.key === "appDispatchFee" ? "border-indigo-200 bg-indigo-50" : "border-line bg-white"}`}>
                      <p className={`text-xs ${item.key === "appDispatchFee" ? "text-indigo-700" : "text-muted"}`}>{item.label}</p>
                      <p className={`mt-1 text-lg font-bold ${item.key === "appDispatchFee" ? "text-indigo-800" : "text-ink"}`}>{formatCurrency(item.amount)}</p>
                      <p className="mt-1 text-xs text-muted">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-5 rounded-lg border border-line bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-base font-bold text-ink">決済種別別内訳</h4>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      カード読込由来の営業明細に紐づいた決済種別ごとの件数・金額です。TFA決済金額は照合用のため二重加算していません。
                    </p>
                  </div>
                  <span className={`w-fit rounded px-3 py-2 text-xs font-bold ${cardPaymentBreakdownTotal === cardReport.sales ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {cardPaymentBreakdownTotal === cardReport.sales ? "総営収と一致" : `差額 ${formatCurrency(cardReport.sales - cardPaymentBreakdownTotal)}`}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {cardReport.paymentBreakdown.map((item) => (
                    <div key={item.type} className="rounded-md border border-line bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-ink">{item.type}</p>
                        <p className="text-xs text-muted">{item.count}件</p>
                      </div>
                      <p className="mt-2 text-lg font-bold text-slate-800">{formatCurrency(item.amount)}</p>
                      <p className="mt-1 text-xs text-muted">コード {item.code}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm">
                  <span className="font-bold text-ink">決済種別別合計</span>
                  <span className="font-bold text-ink">{formatCurrency(cardPaymentBreakdownTotal)}</span>
                </div>
              </div>
              <h4 className="text-base font-bold text-ink">営業明細</h4>
              <div className="mt-3 overflow-x-auto table-scroll">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-muted">
                    <tr>
                      <th className="px-3 py-3">No</th>
                      <th className="px-3 py-3">乗車</th>
                      <th className="px-3 py-3">降車</th>
                      <th className="px-3 py-3">乗車地</th>
                      <th className="px-3 py-3">降車地</th>
                      <th className="px-3 py-3">営業km</th>
                      <th className="px-3 py-3 text-right">合計金額</th>
                      <th className="px-3 py-3 text-right">現収</th>
                      <th className="px-3 py-3 text-right">未収</th>
                      <th className="px-3 py-3 text-right">{fareItemLabels.appDispatchFee}</th>
                      <th className="px-3 py-3">決済種別</th>
                      <th className="px-3 py-3">備考</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {cardReport.trips.map((trip) => (
                      <tr key={trip.id}>
                        <td className="px-3 py-3 font-medium">{trip.no}</td>
                        <td className="px-3 py-3">{trip.start}</td>
                        <td className="px-3 py-3">{trip.end}</td>
                        <td className="px-3 py-3">{trip.from}</td>
                        <td className="px-3 py-3">{trip.to}</td>
                        <td className="px-3 py-3">{trip.distance}</td>
                        <td className="px-3 py-3 text-right font-semibold">{formatCurrency(trip.fare)}</td>
                        <td className="px-3 py-3 text-right text-emerald-700">{trip.cashAmount === null ? "-" : formatCurrency(trip.cashAmount)}</td>
                        <td className="px-3 py-3 text-right text-sky-700">{trip.uncollectedAmount === null ? "-" : formatCurrency(trip.uncollectedAmount)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-indigo-700">{trip.appDispatchFee === null ? "-" : formatCurrency(trip.appDispatchFee)}</td>
                        <td className="px-3 py-3">{trip.payment}</td>
                        <td className="px-3 py-3 text-xs text-muted">{trip.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </Section>
      ) : null}

      <section className="rounded-lg border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-500">営業日報</p>
              <h2 className="mt-1 text-2xl font-bold tracking-normal text-ink">{report.date} 乗務日報</h2>
              <p className="mt-2 text-sm text-muted">LT27 CSV取込結果を日報帳票に反映し、申告・保管用の帳票出力へつなげる表示例です。</p>
              <p className="mt-2 text-sm font-bold text-slate-700">{report.note}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableDates.map((date) => (
                  <Link
                    key={date}
                    href={`/daily-report?date=${date}`}
                    className={`rounded-md border px-3 py-1.5 text-xs font-bold ${
                      date === selectedDate ? "border-slate-900 bg-slate-900 text-white" : "border-line bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {date}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => router.push(`/daily-report?date=${event.target.value}`)}
                className="rounded-md border border-line px-3 py-2 text-sm"
              />
              <button className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50" onClick={() => dummyOutput("日報CSV出力")}>
                <Download className="mr-1 inline" size={16} />
                日報CSV出力
              </button>
              <button className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50" onClick={() => dummyOutput("PDF出力")}>
                <Download className="mr-1 inline" size={16} />
                PDF出力
              </button>
              <button className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50" onClick={() => dummyOutput("印刷")}>
                <Printer className="mr-1 inline" size={16} />
                印刷
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-0 border-b border-slate-300 lg:grid-cols-[1fr_360px]">
          <div className="grid grid-cols-2 border-slate-300 md:grid-cols-3 lg:border-r">
            {reportRows.map(([label, value]) => (
              <div key={label} className="border-b border-r border-slate-200 p-4 last:border-r-0 md:last:border-r">
                <p className="text-xs font-bold text-muted">{label}</p>
                <p className="mt-2 text-lg font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 p-5">
            <p className="text-sm font-bold text-muted">営業収支</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span>売上合計</span><span className="font-bold">{formatCurrency(report.sales)}</span></div>
              <div className="flex justify-between"><span>経費合計</span><span className="font-bold">{formatCurrency(report.expenses)}</span></div>
              <div className="border-t border-line pt-3 text-base">
                <div className="flex justify-between"><span className="font-bold">差引利益</span><span className="font-bold">{formatCurrency(report.profit)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-base font-bold text-ink">決済内訳</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
            {report.payments.map((item) => (
              <div key={item.type} className="rounded-md border border-line bg-slate-50 p-3">
                <p className="text-xs text-muted">{item.type}</p>
                <p className="mt-1 text-lg font-bold text-ink">{formatCurrency(item.amount)}</p>
                <p className="text-xs text-muted">{item.count}件</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section
        title="営業明細"
        description="F4営業時系列データを明細化した想定です。"
        action={
          <span className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">帳票プレビュー</span>
        }
      >
        <div className="overflow-x-auto table-scroll">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-muted">
              <tr>
                <th className="px-3 py-3">営業ID</th>
                <th className="px-3 py-3">開始</th>
                <th className="px-3 py-3">終了</th>
                <th className="px-3 py-3">乗車地</th>
                <th className="px-3 py-3">降車地</th>
                <th className="px-3 py-3">距離</th>
                <th className="px-3 py-3">決済</th>
                <th className="px-3 py-3 text-right">売上</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.trips.map((trip) => (
                <tr key={trip.id}>
                  <td className="px-3 py-3 font-medium">{trip.id}</td>
                  <td className="px-3 py-3">{trip.start}</td>
                  <td className="px-3 py-3">{trip.end}</td>
                  <td className="px-3 py-3">{trip.from}</td>
                  <td className="px-3 py-3">{trip.to}</td>
                  <td className="px-3 py-3">{trip.distance}</td>
                  <td className="px-3 py-3">{trip.payment}</td>
                  <td className="px-3 py-3 text-right font-semibold">{formatCurrency(trip.fare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.trips.length === 0 ? (
            <div className="rounded-b-lg border border-t-0 border-line bg-slate-50 p-6 text-center text-sm text-muted">
              この日は営業明細がありません。
            </div>
          ) : null}
        </div>
      </Section>
    </>
  );
}

export default function DailyReportPage() {
  return (
    <Suspense fallback={<DemoNotice title="日報デモ">日報データを読み込んでいます。</DemoNotice>}>
      <DailyReportContent />
    </Suspense>
  );
}
