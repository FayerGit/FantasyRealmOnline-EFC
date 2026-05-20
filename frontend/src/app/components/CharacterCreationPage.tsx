import { useEffect, useRef, useState } from "react";
import { WireframeLayout } from "./WireframeLayout";
import { Page } from "../types";
import { authAPI } from "../services/authAPI";
import { characterAPI } from "../services/characterAPI";
import { API_URL } from "../config/api.config";
import { recolorImageReplacingHex } from "../services/pixelRecolor";

type AppearanceItem = { category: string; key: string; image_url: string };

interface CharacterCreationPageProps {
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

// Options for each attribute (prepare for pixel art replacement)
const DEFAULT_BODY_TYPES = ["human"];
const DEFAULT_HAIR_STYLES = ["none"];
const DEFAULT_EYE_TYPES = ["none"];
const DEFAULT_MOUTH_TYPES = ["none"];

// Clothing (4 parts)
const DEFAULT_HEAD_CLOTHING = ["none"];
const DEFAULT_TOP_CLOTHING = ["none"];
const DEFAULT_LEGS_CLOTHING = ["none"];
const DEFAULT_SHOES_CLOTHING = ["none"];

// Armor (6 parts) - takes priority over clothing
const DEFAULT_HELMET_TYPES = ["none"];
const DEFAULT_CHESTPLATE_TYPES = ["none"];
const DEFAULT_LEGGINGS_TYPES = ["none"];
const DEFAULT_BOOTS_TYPES = ["none"];
const DEFAULT_LEFT_GLOVE_TYPES = ["none"];
const DEFAULT_RIGHT_GLOVE_TYPES = ["none"];

// Hands
const DEFAULT_LEFT_HAND_ITEMS = ["none"];
const DEFAULT_RIGHT_HAND_ITEMS = ["none"];

// Accessories (4 slots - each has unique types)
const DEFAULT_ACCESSORY_SLOT1_TYPES = ["none"]; // Neck
const DEFAULT_ACCESSORY_SLOT2_TYPES = ["none"]; // Finger
const DEFAULT_ACCESSORY_SLOT3_TYPES = ["none"]; // Wrist
const DEFAULT_ACCESSORY_SLOT4_TYPES = ["none"]; // Waist/Back

// Default render order (back -> front). Backend can override via /appearance/layer-order.
const DEFAULT_LAYER_ORDER = [
  "body-types",
  "clothing-legs",
  "clothing-shoes",
  "clothing-top",
  "clothing-head",
  "armor-leggings",
  "armor-boots",
  "armor-chestplate",
  "armor-helmet",
  "gloves-left",
  "gloves-right",
  "hair-styles",
  "eye-types",
  "mouth-types",
  "hands-left",
  "hands-right",
  "accessories-waist",
  "accessories-wrist",
  "accessories-finger",
  "accessories-neck",
];

export function CharacterCreationPage({ onNavigate, isLoggedIn, onLogout }: CharacterCreationPageProps) {
  const user = authAPI.getUser();

  const [bodyTypes, setBodyTypes] = useState<string[]>(DEFAULT_BODY_TYPES);
  const [hairStyles, setHairStyles] = useState<string[]>(DEFAULT_HAIR_STYLES);
  const [eyeTypes, setEyeTypes] = useState<string[]>(DEFAULT_EYE_TYPES);
  const [mouthTypes, setMouthTypes] = useState<string[]>(DEFAULT_MOUTH_TYPES);
  const [headClothingTypes, setHeadClothingTypes] = useState<string[]>(DEFAULT_HEAD_CLOTHING);
  const [topClothingTypes, setTopClothingTypes] = useState<string[]>(DEFAULT_TOP_CLOTHING);
  const [legsClothingTypes, setLegsClothingTypes] = useState<string[]>(DEFAULT_LEGS_CLOTHING);
  const [shoesClothingTypes, setShoesClothingTypes] = useState<string[]>(DEFAULT_SHOES_CLOTHING);
  const [helmetTypes, setHelmetTypes] = useState<string[]>(DEFAULT_HELMET_TYPES);
  const [chestplateTypes, setChestplateTypes] = useState<string[]>(DEFAULT_CHESTPLATE_TYPES);
  const [leggingsTypes, setLeggingsTypes] = useState<string[]>(DEFAULT_LEGGINGS_TYPES);
  const [bootsTypes, setBootsTypes] = useState<string[]>(DEFAULT_BOOTS_TYPES);
  const [leftGloveTypes, setLeftGloveTypes] = useState<string[]>(DEFAULT_LEFT_GLOVE_TYPES);
  const [rightGloveTypes, setRightGloveTypes] = useState<string[]>(DEFAULT_RIGHT_GLOVE_TYPES);
  const [leftHandItems, setLeftHandItems] = useState<string[]>(DEFAULT_LEFT_HAND_ITEMS);
  const [rightHandItems, setRightHandItems] = useState<string[]>(DEFAULT_RIGHT_HAND_ITEMS);
  const [accessorySlot1Types, setAccessorySlot1Types] = useState<string[]>(DEFAULT_ACCESSORY_SLOT1_TYPES);
  const [accessorySlot2Types, setAccessorySlot2Types] = useState<string[]>(DEFAULT_ACCESSORY_SLOT2_TYPES);
  const [accessorySlot3Types, setAccessorySlot3Types] = useState<string[]>(DEFAULT_ACCESSORY_SLOT3_TYPES);
  const [accessorySlot4Types, setAccessorySlot4Types] = useState<string[]>(DEFAULT_ACCESSORY_SLOT4_TYPES);

  const [editingCharacterRaw, setEditingCharacterRaw] = useState<any | null>(null);
  
  // Basic info
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "O">("M");
  
  // Appearance layers
  const [bodyType, setBodyType] = useState(0);
  const [bodyColor, setBodyColor] = useState("#ECAA70"); // Default base skin color
  const [hairStyle, setHairStyle] = useState(0);
  const [hairColor, setHairColor] = useState("#4a3728"); // Default brown
  const [eyeType, setEyeType] = useState(0);
  const [eyeColor, setEyeColor] = useState("#1e90ff"); // Default blue
  const [mouthType, setMouthType] = useState(0);
  
  // Clothing (4 parts)
  const [headClothing, setHeadClothing] = useState(0);
  const [topClothing, setTopClothing] = useState(0);
  const [legsClothing, setLegsClothing] = useState(0);
  const [shoesClothing, setShoesClothing] = useState(0);
  
  // Armor (6 parts)
  const [helmet, setHelmet] = useState(0);
  const [chestplate, setChestplate] = useState(0);
  const [leggings, setLeggings] = useState(0);
  const [boots, setBoots] = useState(0);
  const [leftGlove, setLeftGlove] = useState(0);
  const [rightGlove, setRightGlove] = useState(0);
  
  // Hands
  const [leftHand, setLeftHand] = useState(0);
  const [rightHand, setRightHand] = useState(0);
  
  // Accessories (4 slots)
  const [accessory1, setAccessory1] = useState(0);
  const [accessory2, setAccessory2] = useState(0);
  const [accessory3, setAccessory3] = useState(0);
  const [accessory4, setAccessory4] = useState(0);

  const [appearanceImageMap, setAppearanceImageMap] = useState<Record<string, Record<string, string>>>({});
  const [layerOrder, setLayerOrder] = useState<string[]>([]);
  const [recoloredBodyUrl, setRecoloredBodyUrl] = useState<string | null>(null);

  const recolorDebounceTimerRef = useRef<number | null>(null);
  
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);

  const findOptionIndex = (options: string[], value?: string, fallback = 0) => {
    if (!value) return fallback;
    const index = options.indexOf(value);
    return index >= 0 ? index : fallback;
  };

  useEffect(() => {
    const raw = localStorage.getItem("editingCharacter");
    if (!raw) return;

    try {
      const character = JSON.parse(raw);
      if (!character || !character.id) return;
      setEditingCharacterRaw(character);
    } catch {
      localStorage.removeItem("editingCharacter");
    }
  }, []);

  useEffect(() => {
    const loadOptions = async () => {
      const result = await characterAPI.getAppearanceOptions();
      if (result.error || !result.data) {
        return;
      }

      setBodyTypes(result.data.bodyTypes && result.data.bodyTypes.length ? result.data.bodyTypes : DEFAULT_BODY_TYPES);
      setHairStyles(result.data.hairStyles && result.data.hairStyles.length ? result.data.hairStyles : DEFAULT_HAIR_STYLES);
      setEyeTypes(result.data.eyeTypes && result.data.eyeTypes.length ? result.data.eyeTypes : DEFAULT_EYE_TYPES);
      setMouthTypes(result.data.mouthTypes && result.data.mouthTypes.length ? result.data.mouthTypes : DEFAULT_MOUTH_TYPES);
      setHeadClothingTypes(result.data.clothing?.head && result.data.clothing.head.length ? result.data.clothing.head : DEFAULT_HEAD_CLOTHING);
      setTopClothingTypes(result.data.clothing?.top && result.data.clothing.top.length ? result.data.clothing.top : DEFAULT_TOP_CLOTHING);
      setLegsClothingTypes(result.data.clothing?.legs && result.data.clothing.legs.length ? result.data.clothing.legs : DEFAULT_LEGS_CLOTHING);
      setShoesClothingTypes(result.data.clothing?.shoes && result.data.clothing.shoes.length ? result.data.clothing.shoes : DEFAULT_SHOES_CLOTHING);
      setHelmetTypes(result.data.armor?.helmet && result.data.armor.helmet.length ? result.data.armor.helmet : DEFAULT_HELMET_TYPES);
      setChestplateTypes(result.data.armor?.chestplate && result.data.armor.chestplate.length ? result.data.armor.chestplate : DEFAULT_CHESTPLATE_TYPES);
      setLeggingsTypes(result.data.armor?.leggings && result.data.armor.leggings.length ? result.data.armor.leggings : DEFAULT_LEGGINGS_TYPES);
      setBootsTypes(result.data.armor?.boots && result.data.armor.boots.length ? result.data.armor.boots : DEFAULT_BOOTS_TYPES);
      setLeftGloveTypes(result.data.gloves?.left && result.data.gloves.left.length ? result.data.gloves.left : DEFAULT_LEFT_GLOVE_TYPES);
      setRightGloveTypes(result.data.gloves?.right && result.data.gloves.right.length ? result.data.gloves.right : DEFAULT_RIGHT_GLOVE_TYPES);
      setLeftHandItems(result.data.hands?.left && result.data.hands.left.length ? result.data.hands.left : DEFAULT_LEFT_HAND_ITEMS);
      setRightHandItems(result.data.hands?.right && result.data.hands.right.length ? result.data.hands.right : DEFAULT_RIGHT_HAND_ITEMS);
      setAccessorySlot1Types(result.data.accessories?.neck && result.data.accessories.neck.length ? result.data.accessories.neck : DEFAULT_ACCESSORY_SLOT1_TYPES);
      setAccessorySlot2Types(result.data.accessories?.finger && result.data.accessories.finger.length ? result.data.accessories.finger : DEFAULT_ACCESSORY_SLOT2_TYPES);
      setAccessorySlot3Types(result.data.accessories?.wrist && result.data.accessories.wrist.length ? result.data.accessories.wrist : DEFAULT_ACCESSORY_SLOT3_TYPES);
      setAccessorySlot4Types(result.data.accessories?.waist && result.data.accessories.waist.length ? result.data.accessories.waist : DEFAULT_ACCESSORY_SLOT4_TYPES);
    };

    const loadAppearanceAssets = async () => {
      try {
        const [itemsRes, orderRes] = await Promise.all([
          fetch(`${API_URL}/appearance/items`, { method: "GET", headers: { "Content-Type": "application/json" } }),
          fetch(`${API_URL}/appearance/layer-order`, { method: "GET", headers: { "Content-Type": "application/json" } }),
        ]);

        if (itemsRes.ok) {
          const itemsJson = await itemsRes.json();
          const items: AppearanceItem[] = Array.isArray(itemsJson?.data?.items) ? itemsJson.data.items : [];
          const map: Record<string, Record<string, string>> = {};
          for (const item of items) {
            if (!item?.category || !item?.key || !item?.image_url) continue;
            if (!map[item.category]) map[item.category] = {};
            map[item.category][item.key] = item.image_url;
          }
          setAppearanceImageMap(map);
        }

        if (orderRes.ok) {
          const orderJson = await orderRes.json();
          const order = Array.isArray(orderJson?.data?.layer_order) ? orderJson.data.layer_order : [];
          setLayerOrder(order);
        }
      } catch {
        // ignore
      }
    };

    loadOptions();
    loadAppearanceAssets();
  }, []);

  const effectiveLayerOrder = layerOrder.length ? layerOrder : DEFAULT_LAYER_ORDER;
  const selectedKeyByCategory: Record<string, string | undefined> = {
    "body-types": bodyTypes[bodyType],
    "hair-styles": hairStyles[hairStyle],
    "eye-types": eyeTypes[eyeType],
    "mouth-types": mouthTypes[mouthType],

    "clothing-head": headClothingTypes[headClothing],
    "clothing-top": topClothingTypes[topClothing],
    "clothing-legs": legsClothingTypes[legsClothing],
    "clothing-shoes": shoesClothingTypes[shoesClothing],

    "armor-helmet": helmetTypes[helmet],
    "armor-chestplate": chestplateTypes[chestplate],
    "armor-leggings": leggingsTypes[leggings],
    "armor-boots": bootsTypes[boots],

    "gloves-left": leftGloveTypes[leftGlove],
    "gloves-right": rightGloveTypes[rightGlove],

    "hands-left": leftHandItems[leftHand],
    "hands-right": rightHandItems[rightHand],

    "accessories-neck": accessorySlot1Types[accessory1],
    "accessories-finger": accessorySlot2Types[accessory2],
    "accessories-wrist": accessorySlot3Types[accessory3],
    "accessories-waist": accessorySlot4Types[accessory4],
  };

  const resolvedLayers = effectiveLayerOrder
    .map((category) => {
      const key = selectedKeyByCategory[category];
      if (!key || key === "none") return null;
      const url = appearanceImageMap?.[category]?.[key];
      if (!url) return null;
      if (category === "body-types" && recoloredBodyUrl) {
        return { category, key, url: recoloredBodyUrl };
      }
      return { category, key, url };
    })
    .filter(Boolean) as Array<{ category: string; key: string; url: string }>;

  useEffect(() => {
    const baseUrl = appearanceImageMap?.["body-types"]?.[bodyTypes[bodyType]];
    if (!baseUrl || !bodyColor) {
      setRecoloredBodyUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;

    if (recolorDebounceTimerRef.current !== null) {
      window.clearTimeout(recolorDebounceTimerRef.current);
    }

    recolorDebounceTimerRef.current = window.setTimeout(() => {
      (async () => {
        const recolored = await recolorImageReplacingHex({
          imageUrl: baseUrl,
          fromHex: "#F0A96E",
          toHex: bodyColor,
          tolerance: 24,
          output: "blobUrl",
          cacheBaseImage: true,
        });
        if (cancelled) return;
        setRecoloredBodyUrl((prev) => {
          if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return recolored;
        });
      })();
    }, 90);

    return () => {
      cancelled = true;
      if (recolorDebounceTimerRef.current !== null) {
        window.clearTimeout(recolorDebounceTimerRef.current);
        recolorDebounceTimerRef.current = null;
      }
    };
  }, [appearanceImageMap, bodyTypes, bodyType, bodyColor]);

  useEffect(() => {
    if (!editingCharacterRaw) return;

    const character = editingCharacterRaw;
    setEditingCharacterId(character.id);
    setName(character.name ?? "");

    const genderMap: Record<string, "M" | "F" | "O"> = {
      male: "M",
      female: "F",
      other: "O",
      M: "M",
      F: "F",
      O: "O",
    };

    setGender(genderMap[character.gender] ?? "O");
    setBodyType(findOptionIndex(bodyTypes, character.body_type, 0));
    setBodyColor(character.body_color ?? "#ECAA70");
    setHairStyle(findOptionIndex(hairStyles, character.hair_style, 0));
    setHairColor(character.hair_color ?? "#4a3728");
    setEyeType(findOptionIndex(eyeTypes, character.eye_type, 0));
    setEyeColor(character.eye_color ?? "#1e90ff");
    setMouthType(findOptionIndex(mouthTypes, character.mouth_type, 0));

    setHeadClothing(findOptionIndex(headClothingTypes, character.head_clothing, 0));
    setTopClothing(findOptionIndex(topClothingTypes, character.top_clothing, 0));
    setLegsClothing(findOptionIndex(legsClothingTypes, character.legs_clothing, 0));
    setShoesClothing(findOptionIndex(shoesClothingTypes, character.shoes_clothing, 0));

    setHelmet(findOptionIndex(helmetTypes, character.helmet, 0));
    setChestplate(findOptionIndex(chestplateTypes, character.chestplate, 0));
    setLeggings(findOptionIndex(leggingsTypes, character.leggings, 0));
    setBoots(findOptionIndex(bootsTypes, character.boots, 0));
    setLeftGlove(findOptionIndex(leftGloveTypes, character.left_glove, 0));
    setRightGlove(findOptionIndex(rightGloveTypes, character.right_glove, 0));

    setLeftHand(findOptionIndex(leftHandItems, character.left_hand, 0));
    setRightHand(findOptionIndex(rightHandItems, character.right_hand, 0));

    setAccessory1(findOptionIndex(accessorySlot1Types, character.accessory_neck, 0));
    setAccessory2(findOptionIndex(accessorySlot2Types, character.accessory_finger, 0));
    setAccessory3(findOptionIndex(accessorySlot3Types, character.accessory_wrist, 0));
    setAccessory4(findOptionIndex(accessorySlot4Types, character.accessory_waist, 0));
  }, [
    editingCharacterRaw,
    bodyTypes,
    leftGloveTypes,
    rightGloveTypes,
    accessorySlot1Types,
    accessorySlot2Types,
    accessorySlot3Types,
    accessorySlot4Types,
    hairStyles,
    eyeTypes,
    mouthTypes,
    headClothingTypes,
    topClothingTypes,
    legsClothingTypes,
    shoesClothingTypes,
    helmetTypes,
    chestplateTypes,
    leggingsTypes,
    bootsTypes,
    leftHandItems,
    rightHandItems,
  ]);

  // Helpers for cycling through options
  const cycleOption = (current: number, max: number, direction: 1 | -1) => {
    const next = current + direction;
    if (next < 0) return max - 1;
    if (next >= max) return 0;
    return next;
  };

  const handleCreate = async () => {
    setFeedback(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setFeedback({ type: "error", message: "Character name is required" });
      return;
    }

    if (trimmedName.length < 3 || trimmedName.length > 20) {
      setFeedback({ type: "error", message: "Name must be between 3 and 20 characters" });
      return;
    }

    const characterData = {
      name: trimmedName,
      gender,
      appearance: {
        bodyType: bodyTypes[bodyType],
        bodyColor: bodyColor,
        hairStyle: hairStyles[hairStyle],
        hairColor: hairColor,
        eyeType: eyeTypes[eyeType],
        eyeColor: eyeColor,
        mouthType: mouthTypes[mouthType],
        clothing: {
          head: headClothingTypes[headClothing],
          top: topClothingTypes[topClothing],
          legs: legsClothingTypes[legsClothing],
          shoes: shoesClothingTypes[shoesClothing],
        },
        armor: {
          helmet: helmetTypes[helmet],
          chestplate: chestplateTypes[chestplate],
          leggings: leggingsTypes[leggings],
          boots: bootsTypes[boots],
          leftGlove: leftGloveTypes[leftGlove],
          rightGlove: rightGloveTypes[rightGlove],
        },
        hands: {
          left: leftHandItems[leftHand],
          right: rightHandItems[rightHand],
        },
        accessories: {
          slot1: accessorySlot1Types[accessory1], // Neck
          slot2: accessorySlot2Types[accessory2], // Finger
          slot3: accessorySlot3Types[accessory3], // Wrist
          slot4: accessorySlot4Types[accessory4], // Waist/Back
        },
      },
    };

    console.log("Creating character:", characterData);
    
    // Call the API
    const result = editingCharacterId
      ? await characterAPI.updateCharacter(editingCharacterId, characterData)
      : await characterAPI.create(characterData);

    if (result.error) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    if (result.success) {
      setFeedback({ 
        type: "success", 
        message: result.message || (editingCharacterId
          ? `Character "${name}" updated! Reviews reset and pending approval again.`
          : `Character "${name}" created! Pending approval.`)
      });

      window.dispatchEvent(new Event("notifications:changed"));

      // Reset after 2 seconds
      setTimeout(() => {
        if (editingCharacterId) {
          localStorage.removeItem("editingCharacter");
          setEditingCharacterId(null);
          setFeedback(null);
          onNavigate("profile");
          return;
        }

        setName("");
        setGender("M");
        setBodyType(0);
        setBodyColor("#ECAA70");
        setHairStyle(1);
        setHairColor("#4a3728");
        setEyeType(0);
        setEyeColor("#1e90ff");
        setMouthType(0);
        setHeadClothing(0);
        setTopClothing(1);
        setLegsClothing(1);
        setShoesClothing(1);
        setHelmet(0);
        setChestplate(0);
        setLeggings(0);
        setBoots(0);
        setLeftGlove(0);
        setRightGlove(0);
        setLeftHand(0);
        setRightHand(0);
        setAccessory1(0);
        setAccessory2(0);
        setAccessory3(0);
        setAccessory4(0);
        setFeedback(null);
      }, 2000);
    } else {
      setFeedback({ type: "error", message: "Failed to create character" });
    }
  };

  return (
    <WireframeLayout onNavigate={onNavigate} currentPage="create" isLoggedIn={isLoggedIn} onLogout={onLogout}>
      <div className="max-w-6xl mx-auto">
        <div className="border border-white/20 p-6 bg-[#121212]">
          <h2 className="border-b border-white/20 pb-3 text-lg mb-6 text-white font-['Cinzel'] tracking-wider">
            {editingCharacterId ? "Edit Character" : "Create New Character"}
          </h2>

          {editingCharacterId && (
            <div className="mb-4 border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300/90">
              Saving changes will reset this character&apos;s ratings/comments and set it back to pending approval.
              <div className="mt-3">
                <button
                  onClick={() => {
                    localStorage.removeItem("editingCharacter");
                    setEditingCharacterId(null);
                    onNavigate("profile");
                  }}
                  className="border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/5 hover:border-white/40 transition-all"
                >
                  Cancel Edit
                </button>
              </div>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div className={`mb-4 border p-3 ${
              feedback.type === "success" 
                ? "border-green-500/30 bg-green-500/5 text-green-400/90" 
                : "border-red-500/30 bg-red-500/5 text-red-400/90"
            }`}>
              {feedback.message}
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            {/* Column 1 (LEFT) - Basic Information & Face Features */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-white/90">Name</div>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-white/20 p-2 bg-[#1a1a1a] text-xs w-full text-white/80 focus:border-white/40 focus:outline-none transition-colors" 
                  placeholder="Enter name" 
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-white/90">Gender</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setGender("M")}
                    className={`border px-3 py-1 text-xs transition-all cursor-pointer ${
                      gender === "M" 
                        ? "border-white/50 bg-white/10 text-white/90" 
                        : "border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40"
                    }`}
                  >
                    M
                  </button>
                  <button 
                    onClick={() => setGender("F")}
                    className={`border px-3 py-1 text-xs transition-all cursor-pointer ${
                      gender === "F" 
                        ? "border-white/50 bg-white/10 text-white/90" 
                        : "border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40"
                    }`}
                  >
                    F
                  </button>
                  <button 
                    onClick={() => setGender("O")}
                    className={`border px-3 py-1 text-xs transition-all cursor-pointer ${
                      gender === "O" 
                        ? "border-white/50 bg-white/10 text-white/90" 
                        : "border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40"
                    }`}
                  >
                    O
                  </button>
                </div>
              </div>

              {/* Face Features Section */}
              <div className="border border-white/20 p-3 space-y-3 bg-[#0a0a0a]">
                <div className="text-xs font-semibold border-b border-white/20 pb-2 text-white/90 font-['Cinzel'] tracking-wider">FACE FEATURES</div>
                
                {/* Eyes */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Eyes</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEyeType(cycleOption(eyeType, eyeTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {eyeTypes[eyeType]}
                    </div>
                    <button 
                      onClick={() => setEyeType(cycleOption(eyeType, eyeTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Eyes Color */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Eye Color</div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={eyeColor}
                      onChange={(e) => setEyeColor(e.target.value)}
                      className="border border-white/20 h-8 w-12 bg-[#1a1a1a] cursor-pointer"
                    />
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 font-mono">
                      {eyeColor.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Mouth */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Mouth</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setMouthType(cycleOption(mouthType, mouthTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {mouthTypes[mouthType]}
                    </div>
                    <button 
                      onClick={() => setMouthType(cycleOption(mouthType, mouthTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>

              {/* Hands Section (2 slots) */}
              <div className="border border-white/20 p-3 space-y-3 bg-[#0a0a0a]">
                <div className="text-xs font-semibold border-b border-white/20 pb-2 text-white/90 font-['Cinzel'] tracking-wider">HANDS</div>
                
                {/* Left Hand */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Left Hand</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setLeftHand(cycleOption(leftHand, leftHandItems.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {leftHandItems[leftHand]}
                    </div>
                    <button 
                      onClick={() => setLeftHand(cycleOption(leftHand, leftHandItems.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Right Hand */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Right Hand</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setRightHand(cycleOption(rightHand, rightHandItems.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {rightHandItems[rightHand]}
                    </div>
                    <button 
                      onClick={() => setRightHand(cycleOption(rightHand, rightHandItems.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>

              {/* Accessories Section (4 slots) */}
              <div className="border border-white/20 p-3 space-y-3 bg-[#0a0a0a]">
                <div className="text-xs font-semibold border-b border-white/20 pb-2 text-white/90 font-['Cinzel'] tracking-wider">ACCESSORIES</div>
                
                {/* Accessory Slot 1 - Neck */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Neck</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setAccessory1(cycleOption(accessory1, accessorySlot1Types.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {accessorySlot1Types[accessory1]}
                    </div>
                    <button 
                      onClick={() => setAccessory1(cycleOption(accessory1, accessorySlot1Types.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Accessory Slot 2 - Finger */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Finger</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setAccessory2(cycleOption(accessory2, accessorySlot2Types.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {accessorySlot2Types[accessory2]}
                    </div>
                    <button 
                      onClick={() => setAccessory2(cycleOption(accessory2, accessorySlot2Types.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Accessory Slot 3 - Wrist */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Wrist</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setAccessory3(cycleOption(accessory3, accessorySlot3Types.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {accessorySlot3Types[accessory3]}
                    </div>
                    <button 
                      onClick={() => setAccessory3(cycleOption(accessory3, accessorySlot3Types.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Accessory Slot 4 - Waist/Back */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Waist/Back</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setAccessory4(cycleOption(accessory4, accessorySlot4Types.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {accessorySlot4Types[accessory4]}
                    </div>
                    <button 
                      onClick={() => setAccessory4(cycleOption(accessory4, accessorySlot4Types.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2 (CENTER) - Preview */}
            <div className="space-y-4">
              <div className="border border-white/20 p-3 bg-[#0a0a0a]">
                <div className="text-xs font-semibold border-b border-white/20 pb-2 mb-3 text-white/90 font-['Cinzel'] tracking-wider">
                  PREVIEW
                </div>
                
                {/* Character Preview Placeholder */}
                <div
                  className="border border-white/20 flex items-center justify-center bg-[#121212] mb-3 overflow-hidden"
                  style={{ aspectRatio: "1000 / 1800" }}
                >
                  <div className="relative w-full h-full">
                    {resolvedLayers.map((layer, index) => (
                      <img
                        key={`${layer.category}:${layer.key}`}
                        src={layer.url}
                        alt={layer.key}
                        className="absolute inset-0 w-full h-full"
                        style={{ zIndex: index, imageRendering: "pixelated" as any }}
                        draggable={false}
                      />
                    ))}

                    {resolvedLayers.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-xs text-white/40 p-4">
                          <div className="mb-2">[Character Preview]</div>
                          <div className="text-xs leading-relaxed">Aucun layer uploadé / sélectionné</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Character Info Summary */}
                <div className="space-y-2 text-xs">
                  <div className="border-b border-white/20 pb-2 text-white/80 font-semibold">
                    Character Summary
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-white/60">Name:</span>
                      <span className="text-white/90">{name || "[Not set]"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Gender:</span>
                      <span className="text-white/90">{gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Body:</span>
                      <span className="text-white/90 capitalize">{bodyTypes[bodyType]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Hair:</span>
                      <span className="text-white/90 capitalize">{hairStyles[hairStyle]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Eyes:</span>
                      <span className="text-white/90 capitalize">{eyeTypes[eyeType]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Mouth:</span>
                      <span className="text-white/90 capitalize">{mouthTypes[mouthType]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Body Color:</span>
                      <span className="text-white/90 font-mono text-xs">{bodyColor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Hair Color:</span>
                      <span className="text-white/90 font-mono text-xs">{hairColor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Eye Color:</span>
                      <span className="text-white/90 font-mono text-xs">{eyeColor}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/20 space-y-1 text-xs">
                    <div className="font-semibold text-white/70 mb-1">Equipment:</div>
                    <div className="text-white/60">Helmet: <span className="capitalize text-white/80">{helmetTypes[helmet]}</span></div>
                    <div className="text-white/60">Chestplate: <span className="capitalize text-white/80">{chestplateTypes[chestplate]}</span></div>
                    <div className="text-white/60">Left Hand: <span className="capitalize text-white/80">{leftHandItems[leftHand]}</span></div>
                    <div className="text-white/60">Right Hand: <span className="capitalize text-white/80">{rightHandItems[rightHand]}</span></div>
                  </div>
                </div>
              </div>

              {/* Layer Info */}
              <div className="border border-white/20 p-3 bg-[#0a0a0a] text-xs text-white/50 leading-relaxed">
                <div className="font-semibold text-white/70 mb-2">Pixel Art Layers:</div>
                <ul className="space-y-0.5 list-disc list-inside text-xs">
                  <li>Body (base + color)</li>
                  <li>Clothing (4 parts)</li>
                  <li>Armor (6 parts, hides clothing)</li>
                  <li>Hair (style + color)</li>
                  <li>Eyes (type + color)</li>
                  <li>Mouth</li>
                  <li>Hands (left + right items)</li>
                  <li>Accessories (4 slots)</li>
                </ul>
              </div>
            </div>

            {/* Column 3 (RIGHT) - Body Features & Clothing */}
            <div className="space-y-6">
              {/* Body Features Section */}
              <div className="border border-white/20 p-3 space-y-3 bg-[#0a0a0a]">
                <div className="text-xs font-semibold border-b border-white/20 pb-2 text-white/90 font-['Cinzel'] tracking-wider">BODY FEATURES</div>
                
                {/* Body Type */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Body Type</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setBodyType(cycleOption(bodyType, bodyTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {bodyTypes[bodyType]}
                    </div>
                    <button 
                      onClick={() => setBodyType(cycleOption(bodyType, bodyTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Body Color */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Body Color</div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={bodyColor}
                      onChange={(e) => setBodyColor(e.target.value)}
                      className="border border-white/20 h-8 w-12 bg-[#1a1a1a] cursor-pointer"
                    />
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 font-mono">
                      {bodyColor.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Hair Style */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Hair Style (none = bald)</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setHairStyle(cycleOption(hairStyle, hairStyles.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {hairStyles[hairStyle]}
                    </div>
                    <button 
                      onClick={() => setHairStyle(cycleOption(hairStyle, hairStyles.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Hair Color */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Hair Color</div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={hairColor}
                      onChange={(e) => setHairColor(e.target.value)}
                      className="border border-white/20 h-8 w-12 bg-[#1a1a1a] cursor-pointer"
                    />
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 font-mono">
                      {hairColor.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Clothing Section (4 parts) */}
              <div className="border border-white/20 p-3 space-y-3 bg-[#0a0a0a]">
                <div className="text-xs font-semibold border-b border-white/20 pb-2 text-white/90 font-['Cinzel'] tracking-wider">CLOTHING</div>
                
                {/* Head Clothing */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Head</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setHeadClothing(cycleOption(headClothing, headClothingTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {headClothingTypes[headClothing]}
                    </div>
                    <button 
                      onClick={() => setHeadClothing(cycleOption(headClothing, headClothingTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Top Clothing */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Top</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setTopClothing(cycleOption(topClothing, topClothingTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {topClothingTypes[topClothing]}
                    </div>
                    <button 
                      onClick={() => setTopClothing(cycleOption(topClothing, topClothingTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Legs Clothing */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Legs</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setLegsClothing(cycleOption(legsClothing, legsClothingTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {legsClothingTypes[legsClothing]}
                    </div>
                    <button 
                      onClick={() => setLegsClothing(cycleOption(legsClothing, legsClothingTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Shoes */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Shoes</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShoesClothing(cycleOption(shoesClothing, shoesClothingTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {shoesClothingTypes[shoesClothing]}
                    </div>
                    <button 
                      onClick={() => setShoesClothing(cycleOption(shoesClothing, shoesClothingTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>

              {/* Armor Section (6 parts) */}
              <div className="border border-white/20 p-3 space-y-3 bg-[#0a0a0a]">
                <div className="text-xs font-semibold border-b border-white/20 pb-2 text-white/90 font-['Cinzel'] tracking-wider">ARMOR</div>
                
                {/* Helmet */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Helmet</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setHelmet(cycleOption(helmet, helmetTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {helmetTypes[helmet]}
                    </div>
                    <button 
                      onClick={() => setHelmet(cycleOption(helmet, helmetTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Chestplate */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Chestplate</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setChestplate(cycleOption(chestplate, chestplateTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {chestplateTypes[chestplate]}
                    </div>
                    <button 
                      onClick={() => setChestplate(cycleOption(chestplate, chestplateTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Leggings */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Leggings</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setLeggings(cycleOption(leggings, leggingsTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {leggingsTypes[leggings]}
                    </div>
                    <button 
                      onClick={() => setLeggings(cycleOption(leggings, leggingsTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Boots */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Boots</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setBoots(cycleOption(boots, bootsTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {bootsTypes[boots]}
                    </div>
                    <button 
                      onClick={() => setBoots(cycleOption(boots, bootsTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Left Glove */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Left Glove</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setLeftGlove(cycleOption(leftGlove, leftGloveTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {leftGloveTypes[leftGlove]}
                    </div>
                    <button 
                      onClick={() => setLeftGlove(cycleOption(leftGlove, leftGloveTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Right Glove */}
                <div className="space-y-1">
                  <div className="text-xs text-white/70">Right Glove</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setRightGlove(cycleOption(rightGlove, rightGloveTypes.length, -1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <div className="flex-1 border border-white/20 px-2 py-1 text-center text-xs text-white/60 capitalize">
                      {rightGloveTypes[rightGlove]}
                    </div>
                    <button 
                      onClick={() => setRightGlove(cycleOption(rightGlove, rightGloveTypes.length, 1))}
                      className="border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Create / Save Button */}
          <button
            onClick={handleCreate}
            className="w-full border border-white/30 px-4 py-3 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all cursor-pointer font-['Cinzel'] tracking-wider mt-6"
          >
            {editingCharacterId ? "SAVE CHANGES" : "CREATE CHARACTER"}
          </button>
        </div>
      </div>
    </WireframeLayout>
  );
}
