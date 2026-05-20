export type HexColor = `#${string}`;

type OutputMode = "dataUrl" | "blobUrl";

const clamp255 = (n: number) => Math.max(0, Math.min(255, n | 0));

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? { r, g, b } : null;
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? { r, g, b } : null;
  }
  return null;
};

type CachedBaseImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

const BASE_IMAGE_CACHE_MAX = 8;
const baseImageCache = new Map<string, CachedBaseImage>();

const touchCacheKey = (key: string) => {
  const value = baseImageCache.get(key);
  if (!value) return;
  baseImageCache.delete(key);
  baseImageCache.set(key, value);
};

const setCache = (key: string, value: CachedBaseImage) => {
  if (baseImageCache.has(key)) baseImageCache.delete(key);
  baseImageCache.set(key, value);
  while (baseImageCache.size > BASE_IMAGE_CACHE_MAX) {
    const oldestKey = baseImageCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    baseImageCache.delete(oldestKey);
  }
};

const normalizeScale = (scale: number | undefined): number => {
  if (typeof scale !== "number" || !Number.isFinite(scale)) return 1;
  // Limiter à une plage raisonnable.
  return Math.max(0.05, Math.min(1, scale));
};

const cacheKeyFor = (imageUrl: string, scale: number): string => `${imageUrl}@@${scale}`;

const loadBaseImage = async (
  imageUrl: string,
  useCache: boolean,
  scaleParam: number | undefined
): Promise<CachedBaseImage | null> => {
  const scale = normalizeScale(scaleParam);
  const cacheKey = cacheKeyFor(imageUrl, scale);
  if (useCache) {
    const cached = baseImageCache.get(cacheKey);
    if (cached) {
      touchCacheKey(cacheKey);
      return cached;
    }
  }

  const img = new Image();
  img.crossOrigin = "anonymous";

  const loaded = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });

  if (!loaded) return null;

  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;
  const dstWidth = Math.max(1, Math.round(srcWidth * scale));
  const dstHeight = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dstWidth;
  canvas.height = dstHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, dstWidth, dstHeight);

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const base: CachedBaseImage = {
      width: imageData.width,
      height: imageData.height,
      data: new Uint8ClampedArray(imageData.data),
    };
    if (useCache) setCache(cacheKey, base);
    return base;
  } catch {
    // Le canvas peut être 'tainted' si les en-têtes CORS sont absents.
    return null;
  }
};

export const recolorImageReplacingHex = async (params: {
  imageUrl: string;
  fromHex: string | string[];
  toHex: string;
  tolerance?: number;
  output?: OutputMode;
  cacheBaseImage?: boolean;
  scale?: number;
}): Promise<string | null> => {
  const to = hexToRgb(params.toHex);
  if (!to) return null;

  const tolerance = Math.max(0, Math.min(255, (params.tolerance ?? 0) | 0));
  const toleranceSq = tolerance * tolerance;

  const output: OutputMode = params.output ?? "dataUrl";
  const cacheBaseImage = params.cacheBaseImage ?? true;

  const fromList = (Array.isArray(params.fromHex) ? params.fromHex : [params.fromHex])
    .map(hexToRgb)
    .filter(Boolean) as Array<{ r: number; g: number; b: number }>;
  if (fromList.length === 0) return null;

  const base = await loadBaseImage(params.imageUrl, cacheBaseImage, params.scale);
  if (!base) return null;

  const canvas = document.createElement("canvas");
  canvas.width = base.width;
  canvas.height = base.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    const data = new Uint8ClampedArray(base.data);
    const imageData = new ImageData(data, base.width, base.height);

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const isMatch = fromList.some((f) => {
        if (tolerance === 0) return r === f.r && g === f.g && b === f.b;
        const dr = r - f.r;
        const dg = g - f.g;
        const db = b - f.b;
        return dr * dr + dg * dg + db * db <= toleranceSq;
      });
      if (isMatch) {
        data[i] = clamp255(to.r);
        data[i + 1] = clamp255(to.g);
        data[i + 2] = clamp255(to.b);
      }
    }

    ctx.putImageData(imageData, 0, 0);

    if (output === "dataUrl") {
      return canvas.toDataURL("image/png");
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) return null;
    return URL.createObjectURL(blob);
  } catch {
    // Canvas may be tainted if CORS headers are missing.
    return null;
  }
};
