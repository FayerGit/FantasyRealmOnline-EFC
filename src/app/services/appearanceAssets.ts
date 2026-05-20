import { API_URL } from "../config/api.config";

type AppearanceItem = { category: string; key: string; image_url: string };

export type AppearanceAssets = {
  imageMap: Record<string, Record<string, string>>;
  layerOrder: string[];
};

let cachedAssets: AppearanceAssets | null = null;
let inflight: Promise<AppearanceAssets> | null = null;

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];

export const getAppearanceAssets = async (): Promise<AppearanceAssets> => {
  if (cachedAssets) return cachedAssets;
  if (inflight) return inflight;

  inflight = (async () => {
    const empty: AppearanceAssets = { imageMap: {}, layerOrder: [] };

    try {
      const [itemsRes, orderRes] = await Promise.all([
        fetch(`${API_URL}/appearance/items`, { method: "GET", headers: { "Content-Type": "application/json" } }),
        fetch(`${API_URL}/appearance/layer-order`, { method: "GET", headers: { "Content-Type": "application/json" } }),
      ]);

      let imageMap: Record<string, Record<string, string>> = {};
      if (itemsRes.ok) {
        const itemsJson = await itemsRes.json();
        const items: AppearanceItem[] = Array.isArray(itemsJson?.data?.items) ? itemsJson.data.items : [];
        for (const item of items) {
          if (!item || typeof item.category !== "string" || typeof item.key !== "string" || typeof item.image_url !== "string") continue;
          if (!imageMap[item.category]) imageMap[item.category] = {};
          imageMap[item.category][item.key] = item.image_url;
        }
      }

      let layerOrder: string[] = [];
      if (orderRes.ok) {
        const orderJson = await orderRes.json();
        layerOrder = normalizeStringArray(orderJson?.data?.layer_order);
      }

      cachedAssets = { imageMap, layerOrder };
      return cachedAssets;
    } catch {
      cachedAssets = empty;
      return empty;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};
