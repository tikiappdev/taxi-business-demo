import { NextResponse } from "next/server";

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  ward?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  road?: string;
  state?: string;
  province?: string;
  country?: string;
};

type NominatimReverseResponse = {
  display_name?: string;
  name?: string;
  address?: NominatimAddress;
  lat?: string;
  lon?: string;
  error?: string;
};

function uniqueParts(parts: Array<string | undefined>) {
  return parts.filter((part, index, values): part is string => Boolean(part) && values.indexOf(part) === index);
}

function buildDisplayName(result: NominatimReverseResponse) {
  const address = result.address ?? {};
  const municipality = address.city ?? address.town ?? address.village ?? address.municipality;
  const district = address.ward ?? address.suburb ?? address.neighbourhood;
  const detail = address.quarter ?? address.road ?? result.name;
  const parts = uniqueParts([municipality, district, detail]);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  const fallback = result.display_name?.split(",").slice(0, 2).map((part) => part.trim());
  return uniqueParts(fallback ?? []).join(" ");
}

function buildRawSummary(result: NominatimReverseResponse) {
  const address = result.address ?? {};
  return {
    displayName: result.display_name,
    name: result.name,
    lat: result.lat,
    lon: result.lon,
    city: address.city,
    town: address.town,
    village: address.village,
    municipality: address.municipality,
    ward: address.ward,
    suburb: address.suburb,
    neighbourhood: address.neighbourhood,
    quarter: address.quarter,
    road: address.road,
    state: address.state ?? address.province,
    country: address.country,
    address
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ ok: false, error: "lat / lon は数値で指定してください。" }, { status: 400 });
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ ok: false, error: "lat / lon の範囲が不正です。" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("accept-language", "ja");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "MobilitySupportDemo/0.1"
      }
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "Nominatim Reverse API の取得に失敗しました。" }, { status: response.status });
    }

    const data = (await response.json()) as NominatimReverseResponse;

    if (!data || data.error) {
      return NextResponse.json({ ok: false, error: "該当する地名が見つかりませんでした。" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      name: buildDisplayName(data) || "地名取得不可",
      raw: buildRawSummary(data)
    });
  } catch {
    return NextResponse.json({ ok: false, error: "地名取得中にエラーが発生しました。" }, { status: 500 });
  }
}
