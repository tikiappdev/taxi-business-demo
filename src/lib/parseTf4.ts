const TF4_RECORD_SIZE = 512;
const TF4_HEADER_CANDIDATE_SIZE = 16;

type NullableBoolean = boolean | null;

export type Tf4GpsPoint = {
  lat: number | null;
  lon: number | null;
  latRaw: string;
  lonRaw: string;
  statusRaw: string;
  time: string | null;
  timeRaw: string;
};

export type Tf4SalesRecord = {
  recordNumber: number;
  recordOffset: number;
  salesNumber: number | null;
  salesNumberRaw: string;
  boardingTimeCandidate: string | null;
  boardingTimeRaw: string;
  alightingTimeCandidate: string | null;
  alightingTimeRaw: string;
  boardingGps: Tf4GpsPoint;
  alightingGps: Tf4GpsPoint;
  businessKmCandidate: number | null;
  businessKmRaw: string;
  businessKmCumulative: number | null;
  totalAmount: number | null;
  totalAmountRaw: string;
  cashAmountCandidate: number | null;
  uncollectedAmountCandidate: number | null;
  advanceAmountCandidate: number | null;
  advanceAmountRaw: string;
  pickupFareCandidate: number | null;
  pickupFareRaw: string;
  reservationFareCandidate: number | null;
  reservationFareRaw: string;
  otherFareCandidate: number | null;
  otherFareRaw: string;
  discountFareCandidate: number | null;
  discountFareRaw: string;
  appDispatchFeeCandidate: number | null;
  appDispatchFeeRaw: string;
  startedAt: string | null;
  startedAtRaw: string;
  endedAt: string | null;
  endedAtRaw: string;
  hasPickup: NullableBoolean;
  hasUncollected: NullableBoolean;
  hasAdvance: NullableBoolean;
  flagRaw: string | null;
  paymentLinkRaw: string;
};

export type Tf4ParseResult = {
  recordSize: number;
  headerCandidateHex: string;
  totalRecordSlots: number;
  records: Tf4SalesRecord[];
  warnings: string[];
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}

function readBytes(view: DataView, offset: number, length: number) {
  if (offset < 0 || offset + length > view.byteLength) {
    return null;
  }

  return new Uint8Array(view.buffer, view.byteOffset + offset, length);
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

function parseBcdDateTime(bytes: Uint8Array | null) {
  const raw = bytes ? bytesToHex(bytes) : "";

  if (!bytes) {
    return { value: null, raw };
  }

  const values = Array.from(bytes).map((byte) => {
    const high = byte >> 4;
    const low = byte & 0x0f;

    if (high > 9 || low > 9) {
      return null;
    }

    return high * 10 + low;
  });

  if (values.some((value) => value === null)) {
    return { value: null, raw };
  }

  const [year, month, day, hour, minute, second] = values as number[];
  const valid =
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59;

  if (!valid || values.every((value) => value === 0)) {
    return { value: null, raw };
  }

  return {
    value: `20${String(year).padStart(2, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`,
    raw
  };
}

function decodeGpsCoordinate(bytes: Uint8Array | null, max: number) {
  const raw = bytes ? bytesToHex(bytes) : "";

  if (!bytes || bytes.length !== 4) {
    return { value: null, raw };
  }

  const blank = bytes.every((byte) => byte === 0x00) || bytes.every((byte) => byte === 0xff);

  if (blank) {
    return { value: null, raw };
  }

  const scaled = ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
  const value = scaled / 60000;

  if (value <= 0 || value > max) {
    return { value: null, raw };
  }

  return { value: Math.round(value * 1000000) / 1000000, raw };
}

function parseGpsPoint(view: DataView, recordOffset: number, latOffset: number, lonOffset: number, statusOffset: number, timeOffset: number): Tf4GpsPoint {
  const lat = decodeGpsCoordinate(readBytes(view, recordOffset + latOffset, 4), 90);
  const lon = decodeGpsCoordinate(readBytes(view, recordOffset + lonOffset, 4), 180);
  const statusBytes = readBytes(view, recordOffset + statusOffset, 1);
  const time = parseBcdDateTime(readBytes(view, recordOffset + timeOffset, 6));

  return {
    lat: lat.value,
    lon: lon.value,
    latRaw: lat.raw,
    lonRaw: lon.raw,
    statusRaw: statusBytes ? bytesToHex(statusBytes) : "",
    time: time.value,
    timeRaw: time.raw
  };
}

function toTime(value: string | null) {
  if (!value) {
    return null;
  }

  return value.slice(11, 16);
}

function decodeBcdAmount(bytes: Uint8Array | null, multiplier = 10) {
  const value = decodeBcd(bytes);
  return value === null ? null : value * multiplier;
}

function decodeHexAmount(bytes: Uint8Array | null) {
  if (!bytes || bytes.length === 0) {
    return null;
  }

  const blank = bytes.every((byte) => byte === 0xff);

  if (blank) {
    return null;
  }

  return Array.from(bytes).reduce((value, byte) => (value << 8) + byte, 0);
}

function decodeSignedByteAmount(byte: number | null, multiplier = 10) {
  if (byte === null || byte === 0x00 || byte === 0xff || byte === 0xaa) {
    return null;
  }

  const signed = byte > 0x7f ? byte - 0x100 : byte;
  return signed * multiplier;
}

function decodeHexAmountWithBlank(bytes: Uint8Array | null) {
  if (!bytes || bytes.length === 0) {
    return null;
  }

  const blank = bytes.every((byte) => byte === 0xff) || bytes.every((byte) => byte === 0xaa);

  if (blank) {
    return null;
  }

  return Array.from(bytes).reduce((value, byte) => (value << 8) + byte, 0);
}

function sumNullableAmounts(amounts: Array<number | null>) {
  if (amounts.some((amount) => amount === null)) {
    return null;
  }

  return amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function isBlankRecord(recordBytes: Uint8Array, totalAmount: number | null, startedAt: string | null, endedAt: string | null) {
  const allZero = recordBytes.every((byte) => byte === 0x00);
  const allFF = recordBytes.every((byte) => byte === 0xff);

  if (allZero || allFF) {
    return true;
  }

  return (totalAmount === null || totalAmount === 0) && startedAt === null && endedAt === null;
}

export function parseTf4(buffer: ArrayBuffer): Tf4ParseResult {
  if (buffer.byteLength < TF4_HEADER_CANDIDATE_SIZE) {
    throw new Error("TF4ファイルが短すぎるため解析できません。");
  }

  const view = new DataView(buffer);
  const headerBytes = readBytes(view, 0, Math.min(TF4_HEADER_CANDIDATE_SIZE, view.byteLength));
  const totalRecordSlots = Math.floor(view.byteLength / TF4_RECORD_SIZE);
  const warnings: string[] = [];

  if (view.byteLength % TF4_RECORD_SIZE !== 0) {
    warnings.push(`ファイルサイズが${TF4_RECORD_SIZE} bytes単位で割り切れません。末尾 ${view.byteLength % TF4_RECORD_SIZE} bytes は暫定解析の対象外です。`);
  }

  const records: Tf4SalesRecord[] = [];
  let previousBusinessKmCumulative: number | null = null;

  for (let index = 0; index < totalRecordSlots; index += 1) {
    const recordOffset = index * TF4_RECORD_SIZE;
    const recordBytes = readBytes(view, recordOffset, TF4_RECORD_SIZE);

    if (!recordBytes) {
      continue;
    }

    const start = parseBcdDateTime(readBytes(view, recordOffset + 0x0010, 6));
    const end = parseBcdDateTime(readBytes(view, recordOffset + 0x0016, 6));
    const actualStart = parseBcdDateTime(readBytes(view, recordOffset + 0x0138, 6));
    const boardingGps = parseGpsPoint(view, recordOffset, 0x00f1, 0x00f5, 0x00fa, 0x00fb);
    const alightingGps = parseGpsPoint(view, recordOffset, 0x0101, 0x0105, 0x010a, 0x010b);
    const salesNumberBytes = readBytes(view, recordOffset + 0x004a, 2);
    const businessKmBytes = readBytes(view, recordOffset + 0x004e, 2);
    const businessKmBcd = decodeBcd(businessKmBytes);
    const businessKmCumulative = businessKmBcd === null ? null : businessKmBcd / 10;
    const totalAmountBytes = readBytes(view, recordOffset + 0x001c, 3);
    const totalAmount = decodeBcdAmount(totalAmountBytes);
    const discountFareByte = recordOffset + 0x0020 < view.byteLength ? view.getUint8(recordOffset + 0x0020) : null;
    const reservationFareBytes = readBytes(view, recordOffset + 0x0027, 2);
    const tariffDFareBytes = readBytes(view, recordOffset + 0x0025, 2);
    const tollAmountBytes = readBytes(view, recordOffset + 0x003b, 2);
    const parkingAmountBytes = readBytes(view, recordOffset + 0x003d, 2);
    const otherAdvanceAmountBytes = readBytes(view, recordOffset + 0x003f, 2);
    const f3FixedFareBytes = readBytes(view, recordOffset + 0x0045, 2);
    const tollAmount = decodeBcdAmount(tollAmountBytes);
    const parkingAmount = decodeBcdAmount(parkingAmountBytes);
    const otherAdvanceAmount = decodeBcdAmount(otherAdvanceAmountBytes);
    const reservationFare = decodeHexAmountWithBlank(reservationFareBytes);
    const tariffDFare = decodeHexAmount(tariffDFareBytes);
    const f3FixedFare = decodeHexAmount(f3FixedFareBytes);
    const advanceAmount = sumNullableAmounts([tollAmount, parkingAmount, otherAdvanceAmount]);
    const flag = recordOffset + 0x008f < view.byteLength ? view.getUint8(recordOffset + 0x008f) : null;
    const hasUncollected = flag === null ? null : (flag & 0x01) !== 0;
    const hasAdvance = advanceAmount === null ? null : advanceAmount > 0;

    if (isBlankRecord(recordBytes, totalAmount, start.value, end.value)) {
      continue;
    }

    const businessKmCandidate =
      businessKmCumulative === null || previousBusinessKmCumulative === null
        ? null
        : roundToSingleDecimal(businessKmCumulative - previousBusinessKmCumulative);
    const collectionAmount = totalAmount === null || advanceAmount === null ? null : totalAmount + advanceAmount;
    const cashAmount = collectionAmount === null || hasUncollected === null ? null : hasUncollected ? 0 : collectionAmount;
    const uncollectedAmount = collectionAmount === null || hasUncollected === null ? null : hasUncollected ? collectionAmount : 0;
    const paymentFlagBytes = readBytes(view, recordOffset + 0x008f, 18);
    const pickupBytes = readBytes(view, recordOffset + 0x01dc, 3);
    const pickupFareBytes = readBytes(view, recordOffset + 0x01dd, 2);
    const pickupFare = decodeHexAmountWithBlank(pickupFareBytes);
    const appDispatchFeeCandidate = f3FixedFare === null ? null : f3FixedFare * 10;
    const fallbackBusinessKmCandidate =
      businessKmCandidate === null && totalAmount !== null
        ? 0
        : businessKmCandidate;

    records.push({
      recordNumber: index + 1,
      recordOffset,
      salesNumber: decodeBcd(salesNumberBytes),
      salesNumberRaw: salesNumberBytes ? bytesToHex(salesNumberBytes) : "",
      boardingTimeCandidate: toTime(actualStart.value ?? start.value),
      boardingTimeRaw: actualStart.value ? actualStart.raw : start.raw,
      alightingTimeCandidate: toTime(end.value),
      alightingTimeRaw: end.raw,
      boardingGps,
      alightingGps,
      businessKmCandidate: fallbackBusinessKmCandidate,
      businessKmRaw: businessKmBytes ? bytesToHex(businessKmBytes) : "",
      businessKmCumulative,
      totalAmount,
      totalAmountRaw: totalAmountBytes ? bytesToHex(totalAmountBytes) : "",
      cashAmountCandidate: cashAmount,
      uncollectedAmountCandidate: uncollectedAmount,
      advanceAmountCandidate: advanceAmount,
      advanceAmountRaw: [
        `高速 ${tollAmountBytes ? bytesToHex(tollAmountBytes) : "-"}`,
        `駐車 ${parkingAmountBytes ? bytesToHex(parkingAmountBytes) : "-"}`,
        `その他 ${otherAdvanceAmountBytes ? bytesToHex(otherAdvanceAmountBytes) : "-"}`
      ].join(" / "),
      pickupFareCandidate: pickupFare === null ? null : pickupFare,
      pickupFareRaw: [
        `迎車金額 ${pickupFareBytes ? bytesToHex(pickupFareBytes) : "-"}`,
        "仕様候補: 0x01DD HEX ×1円"
      ].join(" / "),
      reservationFareCandidate: reservationFare === null ? null : reservationFare * 10,
      reservationFareRaw: [
        `予約料金候補 ${reservationFareBytes ? bytesToHex(reservationFareBytes) : "-"}`,
        "仕様候補: 0x0027 HEX ×10円"
      ].join(" / "),
      otherFareCandidate: tariffDFare === null ? null : tariffDFare * 10,
      otherFareRaw: [
        `Dタリフ ${tariffDFareBytes ? bytesToHex(tariffDFareBytes) : "-"}`,
        "仕様: 0x0025 HEX ×10円"
      ].join(" / "),
      discountFareCandidate: decodeSignedByteAmount(discountFareByte),
      discountFareRaw: [
        `割引候補 ${discountFareByte === null ? "-" : `0x${discountFareByte.toString(16).padStart(2, "0").toUpperCase()}`}`,
        "仕様候補: 0x0020 符号付き×10円"
      ].join(" / "),
      appDispatchFeeCandidate,
      appDispatchFeeRaw: [
        `F3固定料金 ${f3FixedFareBytes ? bytesToHex(f3FixedFareBytes) : "-"}`,
        "仕様: 0x0045 HEX ×10円"
      ].join(" / "),
      startedAt: start.value,
      startedAtRaw: start.raw,
      endedAt: end.value,
      endedAtRaw: end.raw,
      hasPickup: flag === null ? null : (flag & 0x20) !== 0,
      hasUncollected,
      hasAdvance,
      flagRaw: flag === null ? null : `0x${flag.toString(16).padStart(2, "0").toUpperCase()}`,
      paymentLinkRaw: [
        `特殊フラグ1 ${paymentFlagBytes ? bytesToHex(paymentFlagBytes) : "-"}`,
        `迎車種別/金額 ${pickupBytes ? bytesToHex(pickupBytes) : "-"}`
      ].join(" / ")
    });

    previousBusinessKmCumulative = businessKmCumulative;
  }

  return {
    recordSize: TF4_RECORD_SIZE,
    headerCandidateHex: headerBytes ? bytesToHex(headerBytes) : "",
    totalRecordSlots,
    records,
    warnings
  };
}
