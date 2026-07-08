export type TfaPaymentRecord = {
  recordNumber: number;
  offset: number;
  allSalesCount: number | null;
  allSalesCountRaw: string;
  salesNumber: number | null;
  salesNumberRaw: string;
  paymentCode: string | null;
  amountCandidate: number | null;
  amountRaw: string;
  timeCandidate: string | null;
  linkKeyCandidate: string | null;
  raw: string;
};

export type TfaParseResult = {
  records: TfaPaymentRecord[];
  markers: Array<{ offset: number; marker: string }>;
  warnings: string[];
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}

function toCode(byte: number) {
  return byte.toString(16).padStart(2, "0").toUpperCase();
}

function decodeBcd(bytes: Uint8Array | null) {
  if (!bytes) {
    return null;
  }

  let text = "";

  for (const byte of bytes) {
    const high = byte >> 4;
    const low = byte & 0x0f;

    if (high > 9 || low > 9) {
      return null;
    }

    text += `${high}${low}`;
  }

  return Number(text);
}

function readBytes(data: Uint8Array, offset: number, length: number) {
  if (offset < 0 || offset + length > data.length) {
    return null;
  }

  return data.slice(offset, offset + length);
}

function decodeBcdTime(bytes: Uint8Array | null) {
  if (!bytes || bytes.length < 2) {
    return null;
  }

  const hour = decodeBcd(bytes.slice(0, 1));
  const minute = decodeBcd(bytes.slice(1, 2));

  if (hour === null || minute === null || hour > 23 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseTfa(buffer: ArrayBuffer): TfaParseResult {
  const data = new Uint8Array(buffer);
  const records: TfaPaymentRecord[] = [];
  const markers: TfaParseResult["markers"] = [];
  const warnings: string[] = [];

  if (data.length < 16) {
    throw new Error("TFAファイルが短すぎるため解析できません。");
  }

  let offset = 0x0010;

  while (offset < data.length) {
    const markerBytes = readBytes(data, offset, 2);
    const markerHex = markerBytes ? bytesToHex(markerBytes).replaceAll(" ", "") : "";

    if (markerHex === "F5F5" || markerHex === "F9F9" || markerHex === "F7F7") {
      markers.push({ offset, marker: markerHex });
      offset += 2;
      continue;
    }

    if (data[offset] !== 0xf1) {
      warnings.push(`0x${offset.toString(16).toUpperCase()} で決済レコード識別子 F1 以外を検出しました。`);
      offset += 1;
      continue;
    }

    const recordStart = offset;
    const fixedEnd = recordStart + 5;

    if (fixedEnd > data.length) {
      warnings.push(`0x${recordStart.toString(16).toUpperCase()} のTFA固定部が途中で終了しました。`);
      break;
    }

    const paymentStart = fixedEnd;
    const paymentEnd = data.indexOf(0xf8, paymentStart);

    if (paymentEnd === -1) {
      warnings.push(`0x${recordStart.toString(16).toUpperCase()} のTFA決済データ終端 F8 が見つかりませんでした。`);
      break;
    }

    const allSalesBytes = readBytes(data, recordStart + 1, 2);
    const salesBytes = readBytes(data, recordStart + 3, 2);
    const paymentBytes = data.slice(paymentStart, paymentEnd);
    const amountBytes = paymentBytes.length >= 4 ? paymentBytes.slice(1, 4) : null;
    const rawBytes = data.slice(recordStart, paymentEnd + 1);
    const paymentCode = paymentBytes.length > 0 ? toCode(paymentBytes[0]) : null;

    records.push({
      recordNumber: records.length + 1,
      offset: recordStart,
      allSalesCount: decodeBcd(allSalesBytes),
      allSalesCountRaw: allSalesBytes ? bytesToHex(allSalesBytes) : "",
      salesNumber: decodeBcd(salesBytes),
      salesNumberRaw: salesBytes ? bytesToHex(salesBytes) : "",
      paymentCode,
      amountCandidate: decodeBcd(amountBytes),
      amountRaw: amountBytes ? bytesToHex(amountBytes) : "",
      timeCandidate: decodeBcdTime(paymentBytes.length >= 6 ? paymentBytes.slice(4, 6) : null),
      linkKeyCandidate: [
        salesBytes ? bytesToHex(salesBytes) : "-",
        amountBytes ? bytesToHex(amountBytes) : "-",
        paymentCode ?? "-"
      ].join(" / "),
      raw: bytesToHex(rawBytes)
    });

    offset = paymentEnd + 1;
  }

  return { records, markers, warnings };
}
