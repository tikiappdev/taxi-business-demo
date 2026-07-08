"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, FileUp, ListChecks, RotateCcw } from "lucide-react";
import Link from "next/link";
import { DemoNotice } from "@/components/DemoNotice";
import { Section } from "@/components/Section";
import {
  buildFareBreakdownRows,
  mapCardPaymentBreakdownType,
  mapCardPaymentType,
  useCardImportDemo,
  type CardPaymentBreakdownItem,
  type FareBreakdown
} from "@/contexts/CardImportDemoContext";
import { paymentCodes, type PaymentSummaryItem, type PaymentType } from "@/lib/demoData";
import {
  CARD_FILE_ACCEPT,
  CARD_FILE_EXTENSIONS,
  getFileExtension,
  type CardFileReadResult,
  readCardFileAsArrayBuffer
} from "@/lib/cardFileReader";
import { parseTf4, type Tf4ParseResult } from "@/lib/parseTf4";
import { parseTf2, type Tf2ParseResult } from "@/lib/parseTf2";
import { parseTf3, type Tf3ParseResult } from "@/lib/parseTf3";
import { parseTfa, type TfaParseResult, type TfaPaymentRecord } from "@/lib/parseTfa";
import { parseSpy, type SpyParseResult, type SpyPaymentMaster } from "@/lib/parseSpy";

type Tf2Analysis = {
  fileName: string;
  result: Tf2ParseResult | null;
  error: string | null;
};

type Tf3Analysis = {
  fileName: string;
  result: Tf3ParseResult | null;
  error: string | null;
};

type Tf4Analysis = {
  fileName: string;
  result: Tf4ParseResult | null;
  error: string | null;
};

type TfaAnalysis = {
  fileName: string;
  result: TfaParseResult | null;
  error: string | null;
};

type SpyAnalysis = {
  fileName: string;
  result: SpyParseResult | null;
  error: string | null;
};

type PaymentMatch = {
  payment: TfaPaymentRecord | null;
  master: SpyPaymentMaster | null;
  label: string;
  raw: string;
};

type DailyPreviewRow = {
  id: string;
  no: number;
  boarding: string | null;
  alighting: string | null;
  serviceDate: string | null;
  boardingGps: Tf4ParseResult["records"][number]["boardingGps"];
  alightingGps: Tf4ParseResult["records"][number]["alightingGps"];
  businessKm: number | null;
  totalAmount: number | null;
  tfaPaymentAmount: number | null;
  cashAmount: number | null;
  uncollectedAmount: number | null;
  aggregationAmount: number | null;
  aggregationCategory: "現収" | "未収" | "未判定";
  aggregationMemo: string;
  paymentLabel: string;
  paymentShortName: string;
  hasPickup: boolean | null;
  hasAdvance: boolean | null;
  advanceAmount: number | null;
  otherFare: number | null;
  otherFareRaw: string;
  appDispatchFee: number | null;
  appDispatchFeeRaw: string;
  note: string;
  raw: string;
};

type DutySummary = {
  serviceDate: string | null;
  serviceDateLabel: string;
  departureTime: string | null;
  arrivalTime: string | null;
  driverCodeCandidate: string | null;
  vehicleCodeCandidate: string | null;
};

type LocationLookup = {
  status: "loading" | "success" | "error";
  label: string;
  error?: string;
  raw?: Record<string, unknown>;
};

type Summary = {
  tripCount: number;
  totalRevenue: number;
  cashTotal: number;
  uncollectedTotal: number;
  classifiedTotal: number;
  revenueBalance: number;
  pickupCount: number;
  advanceTotal: number;
  appDispatchFeeTotal: number;
  fareBreakdown: FareBreakdown;
  paymentBreakdown: CardPaymentBreakdownItem[];
};

const paymentBreakdownOrder = ["現金", "クレジット", "交通系IC", "QUICPay", "QR決済", "ネット決済", "その他", "未判定"];
const DEMO_TARIFF_UNIT_FARE = 500;

type SelectionMode = "file" | "folder" | null;

const FOLDER_TARGET_EXTENSIONS = new Set([".TF2", ".TF3", ".TF4", ".TFA", ".SPY"]);

function statusClass(status: CardFileReadResult["status"]) {
  if (status === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "unsupported") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function statusLabel(status: CardFileReadResult["status"]) {
  if (status === "success") {
    return "読込成功";
  }

  if (status === "unsupported") {
    return "対象外";
  }

  return "読込失敗";
}

function formatNullableAmount(value: number | null) {
  return value === null ? "-" : value.toLocaleString();
}

function formatCurrency(value: number | null) {
  return value === null ? "-" : `${value.toLocaleString()}円`;
}

function formatNullableKm(value: number | null) {
  return value === null ? "-" : `${value.toFixed(1)}km`;
}

function formatNullableBoolean(value: boolean | null) {
  if (value === null) {
    return "-";
  }

  return value ? "あり" : "なし";
}

function formatDisplayDate(date: string | null) {
  if (!date) {
    return "未取得";
  }

  const [year, month, day] = date.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function dateFromDateTime(value: string | null) {
  return value?.slice(0, 10) ?? null;
}

function timeFromDateTime(value: string | null) {
  return value?.slice(11, 16) ?? null;
}

function parseDutyHintFromPath(path?: string) {
  if (!path) {
    return { serviceDate: null, departureTime: null };
  }

  const matches = Array.from(path.matchAll(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/g));

  for (const match of matches) {
    const [, year, month, day, hour, minute] = match;
    const monthNumber = Number(month);
    const dayNumber = Number(day);
    const hourNumber = Number(hour);
    const minuteNumber = Number(minute);

    if (monthNumber >= 1 && monthNumber <= 12 && dayNumber >= 1 && dayNumber <= 31 && hourNumber <= 23 && minuteNumber <= 59) {
      return {
        serviceDate: `20${year}-${month}-${day}`,
        departureTime: `${hour}:${minute}`
      };
    }
  }

  return { serviceDate: null, departureTime: null };
}

function coordinateKey(point: DailyPreviewRow["boardingGps"]) {
  if (point.lat === null || point.lon === null) {
    return null;
  }

  return `${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;
}

function formatCoordinate(point: DailyPreviewRow["boardingGps"]) {
  if (point.lat === null || point.lon === null) {
    return `raw 緯度 ${point.latRaw || "-"} / 経度 ${point.lonRaw || "-"}`;
  }

  return `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`;
}

function locationLabel(point: DailyPreviewRow["boardingGps"], lookup?: LocationLookup) {
  if (point.lat === null || point.lon === null) {
    return {
      title: "地名取得不可",
      detail: formatCoordinate(point)
    };
  }

  if (!lookup || lookup.status === "loading") {
    return {
      title: lookup?.status === "loading" ? "取得中" : "未取得",
      detail: formatCoordinate(point)
    };
  }

  if (lookup.status === "success") {
    return {
      title: lookup.label,
      detail: formatCoordinate(point)
    };
  }

  return {
    title: "地名取得不可",
    detail: `${formatCoordinate(point)} / ${lookup.error ?? "取得失敗"}`
  };
}

function formatLocationRaw(lookup?: LocationLookup) {
  if (!lookup) {
    return "API未取得";
  }

  if (lookup.status === "loading") {
    return "API取得中";
  }

  if (lookup.status === "error") {
    return `API取得失敗 ${lookup.error ?? "-"}`;
  }

  return `API表示 ${lookup.label} / raw ${JSON.stringify(lookup.raw ?? {})}`;
}

function matchPayment(
  record: Tf4ParseResult["records"][number],
  payments: TfaPaymentRecord[],
  masters: SpyPaymentMaster[]
): PaymentMatch {
  const payment =
    payments.find((item) => item.salesNumber !== null && item.salesNumber === record.salesNumber) ??
    payments.find((item) => item.amountCandidate !== null && item.amountCandidate === record.uncollectedAmountCandidate) ??
    null;
  const master = payment?.paymentCode ? masters.find((item) => item.paymentCode === payment.paymentCode) ?? null : null;
  const label = master ? `${master.displayName} ${master.paymentName}` : payment?.paymentCode ? `未判定（コード ${payment.paymentCode}）` : "未判定";
  const raw = [
    payment ? `TFA ${payment.raw}` : "TFA 未突合",
    master ? `SPY ${master.raw}` : "SPY 未突合"
  ].join(" / ");

  return { payment, master, label, raw };
}

function isCashPayment(match: PaymentMatch) {
  return match.master?.displayName === "現" || match.payment?.paymentCode === "01";
}

function isUnknownPayment(match: PaymentMatch) {
  return !match.payment || !match.master;
}

function buildDailyPreviewRows(
  analyses: Tf4Analysis[],
  payments: TfaPaymentRecord[],
  masters: SpyPaymentMaster[]
): DailyPreviewRow[] {
  return analyses.flatMap((analysis) => {
    if (!analysis.result) {
      return [];
    }

    return analysis.result.records.map((record) => {
      const paymentMatch = matchPayment(record, payments, masters);
      const isUnknown = isUnknownPayment(paymentMatch);
      const isCash = isCashPayment(paymentMatch);
      const tf4Amount = record.totalAmount;
      const tfaPaymentAmount = paymentMatch.payment?.amountCandidate ?? null;
      const otherFare = record.otherFareCandidate;
      const appDispatchFee = record.appDispatchFeeCandidate;
      const cash = tf4Amount === null || isUnknown ? null : isCash ? tf4Amount : 0;
      const uncollected = tf4Amount === null || isUnknown ? null : isCash ? 0 : tf4Amount;
      const aggregationCategory = isUnknown ? "未判定" : isCash ? "現収" : "未収";
      const aggregationAmount = isUnknown ? null : tf4Amount;
      const paymentShortName = paymentMatch.master?.displayName ?? (paymentMatch.payment?.paymentCode ? `コード${paymentMatch.payment.paymentCode}` : "未判定");
      const normalizedPaymentLabel = mapCardPaymentBreakdownType(paymentShortName);
      const aggregationMemo = isUnknown
        ? "決済種別を確定できないため集計対象外"
        : `TF4合計金額を${aggregationCategory}へ集計。TFA決済金額は照合用で二重加算しません。`;
      const note = isUnknown
        ? `未判定: ${paymentMatch.raw}`
        : `営業番号 ${record.salesNumber ?? "-"} / TFA決済金額候補 ${formatNullableAmount(tfaPaymentAmount)}円 / raw決済 ${paymentMatch.label}`;

      return {
        id: `${analysis.fileName}-${record.recordNumber}`,
        no: record.recordNumber,
        boarding: record.boardingTimeCandidate,
        alighting: record.alightingTimeCandidate,
        serviceDate: record.startedAt?.slice(0, 10) ?? record.endedAt?.slice(0, 10) ?? null,
        boardingGps: record.boardingGps,
        alightingGps: record.alightingGps,
        businessKm: record.businessKmCandidate,
        totalAmount: record.totalAmount,
        tfaPaymentAmount,
        cashAmount: cash,
        uncollectedAmount: uncollected,
        aggregationAmount,
        aggregationCategory,
        aggregationMemo,
        paymentLabel: normalizedPaymentLabel,
        paymentShortName,
        hasPickup: record.hasPickup,
        hasAdvance: record.hasAdvance,
        advanceAmount: record.advanceAmountCandidate,
        otherFare,
        otherFareRaw: `TF4 ${record.otherFareRaw}`,
        appDispatchFee,
        appDispatchFeeRaw: `TF4 ${record.appDispatchFeeRaw}`,
        note,
        raw: paymentMatch.raw
      };
    });
  });
}

function buildSummary(rows: DailyPreviewRow[]): Summary {
  const paymentMap = new Map<string, CardPaymentBreakdownItem>();

  for (const row of rows) {
    const amount = row.aggregationAmount ?? 0;
    const type = mapCardPaymentBreakdownType(row.paymentShortName);
    const current = paymentMap.get(type) ?? {
      type,
      code: type === "未判定" ? "-" : paymentCodes[type],
      amount: 0,
      count: 0
    };
    current.amount += amount;
    current.count += 1;
    paymentMap.set(type, current);
  }

  const totalRevenue = rows.reduce((sum, row) => sum + (row.totalAmount ?? 0), 0);
  const cashTotal = rows.reduce((sum, row) => sum + (row.cashAmount ?? 0), 0);
  const uncollectedTotal = rows.reduce((sum, row) => sum + (row.uncollectedAmount ?? 0), 0);
  const classifiedTotal = cashTotal + uncollectedTotal;
  const pickupCount = rows.filter((row) => row.hasPickup).length;
  const basicFare = rows.length * DEMO_TARIFF_UNIT_FARE;
  const pickupFare = pickupCount * DEMO_TARIFF_UNIT_FARE;
  const otherFare = rows.reduce((sum, row) => sum + (row.otherFare ?? 0), 0);
  const appDispatchFeeTotal = rows.reduce((sum, row) => sum + (row.appDispatchFee ?? 0), 0);
  const distanceFare = Math.max(0, totalRevenue - basicFare - pickupFare - otherFare);

  return {
    tripCount: rows.length,
    totalRevenue,
    cashTotal,
    uncollectedTotal,
    classifiedTotal,
    revenueBalance: totalRevenue - classifiedTotal,
    pickupCount,
    advanceTotal: rows.reduce((sum, row) => sum + (row.advanceAmount ?? 0), 0),
    appDispatchFeeTotal,
    fareBreakdown: {
      basicFare,
      distanceFare,
      pickupFare,
      otherFare,
      appDispatchFee: appDispatchFeeTotal
    },
    paymentBreakdown: Array.from(paymentMap.values()).sort((a, b) => {
      const orderA = paymentBreakdownOrder.indexOf(a.type);
      const orderB = paymentBreakdownOrder.indexOf(b.type);

      if (orderA !== -1 || orderB !== -1) {
        return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
      }

      return b.amount - a.amount;
    })
  };
}

function buildDutySummary(tf4Analyses: Tf4Analysis[], tf2Analyses: Tf2Analysis[], tf3Analyses: Tf3Analysis[], files: CardFileReadResult[]): DutySummary {
  const tf2Result = tf2Analyses.find((analysis) => analysis.result)?.result ?? null;
  const tf3Result = tf3Analyses.find((analysis) => analysis.result)?.result ?? null;
  const records = tf4Analyses.flatMap((analysis) => analysis.result?.records ?? []);
  const serviceDateFromTf4 =
    records.map((record) => dateFromDateTime(record.startedAt ?? record.boardingGps.time)).find(Boolean) ?? null;
  const dutyHint = files.map((file) => parseDutyHintFromPath(file.relativePath ?? file.name)).find((hint) => hint.serviceDate || hint.departureTime);
  const startTimes = records.map((record) => record.startedAt).filter((value): value is string => Boolean(value)).sort();
  const endTimes = records.map((record) => record.endedAt).filter((value): value is string => Boolean(value)).sort();
  const serviceDate = tf2Result?.serviceDateCandidate ?? tf3Result?.serviceDateCandidate ?? dutyHint?.serviceDate ?? serviceDateFromTf4;
  const departureTime = tf2Result?.departureTime ?? dutyHint?.departureTime ?? timeFromDateTime(startTimes[0] ?? null);
  const arrivalTime = tf3Result?.arrivalTime ?? timeFromDateTime(endTimes[endTimes.length - 1] ?? null);
  const driverCodeCandidate = tf2Result?.driverCodeCandidate ?? tf3Result?.driverCodeCandidate ?? null;
  const vehicleCodeCandidate = tf2Result?.vehicleCodeCandidate ?? tf3Result?.vehicleCodeCandidate ?? null;

  return {
    serviceDate,
    serviceDateLabel: serviceDate ? `${formatDisplayDate(serviceDate)}の乗務データ` : "営業日未取得の乗務データ",
    departureTime,
    arrivalTime,
    driverCodeCandidate,
    vehicleCodeCandidate
  };
}

export default function CardImportPage() {
  const { report: appliedReport, fareItemLabels, setReport, clearReport } = useCardImportDemo();
  const [files, setFiles] = useState<CardFileReadResult[]>([]);
  const [tf2Analyses, setTf2Analyses] = useState<Tf2Analysis[]>([]);
  const [tf3Analyses, setTf3Analyses] = useState<Tf3Analysis[]>([]);
  const [tf4Analyses, setTf4Analyses] = useState<Tf4Analysis[]>([]);
  const [tfaAnalyses, setTfaAnalyses] = useState<TfaAnalysis[]>([]);
  const [spyAnalyses, setSpyAnalyses] = useState<SpyAnalysis[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [notice, setNotice] = useState("SDカード内の生データファイルを選択すると、ブラウザ上でArrayBuffer読込を確認します。");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [ignoredFolderFileCount, setIgnoredFolderFileCount] = useState(0);
  const [locations, setLocations] = useState<Record<string, LocationLookup>>({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeApiCallCount, setGeocodeApiCallCount] = useState(0);
  const locationCache = useRef(new Map<string, LocationLookup>());

  const successCount = useMemo(() => files.filter((file) => file.status === "success").length, [files]);
  const failedCount = useMemo(() => files.filter((file) => file.status !== "success").length, [files]);
  const checkFileCount = failedCount + ignoredFolderFileCount;
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const tfaPayments = useMemo(() => tfaAnalyses.flatMap((analysis) => analysis.result?.records ?? []), [tfaAnalyses]);
  const spyMasters = useMemo(() => spyAnalyses.flatMap((analysis) => analysis.result?.masters ?? []), [spyAnalyses]);
  const dailyPreviewRows = useMemo(() => buildDailyPreviewRows(tf4Analyses, tfaPayments, spyMasters), [tf4Analyses, tfaPayments, spyMasters]);
  const summary = useMemo(() => buildSummary(dailyPreviewRows), [dailyPreviewRows]);
  const dutySummary = useMemo(() => buildDutySummary(tf4Analyses, tf2Analyses, tf3Analyses, files), [tf4Analyses, tf2Analyses, tf3Analyses, files]);
  const paymentBreakdownTotal = useMemo(() => summary.paymentBreakdown.reduce((sum, item) => sum + item.amount, 0), [summary.paymentBreakdown]);
  const fareBreakdownRows = useMemo(() => buildFareBreakdownRows(fareItemLabels, summary.fareBreakdown), [fareItemLabels, summary.fareBreakdown]);
  const geocodeReferenceKeys = useMemo(
    () =>
      dailyPreviewRows
        .flatMap((row) => [coordinateKey(row.boardingGps), coordinateKey(row.alightingGps)])
        .filter((key): key is string => Boolean(key)),
    [dailyPreviewRows]
  );
  const uniqueGeocodeKeys = useMemo(() => Array.from(new Set(geocodeReferenceKeys)), [geocodeReferenceKeys]);
  const geocodeCacheSavedCount = geocodeReferenceKeys.length - uniqueGeocodeKeys.length;
  const canApplyDemoData = dailyPreviewRows.length > 0;

  const fetchBoardingAndAlightingLocations = async () => {
    if (uniqueGeocodeKeys.length === 0 || isGeocoding) {
      return;
    }

    setIsGeocoding(true);

    // 地名取得の送信対象はTF4営業明細の乗車地GPS・降車地GPSだけに限定する。
    // DGPなどの走行軌跡データやその他GPSデータはここでは参照しない。
    const requests = uniqueGeocodeKeys.map(async (key) => {
      if (locationCache.current.has(key)) {
        setLocations((current) => ({ ...current, [key]: locationCache.current.get(key) as LocationLookup }));
        return;
      }

      const [lat, lon] = key.split(",");
      const loading = { status: "loading", label: "取得中" } satisfies LocationLookup;
      locationCache.current.set(key, loading);
      setLocations((current) => ({ ...current, [key]: loading }));
      setGeocodeApiCallCount((count) => count + 1);

      const result = await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`)
        .then(async (response) => {
          const data = (await response.json()) as { ok?: boolean; name?: string; error?: string; raw?: LocationLookup["raw"] };

          if (!response.ok || !data.ok) {
            throw new Error(data.error ?? "地名取得に失敗しました。");
          }

          return { status: "success", label: data.name || "地名取得不可", raw: data.raw } satisfies LocationLookup;
        })
        .catch((error) => ({
          status: "error",
          label: "地名取得不可",
          error: error instanceof Error ? error.message : "地名取得に失敗しました。"
        }) satisfies LocationLookup);

      locationCache.current.set(key, result);
      setLocations((current) => ({ ...current, [key]: result }));
    });

    await Promise.all(requests);
    setIsGeocoding(false);
  };

  const handleFiles = async (selectedFiles: FileList | null, mode: Exclude<SelectionMode, null>) => {
    if (!selectedFiles?.length) {
      return;
    }

    const selectedFileArray = Array.from(selectedFiles);
    const targetFiles =
      mode === "folder"
        ? selectedFileArray.filter((file) => FOLDER_TARGET_EXTENSIONS.has(getFileExtension(file.name)))
        : selectedFileArray;
    const ignoredCount = selectedFileArray.length - targetFiles.length;

    setIsReading(true);
    setSelectionMode(mode);
    setIgnoredFolderFileCount(ignoredCount);
    setTf2Analyses([]);
    setTf3Analyses([]);
    setTf4Analyses([]);
    setTfaAnalyses([]);
    setSpyAnalyses([]);
    setLocations({});
    setIsGeocoding(false);
    setGeocodeApiCallCount(0);
    locationCache.current.clear();
    setNotice(
      mode === "folder"
        ? `フォルダ内の対象ファイルを読み込んでいます。対象外 ${ignoredCount}件は読み込みません。元ファイルの変更や保存は行いません。`
        : "選択ファイルを読み込んでいます。元ファイルの変更や保存は行いません。"
    );

    const results = await Promise.all(targetFiles.map((file) => readCardFileAsArrayBuffer(file)));
    const tf2Results = results
      .filter((file) => file.extension === ".TF2" && file.status === "success" && file.buffer)
      .map((file) => {
        try {
          return {
            fileName: file.name,
            result: parseTf2(file.buffer as ArrayBuffer),
            error: null
          };
        } catch (error) {
          return {
            fileName: file.name,
            result: null,
            error: error instanceof Error ? error.message : "TF2解析に失敗しました。"
          };
        }
      });
    const tf3Results = results
      .filter((file) => file.extension === ".TF3" && file.status === "success" && file.buffer)
      .map((file) => {
        try {
          return {
            fileName: file.name,
            result: parseTf3(file.buffer as ArrayBuffer),
            error: null
          };
        } catch (error) {
          return {
            fileName: file.name,
            result: null,
            error: error instanceof Error ? error.message : "TF3解析に失敗しました。"
          };
        }
      });
    const tfaResults = results
      .filter((file) => file.extension === ".TFA" && file.status === "success" && file.buffer)
      .map((file) => {
        try {
          return {
            fileName: file.name,
            result: parseTfa(file.buffer as ArrayBuffer),
            error: null
          };
        } catch (error) {
          return {
            fileName: file.name,
            result: null,
            error: error instanceof Error ? error.message : "TFA解析に失敗しました。"
          };
        }
      });
    const spyResults = results
      .filter((file) => file.extension === ".SPY" && file.status === "success" && file.buffer)
      .map((file) => {
        try {
          return {
            fileName: file.name,
            result: parseSpy(file.buffer as ArrayBuffer),
            error: null
          };
        } catch (error) {
          return {
            fileName: file.name,
            result: null,
            error: error instanceof Error ? error.message : "SPY解析に失敗しました。"
          };
        }
      });
    const tf4Results = results
      .filter((file) => file.extension === ".TF4" && file.status === "success" && file.buffer)
      .map((file) => {
        try {
          return {
            fileName: file.name,
            result: parseTf4(file.buffer as ArrayBuffer),
            error: null
          };
        } catch (error) {
          return {
            fileName: file.name,
            result: null,
            error: error instanceof Error ? error.message : "TF4解析に失敗しました。"
          };
        }
      });

    setFiles(results);
    setTf2Analyses(tf2Results);
    setTf3Analyses(tf3Results);
    setTf4Analyses(tf4Results);
    setTfaAnalyses(tfaResults);
    setSpyAnalyses(spyResults);
    setIsReading(false);

    const readSuccessCount = results.filter((file) => file.status === "success").length;
    const readFailedCount = results.length - readSuccessCount;
    setNotice(
      mode === "folder"
        ? `フォルダ選択で${selectedFileArray.length}件を確認しました。読込対象 ${results.length}件 / 読込成功 ${readSuccessCount}件 / 要確認 ${readFailedCount + ignoredCount}件`
        : `ファイル選択で${results.length}件を確認しました。読込成功 ${readSuccessCount}件 / 要確認 ${readFailedCount}件`
    );
  };

  const resetCardSelection = () => {
    setFiles([]);
    setSelectionMode(null);
    setIgnoredFolderFileCount(0);
    setTf2Analyses([]);
    setTf3Analyses([]);
    setTf4Analyses([]);
    setTfaAnalyses([]);
    setSpyAnalyses([]);
    setLocations({});
    setIsGeocoding(false);
    setGeocodeApiCallCount(0);
    locationCache.current.clear();
    clearReport();
    setNotice("SDカード内の生データファイルを選択すると、ブラウザ上でArrayBuffer読込を確認します。");
  };

  const applyDemoData = () => {
    if (!canApplyDemoData) {
      return;
    }

    const paymentTotals: PaymentSummaryItem[] = summary.paymentBreakdown
      .filter((item): item is PaymentSummaryItem => item.type !== "未判定")
      .map((item) => ({
        type: item.type,
        code: item.code,
        amount: item.amount,
        count: item.count
      }));

    setReport({
      source: "card-import",
      appliedAt: new Date().toLocaleString("ja-JP"),
      date: dutySummary.serviceDate ?? dailyPreviewRows.find((row) => row.serviceDate)?.serviceDate ?? "2026-05-30",
      serviceDateLabel: dutySummary.serviceDateLabel,
      departureTime: dutySummary.departureTime ?? "未取得",
      arrivalTime: dutySummary.arrivalTime ?? "未取得",
      driverCodeCandidate: dutySummary.driverCodeCandidate ?? "未取得",
      vehicleCodeCandidate: dutySummary.vehicleCodeCandidate ?? "未取得",
      sales: summary.totalRevenue,
      cashTotal: summary.cashTotal,
      uncollectedTotal: summary.uncollectedTotal,
      classifiedTotal: summary.classifiedTotal,
      revenueBalance: summary.revenueBalance,
      appDispatchFeeTotal: summary.appDispatchFeeTotal,
      fareBreakdown: summary.fareBreakdown,
      tripCount: summary.tripCount,
      paymentTotals,
      paymentBreakdown: summary.paymentBreakdown,
      trips: dailyPreviewRows.map((row) => ({
        id: `CARD-${String(row.no).padStart(3, "0")}`,
        no: row.no,
        start: row.boarding ?? "-",
        end: row.alighting ?? "-",
        from: locationLabel(row.boardingGps, coordinateKey(row.boardingGps) ? locations[coordinateKey(row.boardingGps) as string] : undefined).title,
        to: locationLabel(row.alightingGps, coordinateKey(row.alightingGps) ? locations[coordinateKey(row.alightingGps) as string] : undefined).title,
        distance: row.businessKm === null ? "-" : `${row.businessKm.toFixed(1)}km`,
        fare: row.totalAmount ?? 0,
        payment: mapCardPaymentType(row.paymentShortName),
        cashAmount: row.cashAmount,
        uncollectedAmount: row.uncollectedAmount,
        appDispatchFee: row.appDispatchFee,
        note: row.note
      }))
    });
  };

  return (
    <>
      <DemoNotice title="カード読込デモの前提">
        タクシーメーターSDカード内の生データを、スマホブラウザから選択して読込確認するための検証画面です。この段階では本番DB保存、サーバー送信、元ファイルの変更は行いません。本実装では読込済みファイルを保存し、営業CSV、日報、決済集計、月次確認へ連携する想定です。
      </DemoNotice>

      <Section
        title="まずメーターSDカードのファイルを読み込む"
        description="デモの最初の操作です。.TF4 / .TFA / .SPY をまとめて選択すると、日報プレビューと集計サマリーへ進めます。"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-xl border-2 border-slate-900 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <FileUp size={32} />
              </span>
              <div className="min-w-0">
                <span className="text-2xl font-bold text-ink">メーターSDカードのデータを選択</span>
                <span className="mt-3 block text-sm leading-6 text-muted">
                  まずここから始めます。PCではフォルダ選択、スマホではファイル選択を使ってください。元ファイルは変更しません。
                </span>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="flex min-h-24 cursor-pointer flex-col justify-center rounded-lg bg-slate-900 px-5 py-4 text-white transition hover:bg-slate-700">
                    <span className="text-base font-bold">フォルダを選択する</span>
                    <span className="mt-1 text-xs font-bold text-slate-200">PC推奨 / フォルダ内の対象拡張子を抽出</span>
                    <input
                      type="file"
                      multiple
                      accept={CARD_FILE_ACCEPT}
                      className="sr-only"
                      {...({ webkitdirectory: "", directory: "" } as { webkitdirectory: string; directory: string })}
                      onChange={(event) => {
                        void handleFiles(event.target.files, "folder");
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <label className="flex min-h-24 cursor-pointer flex-col justify-center rounded-lg border border-slate-300 bg-white px-5 py-4 text-slate-800 transition hover:bg-slate-50">
                    <span className="text-base font-bold">ファイルを選択する</span>
                    <span className="mt-1 text-xs font-bold text-muted">スマホ推奨 / 複数ファイル選択</span>
                    <input
                      type="file"
                      multiple
                      accept={CARD_FILE_ACCEPT}
                      className="sr-only"
                      onChange={(event) => {
                        void handleFiles(event.target.files, "file");
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <span className="mt-3 block text-xs leading-5 text-muted">
                  対象例: .TF4 / .TFA / .SPY / .TF3 / .TF2 など。フォルダ選択時、DGPなど不要ファイルは読み込み対象外として扱います。スマホではフォルダ選択が動かない場合があります。
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-ink">読込状態</p>
            <p className="mt-2 text-sm leading-6 text-muted">{notice}</p>
            <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-muted">
              選択方法: {selectionMode === "folder" ? "フォルダ選択（PC推奨）" : selectionMode === "file" ? "ファイル選択（スマホ推奨）" : "未選択"}
            </p>
            {files.length > 0 && successCount > 0 ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="mt-0.5 shrink-0" size={16} />
                <span>読込完了: {successCount}件を読み込みました。下の日報プレビューと集計サマリーを確認できます。</span>
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs text-muted">選択数</p>
                <p className="mt-1 text-lg font-bold text-ink">{files.length}件</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs text-muted">読込成功</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">{successCount}件</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs text-muted">要確認</p>
                <p className="mt-1 text-lg font-bold text-amber-700">{checkFileCount}件</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs text-muted">合計サイズ</p>
                <p className="mt-1 text-lg font-bold text-ink">{totalSize.toLocaleString()} B</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={resetCardSelection}
            >
              <RotateCcw size={16} />
              選択をクリア
            </button>
          </div>
        </div>
      </Section>

      <Section title="カード読込の流れ" description="ファイルを選択した後、解析結果を日報・決済集計のデモ確認へつなげます。">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { icon: FileUp, title: "1. SDカードのファイルを選択", body: ".TF4 / .TFA / .SPY などの対象ファイルを複数選択します。" },
            { icon: FileSearch, title: "2. メーター生データを自動解析", body: "ブラウザ上でArrayBufferとして読み込み、営業明細と決済候補を解析します。" },
            { icon: ListChecks, title: "3. 日報プレビューを確認", body: "総営収、現収、未収、決済種別、差額を日報風に確認します。" }
          ].map((step) => {
            const Icon = step.icon;

            return (
              <div key={step.title} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{step.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="読込対象拡張子" description="本デモで想定しているタクシーメーターSDカード生データの拡張子です。">
        <div className="flex flex-wrap gap-2">
          {CARD_FILE_EXTENSIONS.map((extension) => (
            <span key={extension} className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
              {extension}
            </span>
          ))}
        </div>
      </Section>

      <Section
        title="選択ファイル一覧"
        description="ファイル内容の解析や保存は行わず、ブラウザでArrayBufferとして読めるかだけを確認します。"
      >
        {isReading ? (
          <p className="rounded-md bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">読込中です...</p>
        ) : null}

        {files.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-ink">まだファイルが選択されていません。</p>
            <p className="mt-2 text-sm text-muted">スマホブラウザでは、SDカードまたは端末内の対象ファイルを複数選択する想定です。</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {files.map((file) => (
              <div key={file.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-bold text-ink">{file.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      拡張子 {file.extension} / サイズ {file.sizeLabel}
                    </p>
                    {file.relativePath ? (
                      <p className="mt-1 break-all font-mono text-xs text-slate-500">フォルダ内パス {file.relativePath}</p>
                    ) : null}
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(file.status)}`}>
                    {statusLabel(file.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-xs text-muted">拡張子</p>
                    <p className="font-bold text-ink">{file.extension}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-xs text-muted">サイズ</p>
                    <p className="font-bold text-ink">{file.sizeLabel}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-xs text-muted">ArrayBuffer</p>
                    <p className="font-bold text-ink">{file.byteLength === null ? "-" : `${file.byteLength.toLocaleString()} bytes`}</p>
                  </div>
                </div>
                <p className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-sm ${statusClass(file.status)}`}>
                  {file.status === "success" ? <CheckCircle2 className="mt-0.5 shrink-0" size={16} /> : <AlertTriangle className="mt-0.5 shrink-0" size={16} />}
                  <span>{file.message}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="日報プレビュー"
        description="TF4営業明細とTFA/SPYの決済候補を突合し、組合・代理店向けデモで日報イメージを確認しやすい形に整えています。保存や既存データへの反映は行いません。"
      >
        {dailyPreviewRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-ink">日報プレビュー対象はまだありません。</p>
            <p className="mt-2 text-sm text-muted">.TF4 / .TFA / .SPY を選択すると、営業明細と決済種別候補を突合した日報風一覧を表示します。</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-muted">読み込みデータ概要</p>
                  <h3 className="mt-1 text-xl font-bold text-ink">{dutySummary.serviceDateLabel}</h3>
                  <p className="mt-2 text-sm text-muted">
                    出庫 {dutySummary.departureTime ?? "未取得"} / 入庫 {dutySummary.arrivalTime ?? "未取得"} / 営業{summary.tripCount}回 / 総営収{formatCurrency(summary.totalRevenue)}
                  </p>
                </div>
                <span className="w-fit rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">カード読込デモ</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs text-muted">営業日</p>
                  <p className="mt-1 font-bold text-ink">{formatDisplayDate(dutySummary.serviceDate)}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs text-muted">出庫</p>
                  <p className="mt-1 font-bold text-ink">{dutySummary.departureTime ?? "未取得"}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs text-muted">入庫</p>
                  <p className="mt-1 font-bold text-ink">{dutySummary.arrivalTime ?? "未取得"}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs text-muted">営業回数</p>
                  <p className="mt-1 font-bold text-ink">{summary.tripCount}回</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs text-muted">総営収</p>
                  <p className="mt-1 font-bold text-ink">{formatCurrency(summary.totalRevenue)}</p>
                </div>
                <div className="rounded-md bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">現収</p>
                  <p className="mt-1 font-bold text-emerald-800">{formatCurrency(summary.cashTotal)}</p>
                </div>
                <div className="rounded-md bg-sky-50 p-3">
                  <p className="text-xs text-sky-700">未収</p>
                  <p className="mt-1 font-bold text-sky-800">{formatCurrency(summary.uncollectedTotal)}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs text-muted">乗務員/車両候補</p>
                  <p className="mt-1 font-bold text-ink">{dutySummary.driverCodeCandidate ?? "未取得"} / {dutySummary.vehicleCodeCandidate ?? "未取得"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">料金内訳</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    基本料金・後続料金・迎車料金・各種料金は総営収の内訳です。{fareItemLabels.appDispatchFee}は総営収に含まれる内訳として表示し、別加算はしていません。
                  </p>
                </div>
                <span className="w-fit rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">名称は設定画面で変更可</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {fareBreakdownRows.map((item) => (
                  <div key={item.key} className={`rounded-md border p-3 ${item.key === "appDispatchFee" ? "border-indigo-200 bg-indigo-50" : "border-line bg-slate-50"}`}>
                    <p className={`text-xs ${item.key === "appDispatchFee" ? "text-indigo-700" : "text-muted"}`}>{item.label}</p>
                    <p className={`mt-1 text-lg font-bold ${item.key === "appDispatchFee" ? "text-indigo-800" : "text-ink"}`}>{formatCurrency(item.amount)}</p>
                    <p className="mt-1 text-xs text-muted">{item.note}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-muted">
                {fareItemLabels.appDispatchFee}はTF4のF3固定料金を参照しています。決済種別別集計や現収・未収へ追加加算しないため、総営収17,500円の照合値は維持されます。
              </p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">乗降地名取得</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    乗車地・降車地の座標のみを地名取得サービスへ送信します。DGP等の走行軌跡データは対象外です。
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  onClick={() => {
                    void fetchBoardingAndAlightingLocations();
                  }}
                  disabled={uniqueGeocodeKeys.length === 0 || isGeocoding}
                >
                  {isGeocoding ? "取得中" : "乗降地名を取得"}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">決済種別別集計</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    TF4合計金額を現収/未収分類で使っている金額ベースで集計しています。TFA決済金額候補は照合用で、総営収へ二重加算しません。
                  </p>
                </div>
                <span className={`w-fit rounded px-3 py-2 text-xs font-bold ${paymentBreakdownTotal === summary.totalRevenue ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {paymentBreakdownTotal === summary.totalRevenue ? "総営収と一致" : `差額 ${formatCurrency(summary.totalRevenue - paymentBreakdownTotal)}`}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {summary.paymentBreakdown.map((item) => (
                  <div key={item.type} className="rounded-md border border-line bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-ink">{item.type}</p>
                      <p className="text-xs text-muted">{item.count}件</p>
                    </div>
                    <p className="mt-2 text-lg font-bold text-slate-800">{formatCurrency(item.amount)}</p>
                    <p className="mt-1 text-xs text-muted">コード {item.code}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span className="font-bold text-ink">決済種別別合計</span>
                <span className="font-bold text-ink">{formatCurrency(paymentBreakdownTotal)}</span>
              </div>
            </div>
            <div className="overflow-x-auto table-scroll">
              <table className="w-full min-w-[1500px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-muted">
                  <tr>
                    <th className="px-3 py-3">No</th>
                    <th className="px-3 py-3">乗車</th>
                    <th className="px-3 py-3">乗車地</th>
                    <th className="px-3 py-3">降車</th>
                    <th className="px-3 py-3">降車地</th>
                    <th className="px-3 py-3 text-right">営業km</th>
                    <th className="px-3 py-3 text-right">合計金額</th>
                    <th className="px-3 py-3 text-right">TF4合計金額</th>
                    <th className="px-3 py-3 text-right">TFA決済金額候補</th>
                    <th className="px-3 py-3 text-right">立替金額候補</th>
                    <th className="px-3 py-3 text-right">{fareItemLabels.appDispatchFee}</th>
                    <th className="px-3 py-3 text-right">集計対象金額</th>
                    <th className="px-3 py-3">集計区分</th>
                    <th className="px-3 py-3 text-right">現収</th>
                    <th className="px-3 py-3 text-right">未収</th>
                    <th className="px-3 py-3">決済種別</th>
                    <th className="px-3 py-3">迎車</th>
                    <th className="px-3 py-3">立替</th>
                    <th className="px-3 py-3">集計メモ</th>
                    <th className="px-3 py-3">備考</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {dailyPreviewRows.map((row) => {
                    const boardingLocation = locationLabel(row.boardingGps, coordinateKey(row.boardingGps) ? locations[coordinateKey(row.boardingGps) as string] : undefined);
                    const alightingLocation = locationLabel(row.alightingGps, coordinateKey(row.alightingGps) ? locations[coordinateKey(row.alightingGps) as string] : undefined);

                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-3 font-semibold">{row.no}</td>
                        <td className="px-3 py-3">{row.boarding ?? <span className="text-muted">未解析</span>}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-ink">{boardingLocation.title}</p>
                          <p className="mt-1 font-mono text-xs text-muted">{boardingLocation.detail}</p>
                        </td>
                        <td className="px-3 py-3">{row.alighting ?? <span className="text-muted">未解析</span>}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-ink">{alightingLocation.title}</p>
                          <p className="mt-1 font-mono text-xs text-muted">{alightingLocation.detail}</p>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">{formatNullableKm(row.businessKm)}</td>
                        <td className="px-3 py-3 text-right font-semibold">{formatCurrency(row.totalAmount)}</td>
                        <td className="px-3 py-3 text-right font-semibold">{formatCurrency(row.totalAmount)}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(row.tfaPaymentAmount)}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(row.advanceAmount)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-indigo-700">{formatCurrency(row.appDispatchFee)}</td>
                        <td className="px-3 py-3 text-right font-semibold">{formatCurrency(row.aggregationAmount)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            row.aggregationCategory === "現収"
                              ? "bg-emerald-50 text-emerald-700"
                              : row.aggregationCategory === "未収"
                                ? "bg-sky-50 text-sky-700"
                                : "bg-amber-50 text-amber-700"
                          }`}>
                            {row.aggregationCategory}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-emerald-700">{formatCurrency(row.cashAmount)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-sky-700">{formatCurrency(row.uncollectedAmount)}</td>
                        <td className="px-3 py-3 font-semibold">{row.paymentLabel}</td>
                        <td className="px-3 py-3">{formatNullableBoolean(row.hasPickup)}</td>
                        <td className="px-3 py-3">{formatNullableBoolean(row.hasAdvance)}</td>
                        <td className="px-3 py-3 text-xs text-slate-600">{row.aggregationMemo}</td>
                        <td className="px-3 py-3 text-xs text-slate-600">{row.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-muted">
              総営収はTF4合計金額の合計、現収/未収は決済種別候補に応じてTF4合計金額を分類しています。乗車地・降車地はTF4のGPS座標を自前API Route経由でNominatim/OpenStreetMapに問い合わせたデモ表示です。
            </p>
            <div className="rounded-md border border-line bg-white px-3 py-3 text-xs text-muted">
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <span className="font-bold text-ink">地名取得デバッグ</span>
                <span>API呼び出し回数 {geocodeApiCallCount}回</span>
                <span>乗降地座標数 {geocodeReferenceKeys.length}件</span>
                <span>ユニーク座標 {uniqueGeocodeKeys.length}件</span>
                <span>同一座標キャッシュ削減 {geocodeCacheSavedCount}回</span>
              </div>
              <p className="mt-2 leading-5">
                地名取得はボタン押下時のみ実行します。送信対象はTF4営業明細の乗車地GPS・降車地GPSだけで、DGP等の走行軌跡やその他GPSデータは送信しません。
              </p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">デモデータ反映</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    この日報プレビューを、リロードで消える一時データとして日報・決済集計画面へ反映します。DB保存やサーバー送信は行いません。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                    onClick={applyDemoData}
                  >
                    デモデータとして反映
                  </button>
                </div>
              </div>
            </div>

            {appliedReport ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-emerald-700" />
                      <p className="text-base font-bold text-emerald-900">反映完了</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-emerald-900">
                      SDカード読込の解析結果を、日報プレビューと決済集計へつながるデモ用一時データとして反映しました。
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">反映日時: {appliedReport.appliedAt} / このデータはデモ用で、リロードすると消えます。</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/daily-report?source=card-import" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
                      日報画面で確認
                    </Link>
                    <Link href="/payments?source=card-import" className="rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100">
                      決済集計で確認
                    </Link>
                    <button
                      type="button"
                      className="rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                      onClick={resetCardSelection}
                    >
                      別のカードデータを読み込む
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Section>

      <Section
        title="集計サマリー"
        description="日報プレビューから営業回数、総営収、現収/未収、総営収との差額、立替候補、決済種別別合計を確認するデモ表示です。"
      >
        {dailyPreviewRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-ink">集計対象はまだありません。</p>
            <p className="mt-2 text-sm text-muted">カード内ファイルを選択すると、解析結果からサマリーを表示します。</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-muted">総営収</p>
                <p className="mt-2 text-2xl font-bold text-ink">{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-xs font-bold text-emerald-700">現収</p>
                <p className="mt-2 text-2xl font-bold text-emerald-800">{formatCurrency(summary.cashTotal)}</p>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-5 shadow-sm">
                <p className="text-xs font-bold text-sky-700">未収</p>
                <p className="mt-2 text-2xl font-bold text-sky-800">{formatCurrency(summary.uncollectedTotal)}</p>
              </div>
              <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-muted">営業回数</p>
                <p className="mt-2 text-2xl font-bold text-ink">{summary.tripCount}件</p>
              </div>
              <div className={`rounded-lg border p-5 shadow-sm ${summary.revenueBalance === 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                <p className={`text-xs font-bold ${summary.revenueBalance === 0 ? "text-emerald-700" : "text-amber-700"}`}>総営収との差額</p>
                <p className={`mt-2 text-2xl font-bold ${summary.revenueBalance === 0 ? "text-emerald-800" : "text-amber-800"}`}>
                  {formatCurrency(summary.revenueBalance)}
                </p>
                <p className={`mt-1 text-xs font-bold ${summary.revenueBalance === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                  {summary.revenueBalance === 0 ? "照合OK" : "要確認"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-line bg-white p-4">
                <p className="text-xs text-muted">現収+未収</p>
                <p className="mt-2 text-xl font-bold text-ink">{formatCurrency(summary.classifiedTotal)}</p>
              </div>
              <div className="rounded-lg border border-line bg-white p-4">
                <p className="text-xs text-muted">迎車回数</p>
                <p className="mt-2 text-xl font-bold text-ink">{summary.pickupCount}回</p>
              </div>
              <div className="rounded-lg border border-line bg-white p-4">
                <p className="text-xs text-muted">立替合計候補</p>
                <p className="mt-2 text-xl font-bold text-ink">{formatCurrency(summary.advanceTotal)}</p>
              </div>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs font-bold text-indigo-700">{fareItemLabels.appDispatchFee}</p>
                <p className="mt-2 text-xl font-bold text-indigo-800">{formatCurrency(summary.appDispatchFeeTotal)}</p>
                <p className="mt-1 text-xs text-indigo-700">TF4 F3固定料金の合計。総営収に含まれる内訳として表示しています。</p>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-white p-4">
              <p className="text-sm font-bold text-ink">決済種別別合計</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {summary.paymentBreakdown.map((item) => (
                  <div key={item.type} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-ink">{item.type}</span>
                      <span className="text-xs text-muted">{item.count}件</span>
                    </div>
                    <p className="mt-1 text-base font-bold text-slate-800">{formatCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-muted">
              現収/未収はTF4合計金額を基準にしたデモ集計です。TFA決済金額候補は突合確認用のため、総営収・現収・未収には二重加算していません。差額が出る場合は、未判定明細または複数決済・立替の扱いを下部rawで確認します。
            </p>
          </div>
        )}
      </Section>

      <Section
        title="詳細解析情報"
        description="TF2/TF3/TF4/TFA/SPYのraw解析結果は、突合内容を確認したい場合だけ開いて確認できます。"
      >
        <details className="rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-ink">TF2/TF3 出庫・入庫解析結果を開く</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold text-ink">TF2 出庫データ</p>
              {tf2Analyses.length === 0 ? (
                <p className="mt-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-muted">TF2解析対象はまだありません。</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {tf2Analyses.map((analysis) => (
                    <div key={analysis.fileName} className="rounded-lg border border-line bg-white p-4">
                      <p className="break-all text-sm font-bold text-ink">{analysis.fileName}</p>
                      {analysis.error ? <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{analysis.error}</p> : null}
                      {analysis.result ? (
                        <div className="mt-3 grid gap-2 text-sm">
                          <div className="rounded-md bg-slate-50 px-3 py-2">
                            <p className="text-xs text-muted">営業日候補 / 出庫時刻</p>
                            <p className="font-bold text-ink">{formatDisplayDate(analysis.result.serviceDateCandidate)} / {analysis.result.departureTime ?? "未取得"}</p>
                          </div>
                          <div className="rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                            primary {analysis.result.raw.primaryDateTime || "-"} / secondary {analysis.result.raw.secondaryDateTime || "-"} / header {analysis.result.raw.header}
                          </div>
                          {analysis.result.warnings.map((warning) => (
                            <p key={warning} className="text-xs text-amber-700">{warning}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-ink">TF3 入庫データ</p>
              {tf3Analyses.length === 0 ? (
                <p className="mt-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-muted">TF3解析対象はまだありません。</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {tf3Analyses.map((analysis) => (
                    <div key={analysis.fileName} className="rounded-lg border border-line bg-white p-4">
                      <p className="break-all text-sm font-bold text-ink">{analysis.fileName}</p>
                      {analysis.error ? <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{analysis.error}</p> : null}
                      {analysis.result ? (
                        <div className="mt-3 grid gap-2 text-sm">
                          <div className="rounded-md bg-slate-50 px-3 py-2">
                            <p className="text-xs text-muted">営業日候補 / 入庫時刻</p>
                            <p className="font-bold text-ink">{formatDisplayDate(analysis.result.serviceDateCandidate)} / {analysis.result.arrivalTime ?? "未取得"}</p>
                          </div>
                          <div className="rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                            primary {analysis.result.raw.primaryDateTime || "-"} / secondary {analysis.result.raw.secondaryDateTime || "-"} / header {analysis.result.raw.header}
                          </div>
                          {analysis.result.warnings.map((warning) => (
                            <p key={warning} className="text-xs text-amber-700">{warning}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </details>

        <details className="rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-ink">TF4解析結果を開く</summary>
          <div className="mt-4">
        {tf4Analyses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-ink">TF4解析対象はまだありません。</p>
            <p className="mt-2 text-sm text-muted">.TF4 ファイルを含めて選択すると、営業明細のプレビューを表示します。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tf4Analyses.map((analysis) => (
              <div key={analysis.fileName} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="break-all text-sm font-bold text-ink">{analysis.fileName}</p>
                    {analysis.result ? (
                      <p className="mt-1 text-xs text-muted">
                        512 bytes単位 / レコード枠 {analysis.result.totalRecordSlots}件 / 明細 {analysis.result.records.length}件
                      </p>
                    ) : null}
                  </div>
                  {analysis.error ? (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">解析エラー</span>
                  ) : (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">解析成功</span>
                  )}
                </div>

                {analysis.error ? (
                  <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{analysis.error}</p>
                ) : null}

                {analysis.result ? (
                  <>
                    <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-muted">
                      <p>先頭16 bytesヘッダ候補: <span className="font-mono text-slate-700">{analysis.result.headerCandidateHex}</span></p>
                      {analysis.result.warnings.map((warning) => (
                        <p key={warning} className="mt-1 text-amber-700">{warning}</p>
                      ))}
                    </div>

                    {analysis.result.records.length === 0 ? (
                      <p className="mt-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-muted">営業明細らしきレコードは見つかりませんでした。</p>
                    ) : (
                      <div className="mt-4 overflow-x-auto table-scroll">
                        <table className="w-full min-w-[920px] text-left text-sm">
                          <thead className="bg-slate-50 text-xs text-muted">
                            <tr>
                              <th className="px-3 py-3">No</th>
                              <th className="px-3 py-3">乗車</th>
                              <th className="px-3 py-3">降車</th>
                              <th className="px-3 py-3 text-right">営業km</th>
                              <th className="px-3 py-3 text-right">合計金額</th>
                              <th className="px-3 py-3 text-right">現収</th>
                              <th className="px-3 py-3 text-right">未収</th>
                              <th className="px-3 py-3">決済種別</th>
                              <th className="px-3 py-3">迎車</th>
                              <th className="px-3 py-3">立替</th>
                              <th className="px-3 py-3">決済raw</th>
                              <th className="px-3 py-3">raw</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {analysis.result.records.map((record) => {
                              const paymentMatch = matchPayment(record, tfaPayments, spyMasters);
                              const boardingKey = coordinateKey(record.boardingGps);
                              const alightingKey = coordinateKey(record.alightingGps);
                              const boardingLookup = boardingKey ? locations[boardingKey] : undefined;
                              const alightingLookup = alightingKey ? locations[alightingKey] : undefined;

                              return (
                                <tr key={`${analysis.fileName}-${record.recordNumber}`}>
                                  <td className="px-3 py-3 font-semibold">{record.recordNumber}</td>
                                  <td className="px-3 py-3">{record.boardingTimeCandidate ?? <span className="text-muted">未解析</span>}</td>
                                  <td className="px-3 py-3">{record.alightingTimeCandidate ?? <span className="text-muted">未解析</span>}</td>
                                  <td className="px-3 py-3 text-right font-semibold">{formatNullableKm(record.businessKmCandidate)}</td>
                                  <td className="px-3 py-3 text-right font-semibold">{formatNullableAmount(record.totalAmount)}</td>
                                  <td className="px-3 py-3 text-right">{formatNullableAmount(record.cashAmountCandidate)}</td>
                                  <td className="px-3 py-3 text-right">{formatNullableAmount(record.uncollectedAmountCandidate)}</td>
                                  <td className="px-3 py-3 font-semibold">{paymentMatch.label}</td>
                                  <td className="px-3 py-3">{formatNullableBoolean(record.hasPickup)}</td>
                                  <td className="px-3 py-3">{formatNullableBoolean(record.hasAdvance)}</td>
                                  <td className="px-3 py-3 font-mono text-xs text-slate-600">{paymentMatch.raw}</td>
                                  <td className="px-3 py-3 font-mono text-xs text-slate-600">
                                    営業番号 {record.salesNumber ?? "-"} ({record.salesNumberRaw || "-"}) / 乗車raw {record.boardingTimeRaw || "-"} / 降車raw {record.alightingTimeRaw || "-"} / 乗車GPS {formatCoordinate(record.boardingGps)} (緯度raw {record.boardingGps.latRaw || "-"} / 経度raw {record.boardingGps.lonRaw || "-"} / status {record.boardingGps.statusRaw || "-"}) / 乗車地API {formatLocationRaw(boardingLookup)} / 降車GPS {formatCoordinate(record.alightingGps)} (緯度raw {record.alightingGps.latRaw || "-"} / 経度raw {record.alightingGps.lonRaw || "-"} / status {record.alightingGps.statusRaw || "-"}) / 降車地API {formatLocationRaw(alightingLookup)} / 営業km累計 {record.businessKmCumulative ?? "-"} ({record.businessKmRaw || "-"}) / 金額raw {record.totalAmountRaw || "-"} / 現収・未収判定 {record.flagRaw ?? "-"} / 立替raw {record.advanceAmountRaw} / 各種料金raw {record.otherFareRaw} / アプリ手配料raw {record.appDispatchFeeRaw} / TF4決済raw {record.paymentLinkRaw}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            ))}
          </div>
        )}
          </div>
        </details>

        <details className="rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-ink">TFA解析結果を開く</summary>
          <div className="mt-4">
        {tfaAnalyses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-ink">TFA解析対象はまだありません。</p>
            <p className="mt-2 text-sm text-muted">.TFA ファイルを含めて選択すると、決済明細候補を表示します。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tfaAnalyses.map((analysis) => (
              <div key={analysis.fileName} className="rounded-lg border border-line bg-white p-4">
                <p className="break-all text-sm font-bold text-ink">{analysis.fileName}</p>
                {analysis.error ? <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{analysis.error}</p> : null}
                {analysis.result ? (
                  <div className="mt-3 overflow-x-auto table-scroll">
                    <table className="w-full min-w-[840px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-muted">
                        <tr>
                          <th className="px-3 py-3">No</th>
                          <th className="px-3 py-3">営業番号候補</th>
                          <th className="px-3 py-3">決済種別コード候補</th>
                          <th className="px-3 py-3 text-right">金額候補</th>
                          <th className="px-3 py-3">時刻候補</th>
                          <th className="px-3 py-3">紐づけ候補</th>
                          <th className="px-3 py-3">raw</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {analysis.result.records.map((record) => (
                          <tr key={`${analysis.fileName}-${record.recordNumber}`}>
                            <td className="px-3 py-3 font-semibold">{record.recordNumber}</td>
                            <td className="px-3 py-3">{record.salesNumber ?? "-"} <span className="font-mono text-xs text-muted">({record.salesNumberRaw})</span></td>
                            <td className="px-3 py-3 font-semibold">{record.paymentCode ?? "-"}</td>
                            <td className="px-3 py-3 text-right font-semibold">{formatNullableAmount(record.amountCandidate)}</td>
                            <td className="px-3 py-3">{record.timeCandidate ?? "-"}</td>
                            <td className="px-3 py-3 font-mono text-xs text-slate-600">{record.linkKeyCandidate ?? "-"}</td>
                            <td className="px-3 py-3 font-mono text-xs text-slate-600">{record.raw}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
          </div>
        </details>

        <details className="rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-ink">SPY解析結果を開く</summary>
          <div className="mt-4">
        {spyAnalyses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-ink">SPY解析対象はまだありません。</p>
            <p className="mt-2 text-sm text-muted">.SPY ファイルを含めて選択すると、決済種別マスタ候補を表示します。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {spyAnalyses.map((analysis) => (
              <div key={analysis.fileName} className="rounded-lg border border-line bg-white p-4">
                <p className="break-all text-sm font-bold text-ink">{analysis.fileName}</p>
                {analysis.error ? <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{analysis.error}</p> : null}
                {analysis.result ? (
                  <div className="mt-3 overflow-x-auto table-scroll">
                    <table className="w-full min-w-[780px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-muted">
                        <tr>
                          <th className="px-3 py-3">No</th>
                          <th className="px-3 py-3">決済種別コード</th>
                          <th className="px-3 py-3">決済種別名</th>
                          <th className="px-3 py-3">表示略称候補</th>
                          <th className="px-3 py-3">raw</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {analysis.result.masters.map((master) => (
                          <tr key={`${analysis.fileName}-${master.recordNumber}`}>
                            <td className="px-3 py-3 font-semibold">{master.recordNumber}</td>
                            <td className="px-3 py-3 font-semibold">{master.paymentCode}</td>
                            <td className="px-3 py-3">{master.paymentName}</td>
                            <td className="px-3 py-3 font-bold">{master.displayName}</td>
                            <td className="px-3 py-3 font-mono text-xs text-slate-600">{master.raw}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
          </div>
        </details>
      </Section>
    </>
  );
}
