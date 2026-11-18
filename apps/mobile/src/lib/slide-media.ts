import type { PresentationSlide, ProductImage } from "@pharma/shared-types";
import type { LocalProductRow } from "./db/catalogue-repo";

export type SlideVisual = {
  slideId: string;
  title: string;
  uri: string;
  backgroundColor?: string | null;
  productId?: string;
  productName?: string;
  brandName?: string;
};

/** Prefer main → background → secondary image for legacy presentation slides. */
export function slideVisualUri(slide: PresentationSlide): string | null {
  return (
    slide.mainImageUrl ||
    slide.backgroundImageUrl ||
    slide.secondaryImageUrl ||
    null
  );
}

export function collectSlideVisuals(
  slides: PresentationSlide[] | undefined | null,
): SlideVisual[] {
  if (!slides?.length) return [];
  const out: SlideVisual[] = [];
  for (const slide of slides) {
    if (!slide.isActive) continue;
    const uri = slideVisualUri(slide);
    if (!uri) continue;
    out.push({
      slideId: slide.id,
      title: slide.title,
      uri,
      backgroundColor: slide.backgroundColor,
    });
  }
  return out;
}

/** Product image gallery → fullscreen slider visuals. */
export function collectProductImageVisuals(
  images: ProductImage[] | undefined | null,
  meta?: { productId?: string; productName?: string; brandName?: string },
): SlideVisual[] {
  if (!images?.length) return [];
  return [...images]
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.displayOrder - b.displayOrder;
    })
    .filter((img) => Boolean(img.url))
    .map((img, index) => ({
      slideId: img.id,
      title: img.altText || `Slide ${index + 1}`,
      uri: img.url,
      productId: meta?.productId,
      productName: meta?.productName,
      brandName: meta?.brandName,
    }));
}

/** Prefer product images; fall back to presentation slide images. */
export function collectVisualAidSlides(options: {
  images?: ProductImage[] | null;
  slides?: PresentationSlide[] | null;
  productId?: string;
  productName?: string;
  brandName?: string;
}): SlideVisual[] {
  const fromProduct = collectProductImageVisuals(options.images, {
    productId: options.productId,
    productName: options.productName,
    brandName: options.brandName,
  });
  if (fromProduct.length) return fromProduct;
  return collectSlideVisuals(options.slides).map((s) => ({
    ...s,
    productId: options.productId,
    productName: options.productName,
    brandName: options.brandName,
  }));
}

/** Chain images from many selected products into one slider. */
export function collectSlidesForProducts(
  products: LocalProductRow[],
): SlideVisual[] {
  const out: SlideVisual[] = [];
  for (const product of products) {
    out.push(
      ...collectVisualAidSlides({
        images: product.images,
        productId: product.id,
        productName: product.name,
        brandName: product.brandName,
      }),
    );
  }
  return out;
}

export function firstSlideIndexForProduct(
  slides: SlideVisual[],
  productId: string,
): number {
  const idx = slides.findIndex((s) => s.productId === productId);
  return idx >= 0 ? idx : 0;
}
