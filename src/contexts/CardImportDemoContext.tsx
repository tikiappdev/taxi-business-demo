"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { PaymentSummaryItem, PaymentType, Trip } from "@/lib/demoData";

export type CardImportDemoReport = {
  source: "card-import";
  appliedAt: string;
  date: string;
  sales: number;
  cashTotal: number;
  uncollectedTotal: number;
  classifiedTotal: number;
  revenueBalance: number;
  tripCount: number;
  paymentTotals: PaymentSummaryItem[];
  trips: Trip[];
};

type CardImportDemoContextValue = {
  report: CardImportDemoReport | null;
  setReport: (report: CardImportDemoReport) => void;
  clearReport: () => void;
};

const CardImportDemoContext = createContext<CardImportDemoContextValue | null>(null);

export function CardImportDemoProvider({ children }: { children: ReactNode }) {
  const [report, setReportState] = useState<CardImportDemoReport | null>(null);

  const value = useMemo<CardImportDemoContextValue>(
    () => ({
      report,
      setReport: setReportState,
      clearReport: () => setReportState(null)
    }),
    [report]
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
  if (label === "現") return "現金";
  if (label === "C") return "クレジット";
  if (label === "Q") return "QUICPay";
  if (label === "K") return "交通系IC";
  if (label === "ネ") return "ネット決済";
  return "その他";
}
