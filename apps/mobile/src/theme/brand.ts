import type { ImageSourcePropType } from "react-native";

export const BRAND_NAME = "Pharma Digital";
export const BRAND_TAGLINE = "Product Catalogue & Visual Aid";

export const brandImages = {
  logo: require("../../assets/branding/logo.jpg") as ImageSourcePropType,
  hero: require("../../assets/branding/hero-medicines.jpg") as ImageSourcePropType,
  ctaTablet: require("../../assets/branding/cta-tablet.jpg") as ImageSourcePropType,
  categories: {
    allopathy: require("../../assets/branding/cat-allopathy.jpg") as ImageSourcePropType,
    homeopathy: require("../../assets/branding/cat-homeopathy.jpg") as ImageSourcePropType,
    ayurveda: require("../../assets/branding/cat-ayurveda.jpg") as ImageSourcePropType,
    unani: require("../../assets/branding/cat-unani.jpg") as ImageSourcePropType,
    nutraceuticals: require("../../assets/branding/cat-nutra.jpg") as ImageSourcePropType,
  },
} as const;

export const categoryThemes: Array<{
  match: RegExp;
  background: string;
  image: ImageSourcePropType;
  wide?: boolean;
}> = [
  {
    match: /allopath/i,
    background: "#FCE8E8",
    image: brandImages.categories.allopathy,
  },
  {
    match: /homeopath/i,
    background: "#EDE8F8",
    image: brandImages.categories.homeopathy,
  },
  {
    match: /ayurved/i,
    background: "#E8F5E9",
    image: brandImages.categories.ayurveda,
  },
  {
    match: /unani/i,
    background: "#FFF6E0",
    image: brandImages.categories.unani,
  },
  {
    match: /nutra|supplement/i,
    background: "#E3F2FD",
    image: brandImages.categories.nutraceuticals,
    wide: true,
  },
];

const fallbackThemes = [
  { background: "#FCE8E8", image: brandImages.categories.allopathy },
  { background: "#EDE8F8", image: brandImages.categories.homeopathy },
  { background: "#E8F5E9", image: brandImages.categories.ayurveda },
  { background: "#FFF6E0", image: brandImages.categories.unani },
  { background: "#E3F2FD", image: brandImages.categories.nutraceuticals },
];

export function getCategoryTheme(name: string, index = 0) {
  const matched = categoryThemes.find((t) => t.match.test(name));
  if (matched) return matched;
  const fallback = fallbackThemes[index % fallbackThemes.length];
  return { ...fallback, wide: false };
}
