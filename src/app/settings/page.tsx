"use client";

import { DemoNotice } from "@/components/DemoNotice";
import { Section } from "@/components/Section";
import { companySettings, paymentSummary } from "@/lib/demoData";

export default function SettingsPage() {
  return (
    <>
      <DemoNotice title="設定デモの前提">
        事業者情報、本人・ドライバー情報、車両情報、決済種別マッピング、CSV取込ルールは設定画面の見本です。本実装では認証後に事業者ごとの設定としてDB保存する想定です。
      </DemoNotice>

      <Section
        title="事業者情報"
        action={<button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => alert("保存処理はデモ版のため実行しません。")}>保存</button>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold text-ink">
            事業者名
            <input defaultValue={companySettings.companyName} className="mt-2 w-full rounded-md border border-line px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-bold text-ink">
            管理コード
            <input defaultValue={companySettings.officeCode} className="mt-2 w-full rounded-md border border-line px-3 py-2 font-normal" />
          </label>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="本人・ドライバー情報" description="基本は本人1名の利用を想定し、将来的な補助者や複数アカウントにも拡張できる見せ方です。">
          <div className="space-y-2">
            {companySettings.drivers.map((item) => <p key={item} className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm">{item}</p>)}
          </div>
        </Section>
        <Section title="車両情報">
          <div className="space-y-2">
            {companySettings.vehicles.map((item) => <p key={item} className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm">{item}</p>)}
          </div>
        </Section>
      </div>

      <Section title="決済種別マッピング" description="事業者ごとにCSVの決済コードと画面上の表示名を対応付ける想定です。QR/NETはこのデモ用の独自分類です。">
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          QR決済とネット決済は、LT27 CSV仕様上の標準コードをそのまま示すものではなく、商談時に決済分類の見え方を説明するためのデモ用分類です。
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paymentSummary.map((item) => (
            <div key={item.type} className="rounded-md border border-line bg-slate-50 p-3">
              <p className="font-bold text-ink">{item.type}</p>
              <p className="text-sm text-muted">CSVコード: {item.code}</p>
              {item.type === "QR決済" || item.type === "ネット決済" ? (
                <p className="mt-2 inline-flex rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">デモ用分類</p>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section title="CSV取込ルール" description="個人タクシーの営業CSVを読み取り、日報、決済集計、月次確認へ反映するためのルール例です。">
        <div className="grid gap-3 md:grid-cols-2">
          {companySettings.csvRules.map((item) => (
            <label key={item} className="flex items-center gap-3 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm">
              <input type="checkbox" defaultChecked className="h-4 w-4" />
              {item}
            </label>
          ))}
        </div>
      </Section>
    </>
  );
}
