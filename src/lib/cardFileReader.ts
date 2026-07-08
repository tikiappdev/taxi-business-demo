export const CARD_FILE_EXTENSIONS = [
  ".TF2",
  ".TF3",
  ".TF4",
  ".TFA",
  ".SPY",
  ".TF7",
  ".DGP",
  ".DF3",
  ".DID",
  ".TF1",
  ".TCA"
] as const;

export const CARD_FILE_ACCEPT = CARD_FILE_EXTENSIONS.flatMap((extension) => [
  extension,
  extension.toLowerCase()
]).join(",");

export type CardReadStatus = "success" | "unsupported" | "error";

export type CardFileReadResult = {
  id: string;
  name: string;
  relativePath?: string;
  extension: string;
  size: number;
  sizeLabel: string;
  byteLength: number | null;
  buffer?: ArrayBuffer;
  status: CardReadStatus;
  message: string;
};

export function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }

  return fileName.slice(dotIndex).toUpperCase();
}

export function isSupportedCardFile(fileName: string) {
  const extension = getFileExtension(fileName);
  return CARD_FILE_EXTENSIONS.includes(extension as (typeof CARD_FILE_EXTENSIONS)[number]);
}

export function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export async function readCardFileAsArrayBuffer(file: File): Promise<CardFileReadResult> {
  const extension = getFileExtension(file.name);
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const baseResult = {
    id: `${relativePath || file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    relativePath: relativePath || undefined,
    extension: extension || "不明",
    size: file.size,
    sizeLabel: formatFileSize(file.size),
    byteLength: null
  };

  if (!isSupportedCardFile(file.name)) {
    return {
      ...baseResult,
      status: "unsupported",
      message: "想定外の拡張子です。読込対象として表示のみ行いました。"
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    return {
      ...baseResult,
      byteLength: buffer.byteLength,
      buffer,
      status: "success",
      message: "ArrayBufferとして読み込みました。"
    };
  } catch {
    return {
      ...baseResult,
      status: "error",
      message: "ArrayBuffer読込に失敗しました。"
    };
  }
}
