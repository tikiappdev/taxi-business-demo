"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { PaymentSummaryItem, PaymentType, Trip } from "@/lib/demoData";

export type CardPaymentBreakdownType = PaymentType | "未判定";

export type FareItemKey =
  | "basicFare"
  | "distanceFare"
  | "pickupFare"
  | "reservationFare"
  | "otherFare"
  | "discountFare"
  | "appDispatchFee";

export type FareItemKind = "add" | "subtract";

export type FareItemSetting = {
  defaultName: string;
  displayName: string;
  kind: FareItemKind;
  visible: boolean;
};

export type FareBreakdown = {
  basicFare: number;
  distanceFare: number;
  pickupFare: number;
  reservationFare: number;
  otherFare: number;
  discountFare: number;
  appDispatchFee: number;
};

export type FareItemSettings = Record<FareItemKey, FareItemSetting>;

export const defaultFareItemSettings: FareItemSettings = {
  basicFare: { defaultName: "基本料金", displayName: "基本料金", kind: "add", visible: true },
  distanceFare: { defaultName: "後続料金", displayName: "後続料金", kind: "add", visible: true },
  pickupFare: { defaultName: "迎車料金", displayName: "迎車料金", kind: "add", visible: true },
  reservationFare: { defaultName: "予約料金", displayName: "予約料金", kind: "add", visible: true },
  otherFare: { defaultName: "各種料金", displayName: "各種料金", kind: "add", visible: true },
  discountFare: { defaultName: "各種割引", displayName: "各種割引", kind: "subtract", visible: true },
  appDispatchFee: { defaultName: "アプリ手配料", displayName: "アプリ手配料", kind: "add", visible: true }
};

export type FareItem = {
  key: FareItemKey;
  defaultName: string;
  displayName: string;
  amount: number;
  kind: FareItemKind;
  visible: boolean;
  source: string;
  rawInfo: string;
};

export function buildFareItems(settings: FareItemSettings, breakdown: FareBreakdown): FareItem[] {
  const sources: Record<FareItemKey, { source: string; rawInfo: string }> = {
    basicFare: { source: "営業回数またはTF4解析結果から算出", rawInfo: "営業回数 × 500円" },
    distanceFare: { source: "総営収から他内訳を差し引いて算出", rawInfo: "総営収 - 加算項目 + 減算項目" },
    pickupFare: { source: "TF4 迎車フラグ/迎車金額候補", rawInfo: "0x01DD または迎車フラグ" },
    reservationFare: { source: "TF4 予約料金候補", rawInfo: "0x0027 HEX ×10円" },
    otherFare: { source: "TF4 各種料金候補", rawInfo: "Dタリフ等" },
    discountFare: { source: "TF4 割引候補", rawInfo: "0x0020 符号付き ×10円" },
    appDispatchFee: { source: "TF4 F3固定料金", rawInfo: "0x0045 HEX ×10円" }
  };

  return (Object.keys(settings) as FareItemKey[]).map((key) => ({
    key,
    defaultName: settings[key].defaultName,
    displayName: settings[key].displayName,
    amount: breakdown[key],
    kind: settings[key].kind,
    visible: settings[key].visible,
    source: sources[key].source,
    rawInfo: sources[key].rawInfo
  }));
}

export type CardPaymentBreakdownItem = {
  type: CardPaymentBreakdownType;
  code: string;
  amount: number;
  count: number;
};

export type CardImportDemoTrip = Trip & {
  no: number;
  cashAmount: number | null;
  uncollectedAmount: number | null;
  appDispatchFee: number | null;
  fareBadges: string[];
  note: string;
};

export type CardImportDemoReport = {
  source: "card-import";
  appliedAt: string;
  date: string;
  serviceDateLabel: string;
  departureTime: string;
  arrivalTime: string;
  driverCodeCandidate: string;
  vehicleCodeCandidate: string;
  sales: number;
  cashTotal: number;
  uncollectedTotal: number;
  classifiedTotal: number;
  revenueBalance: number;
  appDispatchFeeTotal: number;
  fareBreakdown: FareBreakdown;
  fareItems: FareItem[];
  tripCount: number;
  paymentTotals: PaymentSummaryItem[];
  paymentBreakdown: CardPaymentBreakdownItem[];
  trips: CardImportDemoTrip[];
};

type CardImportDemoContextValue = {
  report: CardImportDemoReport | null;
  fareItemSettings: FareItemSettings;
  setReport: (report: CardImportDemoReport) => void;
  setFareItemSettings: (settings: FareItemSettings) => void;
  resetFareItemSettings: () => void;
  clearReport: () => void;
};

const CardImportDemoContext = createContext<CardImportDemoContextValue | null>(null);

export function CardImportDemoProvider({ children }: { children: ReactNode }) {
  const [report, setReportState] = useState<CardImportDemoReport | null>(null);
  const [fareItemSettings, setFareItemSettingsState] = useState<FareItemSettings>(defaultFareItemSettings);

  const value = useMemo<CardImportDemoContextValue>(
    () => ({
      report,
      fareItemSettings,
      setReport: setReportState,
      setFareItemSettings: setFareItemSettingsState,
      resetFareItemSettings: () => setFareItemSettingsState(defaultFareItemSettings),
      clearReport: () => setReportState(null)
    }),
    [report, fareItemSettings]
  );

  return <CardImportDemoContext.Provider value={value}>{children}</CardImportDemoContext.Provider>;
}

export function useCardImportDemo() {
  const context = useContext(CardImportDemoContext);

  if (!context) {
    throw new Error("useCardImportDemo must be used inside CardImportDemoProvider");
  }

  return context;
}

export function mapCardPaymentType(label: string): PaymentType {
  const normalized = label.replaceAll("　", " ").trim();

  if (normalized === "現" || normalized.includes("現金")) return "現金";
  if (normalized === "C" || normalized.includes("クレジット")) return "クレジット";
  if (normalized === "Q" || normalized.toUpperCase().includes("QUICPAY")) return "QUICPay";
  if (normalized === "K" || normalized.includes("交通系IC")) return "交通系IC";
  if (normalized === "ネ" || normalized.includes("ネット決済")) return "ネット決済";
  if (normalized === "QR" || normalized.includes("QRコード") || normalized.includes("QR決済")) return "QR決済";
  if (normalized.includes("iD")) return "iD";
  if (normalized.includes("チケット") || normalized.includes("未収")) return "チケット/未収";
  return "その他";
}

export function mapCardPaymentBreakdownType(label: string): CardPaymentBreakdownType {
  if (label === "未判定" || label.startsWith("コード") || label.includes("未判定")) return "未判定";
  return mapCardPaymentType(label);
}
