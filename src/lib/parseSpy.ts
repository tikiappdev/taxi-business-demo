const SPY_PAYMENT_MASTER_OFFSET = 0x0050;

const PAYMENT_CODE_NAMES: Record<string, { name: string; shortName: string }> = {
  "01": { name: "現金", shortName: "現" },
  "02": { name: "未収", shortName: "未" },
  "03": { name: "チケット", shortName: "T" },
  "06": { name: "オフラインクレジットカード", shortName: "C" },
  "08": { name: "オンラインクレジットカード", shortName: "C" },
  "09": { name: "iD", shortName: "iD" },
  "0A": { name: "QUICPay", shortName: "Q" },
  "0C": { name: "交通系IC", shortName: "K" },
  "0D": { name: "WAON", shortName: "W" },
  "2E": { name: "Edy", shortName: "エ" },
  "2F": { name: "nanaco", shortName: "ナ" },
  "32": { name: "ネット決済 ※km用", shortName: "ネ" },
  "33": { name: "QRコード決済（東京無線）", shortName: "QR" },
  "37": { name: "ネット決済 ※つばめ用", shortName: "ネ" }
};

export type SpyPaymentMaster = {
  recordNumber: number;
  offset: number;
  paymentCode: string;
  dataLength: number;
  onboardSummaryCode: string | null;
  officePaymentCode: string | null;
  paymentKindCode: string | null;
  paymentName: string;
  displayName: string;
  raw: string;
};

export type SpyParseResult = {
  masters: SpyPaymentMaster[];
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

function readBytes(data: Uint8Array, offset: number, length: number) {
  if (offset < 0 || offset + length > data.length) {
    return null;
  }

  return data.slice(offset, offset + length);
}

export function parseSpy(buffer: ArrayBuffer): SpyParseResult {
  const data = new Uint8Array(buffer);
  const warnings: string[] = [];
  const masters: SpyPaymentMaster[] = [];

  if (data.length <= SPY_PAYMENT_MASTER_OFFSET) {
    throw new Error("SPYファイルが短すぎるため、決済種別マスタ候補を解析できません。");
  }

  let offset = SPY_PAYMENT_MASTER_OFFSET;

  while (offset + 2 <= data.length) {
    const code = data[offset];

    if (code === 0xff || code === 0x54) {
      break;
    }

    const dataLength = data[offset + 1];
    const recordEnd = offset + 2 + dataLength;
    const hasCheckCode = recordEnd < data.length && data[recordEnd] === 0xf1;
    const rawEnd = hasCheckCode ? recordEnd + 1 : Math.min(recordEnd, data.length);
    const rawBytes = readBytes(data, offset, rawEnd - offset);

    if (!rawBytes || rawBytes.length < 2) {
      warnings.push(`0x${offset.toString(16).toUpperCase()} 以降のSPYレコードを読み取れませんでした。`);
      break;
    }

    if (!hasCheckCode) {
      warnings.push(`種別コード ${toCode(code)} の終端チェックコード F1 が見つかりませんでした。`);
    }

    const masterName = PAYMENT_CODE_NAMES[toCode(code)] ?? {
      name: `決済種別コード ${toCode(code)}`,
      shortName: toCode(code)
    };

    masters.push({
      recordNumber: masters.length + 1,
      offset,
      paymentCode: toCode(code),
      dataLength,
      onboardSummaryCode: rawBytes.length > 2 ? toCode(rawBytes[2]) : null,
      officePaymentCode: rawBytes.length > 3 ? toCode(rawBytes[3]) : null,
      paymentKindCode: rawBytes.length > 4 ? toCode(rawBytes[4]) : null,
      paymentName: masterName.name,
      displayName: masterName.shortName,
      raw: bytesToHex(rawBytes)
    });

    if (!hasCheckCode || rawEnd <= offset) {
      break;
    }

    offset = rawEnd;
  }

  return { masters, warnings };
}
