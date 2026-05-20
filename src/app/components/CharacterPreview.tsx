import { useEffect, useMemo, useRef, useState } from "react";
import { getAppearanceAssets, type AppearanceAssets } from "../services/appearanceAssets";
import { recolorImageReplacingHex } from "../services/pixelRecolor";

type CharacterLike = {
  body_type?: string;
  body_color?: string;
  hair_style?: string;
  eye_type?: string;
  mouth_type?: string;

  head_clothing?: string;
  top_clothing?: string;
  legs_clothing?: string;
  shoes_clothing?: string;

  helmet?: string;
  chestplate?: string;
  leggings?: string;
  boots?: string;

  left_glove?: string;
  right_glove?: string;

  left_hand?: string;
  right_hand?: string;

  accessory_neck?: string;
  accessory_finger?: string;
  accessory_wrist?: string;
  accessory_waist?: string;
};

const FALLBACK_LAYER_ORDER: string[] = [
  "body-types",
  "hair-styles",
  "eye-types",
  "mouth-types",
  "clothing-head",
  "clothing-top",
  "clothing-legs",
  "clothing-shoes",
  "armor-helmet",
  "armor-chestplate",
  "armor-leggings",
  "armor-boots",
  "gloves-left",
  "gloves-right",
  "hands-left",
  "hands-right",
  "accessories-neck",
  "accessories-finger",
  "accessories-wrist",
  "accessories-waist",
];

export function CharacterPreview(props: {
  character: CharacterLike;
  className?: string;
  recolorScale?: number;
}) {
  const { character, className, recolorScale } = props;
  const [assets, setAssets] = useState<AppearanceAssets | null>(null);
  const [recoloredBodyUrl, setRecoloredBodyUrl] = useState<string | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      const url = currentBlobUrlRef.current;
      if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
      currentBlobUrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAppearanceAssets().then((a) => {
      if (cancelled) return;
      setAssets(a);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const layerOrder = assets?.layerOrder?.length ? assets.layerOrder : FALLBACK_LAYER_ORDER;

  const selectedKeyByCategory = useMemo(() => {
    const bodyType = character.body_type && character.body_type.trim() ? character.body_type : "human";

    return {
      "body-types": bodyType,
      "hair-styles": character.hair_style || "none",
      "eye-types": character.eye_type || "none",
      "mouth-types": character.mouth_type || "none",

      "clothing-head": character.head_clothing || "none",
      "clothing-top": character.top_clothing || "none",
      "clothing-legs": character.legs_clothing || "none",
      "clothing-shoes": character.shoes_clothing || "none",

      "armor-helmet": character.helmet || "none",
      "armor-chestplate": character.chestplate || "none",
      "armor-leggings": character.leggings || "none",
      "armor-boots": character.boots || "none",

      "gloves-left": character.left_glove || "none",
      "gloves-right": character.right_glove || "none",

      "hands-left": character.left_hand || "none",
      "hands-right": character.right_hand || "none",

      "accessories-neck": character.accessory_neck || "none",
      "accessories-finger": character.accessory_finger || "none",
      "accessories-wrist": character.accessory_wrist || "none",
      "accessories-waist": character.accessory_waist || "none",
    } as Record<string, string>;
  }, [character]);

  const baseBodyUrl = assets?.imageMap?.["body-types"]?.[selectedKeyByCategory["body-types"]];
  const bodyColor = character.body_color || "#ECAA70";

  useEffect(() => {
    if (!baseBodyUrl) {
      setRecoloredBodyUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        currentBlobUrlRef.current = null;
        return null;
      });
      return;
    }

    let cancelled = false;

    (async () => {
      const recolored = await recolorImageReplacingHex({
        imageUrl: baseBodyUrl,
        fromHex: "#F0A96E",
        toHex: bodyColor,
        tolerance: 24,
        output: "blobUrl",
        cacheBaseImage: true,
        scale: recolorScale,
      });

      if (cancelled) return;
      setRecoloredBodyUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        currentBlobUrlRef.current = recolored ?? null;
        return recolored;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [baseBodyUrl, bodyColor, recolorScale]);

  const resolvedLayers = useMemo(() => {
    const map = assets?.imageMap ?? {};

    return layerOrder
      .map((category) => {
        const key = selectedKeyByCategory[category];
        if (!key || key === "none") return null;

        const url = map?.[category]?.[key];
        if (!url) return null;

        if (category === "body-types" && recoloredBodyUrl) {
          return { category, key, url: recoloredBodyUrl };
        }

        return { category, key, url };
      })
      .filter(Boolean) as Array<{ category: string; key: string; url: string }>;
  }, [assets, layerOrder, recoloredBodyUrl, selectedKeyByCategory]);

  return (
    <div className={className ? className : "w-full h-full"}>
      <div className="relative w-full h-full pointer-events-none" style={{ aspectRatio: "1000 / 1800" }}>
        {resolvedLayers.map((layer) => (
          <img
            key={`${layer.category}:${layer.key}`}
            src={layer.url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
            style={{ imageRendering: "pixelated" }}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
