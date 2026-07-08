"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { PaymentSummaryItem, PaymentType, Trip } from "@/lib/demoData";

export type CardPaymentBreakdownType = PaymentType | "未判定";

export type FareBreakdown = {
  basicFare: number;
  distanceFare: number;
  pickupFare: number;
  otherFare: number;
  appDispatchFee: number;
};

export type FareItemLabels = Record<keyof FareBreakdown, string>;

export const defaultFareItemLabels: FareItemLabels = {
  basicFare: "基本料金",
  distanceFare: "後続料金",
  pickupFare: "迎車料金",
  otherFare: "各種料金",
  appDispatchFee: "アプリ手配料"
};

export type FareBreakdownRow = {
  key: keyof FareBreakdown;
  label: string;
  amount: number;
  note: string;
};

export function buildFareBreakdownRows(labels: FareItemLabels, breakdown: FareBreakdown): FareBreakdownRow[] {
  return [
    { key: "basicFare", label: labels.basicFare, amount: breakdown.basicFare, note: "営業回数から算出" },
    { key: "distanceFare", label: labels.distanceFare, amount: breakdown.distanceFare, note: "総営収から他内訳を差し引いて算出" },
    { key: "pickupFare", label: labels.pickupFare, amount: breakdown.pickupFare, note: "迎車フラグから算出" },
    { key: "otherFare", label: labels.otherFare, amount: breakdown.otherFare, note: "TF4 Dタリフ料金" },
    { key: "appDispatchFee", label: labels.appDispatchFee, amount: breakdown.appDispatchFee, note: "TF4 F3固定料金" }
  ];
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
  tripCount: number;
  paymentTotals: PaymentSummaryItem[];
  paymentBreakdown: CardPaymentBreakdownItem[];
  trips: CardImportDemoTrip[];
};

type CardImportDemoContextValue = {
  report: CardImportDemoReport | null;
  fareItemLabels: FareItemLabels;
  setReport: (report: CardImportDemoReport) => void;
  setFareItemLabels: (labels: FareItemLabels) => void;
  resetFareItemLabels: () => void;
  clearReport: () => void;
};

const CardImportDemoContext = createContext<CardImportDemoContextValue | null>(null);

export function CardImportDemoProvider({ children }: { children: ReactNode }) {
  const [report, setReportState] = useState<CardImportDemoReport | null>(null);
  const [fareItemLabels, setFareItemLabelsState] = useState<FareItemLabels>(defaultFareItemLabels);

  const value = useMemo<CardImportDemoContextValue>(
    () => ({
      report,
      fareItemLabels,
      setReport: setReportState,
      setFareItemLabels: setFareItemLabelsState,
      resetFareItemLabels: () => setFareItemLabelsState(defaultFareItemLabels),
      clearReport: () => setReportState(null)
    }),
    [report, fareItemLabels]
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
