import { NextResponse } from "next/server";

type RespuestaGoogle = {
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsLinks?: { reviewsUri?: string };
  reviews?: unknown[];
};

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) return NextResponse.json({ configured: false, reviews: [] });

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=AR`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews,googleMapsLinks" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Google Places HTTP ${response.status}`);
    const place = (await response.json()) as RespuestaGoogle;
    return NextResponse.json({ configured: true, name: place.displayName?.text, rating: place.rating, count: place.userRatingCount, reviewsUrl: place.googleMapsLinks?.reviewsUri || "", reviews: place.reviews || [] }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ configured: true, error: true, reviews: [] }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
