export type Tf2ParseResult = {
  serviceDateCandidate: string | null;
  departureTime: string | null;
  departureDateTime: string | null;
  driverCodeCandidate: string | null;
  vehicleCodeCandidate: string | null;
  raw: {
    primaryDateTime: string;
    secondaryDateTime: string;
    header: string;
    asciiCandidate: string;
  };
  warnings: string[];
};

function bytesToHex(bytes: Uint8Array | null) {
  if (!bytes) {
    return "";
  }

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

function parseBcdDateTime(bytes: Uint8Array | null) {
  const raw = bytesToHex(bytes);

  if (!bytes || bytes.length < 5) {
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

  const [year, month, day, hour, minute, second = 0] = values as number[];
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

function decodeAsciiDigits(bytes: Uint8Array | null) {
  if (!bytes) {
    return null;
  }

  const text = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("")
    .trim();

  return /^\d{3,}$/.test(text) ? text : null;
}

function timeFromDateTime(value: string | null) {
  return value?.slice(11, 16) ?? null;
}

function dateFromDateTime(value: string | null) {
  return value?.slice(0, 10) ?? null;
}

export function parseTf2(buffer: ArrayBuffer): Tf2ParseResult {
  if (buffer.byteLength < 16) {
    throw new Error("TF2ファイルが短すぎるため解析できません。");
  }

  const view = new DataView(buffer);
  const warnings: string[] = [];
  const primaryDateTime = parseBcdDateTime(readBytes(view, 0x0008, 6));
  const secondaryDateTime = parseBcdDateTime(readBytes(view, 0x0166, 6));
  const departureDateTime = primaryDateTime.value ?? secondaryDateTime.value;
  const asciiCandidate = decodeAsciiDigits(readBytes(view, 0x0002, 6));

  if (!departureDateTime) {
    warnings.push("TF2から出庫時刻候補を取得できませんでした。");
  }

  return {
    serviceDateCandidate: dateFromDateTime(departureDateTime),
    departureTime: timeFromDateTime(departureDateTime),
    departureDateTime,
    driverCodeCandidate: null,
    vehicleCodeCandidate: asciiCandidate,
    raw: {
      primaryDateTime: primaryDateTime.raw,
      secondaryDateTime: secondaryDateTime.raw,
      header: bytesToHex(readBytes(view, 0, Math.min(32, view.byteLength))),
      asciiCandidate: asciiCandidate ?? ""
    },
    warnings
  };
}
