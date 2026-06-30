"use client";

import { useState } from "react";
import { CheckCircle2, FileUp } from "lucide-react";
import { DemoNotice } from "@/components/DemoNotice";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { csvImports, csvRecordCards, todaySummary } from "@/lib/demoData";
import { formatCurrency } from "@/lib/format";

export default function CsvImportPage() {
  const [fileName, setFileName] = useState("LT27_20260630_D1024_TAXI27.csv");
  const [completed, setCompleted] = useState(false);

  return (
    <>
      <DemoNotice title="CSV取込デモの前提">
        LT27 CSVのF1営業管理、F2出庫、F3入庫、F4営業時系列、FA決済データを読み取り、日報と決済集計へ反映する想定を画面で示しています。現段階ではファイル保存、DB保存、本格解析は行いません。
      </DemoNotice>

      <Section title="CSVファイル選択" description="実ファイルは保存せず、ファイル名と取込プレビューのみ表示します。">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center hover:border-slate-500">
            <FileUp className="mb-3 text-slate-500" size={32} />
            <span className="text-sm font-bold text-ink">CSVファイルを選択</span>
            <span className="mt-1 text-xs text-muted">選択後はファイル名だけ画面状態に保持します</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const selected = event.target.files?.[0]?.name;
                if (selected) {
                  setFileName(selected);
                  setCompleted(false);
                }
              }}
            />
          </label>
          <div className="rounded-lg border border-line bg-white p-4 lg:w-96">
            <p className="text-sm font-medium text-muted">選択中ファイル</p>
            <p className="mt-2 break-all text-base font-bold text-ink">{fileName}</p>
            <button
              className="mt-5 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              onClick={() => setCompleted(true)}
            >
              取込プレビューを確定
            </button>
            {completed ? (
              <p className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                <CheckCircle2 size={16} />
                取込完了しました
              </p>
            ) : null}
          </div>
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="営業件数" value={`${todaySummary.tripCount}件`} sub="F4営業時系列データ" />
        <StatCard label="売上合計" value={formatCurrency(todaySummary.sales)} sub="運賃・料金・決済合算" />
        <StatCard label="決済件数" value="27件" sub="FA決済データ" />
        <StatCard label="出庫/入庫時刻" value={`${todaySummary.departureTime} / ${todaySummary.arrivalTime}`} sub="F2/F3から検出" />
      </div>

      <Section title="取込プレビュー" description="LT27 CSVの主要レコードを業務画面に変換する流れを、商談時に説明しやすい形で表示しています。">
        <div className="mb-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-md border border-line bg-white p-3 text-sm">
            <p className="font-bold text-ink">日報へ反映</p>
            <p className="mt-1 leading-5 text-muted">F2/F3の出入庫時刻とF4の営業明細から、乗務員別の日報を生成する想定です。</p>
          </div>
          <div className="rounded-md border border-line bg-white p-3 text-sm">
            <p className="font-bold text-ink">決済集計へ反映</p>
            <p className="mt-1 leading-5 text-muted">FAの決済種別コードを現金、クレジット、交通系IC、iD、QUICPayなどへ分類します。</p>
          </div>
          <div className="rounded-md border border-line bg-white p-3 text-sm">
            <p className="font-bold text-ink">管理画面へ反映</p>
            <p className="mt-1 leading-5 text-muted">取込履歴、月間カレンダー、売上推移へつなげることで、未取込日や営業なし日を見える化します。</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {csvRecordCards.map((card) => (
            <div key={card.code} className="rounded-lg border border-line bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-white">{card.code}</span>
                <span className="text-sm font-bold text-ink">{card.value}</span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-ink">{card.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted">{card.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="取込済みファイル一覧">
        <div className="overflow-x-auto table-scroll">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-muted">
              <tr>
                <th className="px-3 py-3">ファイル名</th>
                <th className="px-3 py-3">取込日時</th>
                <th className="px-3 py-3">解析結果</th>
                <th className="px-3 py-3 text-right">売上</th>
                <th className="px-3 py-3">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {csvImports.map((item) => (
                <tr key={item.fileName}>
                  <td className="px-3 py-3 font-medium">{item.fileName}</td>
                  <td className="px-3 py-3 text-slate-600">{item.importedAt}</td>
                  <td className="px-3 py-3 text-slate-600">{item.records}</td>
                  <td className="px-3 py-3 text-right font-semibold">{formatCurrency(item.sales)}</td>
                  <td className="px-3 py-3">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
