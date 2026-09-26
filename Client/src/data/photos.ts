// Resolves the image shown for produce, growers and markets.
// A product uses its own photograph when one exists, a close photographic match
// otherwise, and finally a category illustration in the brand palette.

/** Slugs that have a dedicated photograph in public/images/produce/. */
export const PRODUCE_PHOTOS = new Set<string>([]);

const FALLBACKS: [RegExp, string][] = [
  [/tomato/i, "/images/tomatoes.jpg"],
  [/carrot/i, "/images/carrots.jpg"],
  [/fruit basket|harvest basket|mixed/i, "/images/harvest.jpg"],
];
// Products without a genuine photograph get a category illustration, never an
// unrelated photo.
const CATEGORY_FALLBACK: Record<string, string> = {
  "Fresh Vegetables": "/images/illustrations/vegetables.svg",
  "Orchard Fruits": "/images/illustrations/fruit.svg",
  "Fresh Herbs": "/images/illustrations/herbs.svg",
  "Dairy & Eggs": "/images/illustrations/dairy.svg",
  "Pantry & Honey": "/images/illustrations/pantry.svg",
  Bakery: "/images/illustrations/bakery.svg",
};

export function produceSlug(image: string) {
  return image.match(/\/images\/produce\/([a-z0-9-]+)\.jpg$/)?.[1] ?? "";
}

export function productPhoto(p: { name: string; image: string; category: string }) {
  const slug = produceSlug(p.image);
  if (slug && PRODUCE_PHOTOS.has(slug)) return p.image;
  if (p.image && !slug) return p.image;
  return (
    FALLBACKS.find(([re]) => re.test(p.name))?.[1] ??
    CATEGORY_FALLBACK[p.category] ??
    "/images/illustrations/vegetables.svg"
  );
}

const GROWER_PHOTOS = ["/images/grower.jpg", "/images/market-person.jpg"];
export function growerPhoto(f: { id: string; image?: string }, index = 0) {
  return f.image || GROWER_PHOTOS[index % GROWER_PHOTOS.length];
}

export function marketPhoto(m: { image?: string }) {
  return m.image || "/images/market.jpg";
}

/** Photographs a grower can choose for a listing. */
export const PHOTO_LIBRARY: Record<string, string> = {
  "Tomatoes": "/images/tomatoes.jpg",
  "Carrots": "/images/carrots.jpg",
  "Harvest basket": "/images/harvest.jpg",
  "Market stall": "/images/market.jpg",
  "Market morning": "/images/market-arrival.jpg",
};
