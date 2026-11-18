import { useLocalSearchParams } from "expo-router";
import { Redirect } from "expo-router";

/** Legacy single-product presentation → multi-product slider. */
export default function PresentationRedirect() {
  const { productId, slide } = useLocalSearchParams<{
    productId: string;
    slide?: string;
  }>();
  const params = new URLSearchParams();
  if (productId) params.set("ids", productId);
  if (slide) params.set("start", String(slide));
  return <Redirect href={`/slider?${params.toString()}` as never} />;
}
