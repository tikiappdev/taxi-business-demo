"use client";

import { DemoNotice } from "@/components/DemoNotice";
import { Section } from "@/components/Section";
import { defaultFareItemLabels, useCardImportDemo, type FareItemLabels } from "@/contexts/CardImportDemoContext";
import { companySettings, paymentSummary } from "@/lib/demoData";

const fareLabelFields: Array<{ key: keyof FareItemLabels; label: string; hint: string }> = [
  { key: "basicFare", label: "基本料金", hint: "例: Aタリフ初乗り、基本料金" },
  { key: "distanceFare", label: "後続料金", hint: "例: Bタリフ、加算料金、後続料金" },
  { key: "pickupFare", label: "迎車料金", hint: "例: 迎車料金、配車迎車料" },
  { key: "otherFare", label: "各種料金", hint: "例: Dタリフ、各種料金、時間指定料" },
  { key: "appDispatchFee", label: "アプリ手配料", hint: "例: F3固定料金、アプリ手配料" }
];

export default function SettingsPage() {
  const { fareItemLabels, setFareItemLabels, resetFareItemLabels } = useCardImportDemo();

  const updateFareLabel = (key: keyof FareItemLabels, value: string) => {
    setFareItemLabels({
      ...fareItemLabels,
      [key]: value
    });
  };

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

      <Section
        title="料金項目名称設定"
        description="顧客ごとにタリフ名称や手配料名称が異なる前提で、カード読込・日報の料金内訳ラベルを画面上だけ変更できます。"
        action={
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700" onClick={resetFareItemLabels}>
              初期値に戻す
            </button>
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => alert("料金項目名称の保存はデモ版のため実行しません。")}>
              保存
            </button>
          </div>
        }
      >
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
          デモ設定のため、ページ遷移中だけ反映されます。DB保存やlocalStorage保存は行わず、リロードすると初期値に戻ります。
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fareLabelFields.map((field) => (
            <label key={field.key} className="text-sm font-bold text-ink">
              {field.label}
              <input
                value={fareItemLabels[field.key]}
                onChange={(event) => updateFareLabel(field.key, event.target.value || defaultFareItemLabels[field.key])}
                className="mt-2 w-full rounded-md border border-line px-3 py-2 font-normal"
              />
              <span className="mt-1 block text-xs font-normal leading-5 text-muted">{field.hint}</span>
            </label>
          ))}
        </div>
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-muted">
          今回はカード読込デモの表示名確認用です。本実装では事業者別・タリフ別の設定としてDBに保存し、帳票や集計表示へ反映する想定です。
        </p>
      </Section>

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
