"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productCreateSchema,
  type ProductCreateInput,
} from "@pharma/validation";
import { ChevronLeft, ChevronRight, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { publishCatalogueQuietly } from "@/lib/publish-catalogue";

type SimpleProductForm = Pick<
  ProductCreateInput,
  "name" | "brandName" | "categoryId" | "subCategoryId" | "status"
>;

function makeSku(brand: string, name: string) {
  const base = `${brand}-${name}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || `SKU-${Date.now()}`;
}

export default function ProductEditorPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sliderIndex, setSliderIndex] = useState(0);

  const categories = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => (await api.getCategories("?limit=100")).data,
  });

  const product = useQuery({
    queryKey: ["product", params.id],
    enabled: !isNew,
    queryFn: () => api.getProduct(params.id),
  });

  const form = useForm<SimpleProductForm>({
    resolver: zodResolver(
      productCreateSchema.pick({
        name: true,
        brandName: true,
        categoryId: true,
        subCategoryId: true,
        status: true,
      }),
    ),
    defaultValues: {
      name: "",
      brandName: "",
      categoryId: "",
      subCategoryId: null,
      status: "PUBLISHED",
    },
  });

  const watchedCategoryId = form.watch("categoryId");

  const subCategories = useQuery({
    queryKey: ["subcategories", watchedCategoryId],
    enabled: Boolean(watchedCategoryId),
    queryFn: () => api.listSubCategories(watchedCategoryId),
  });

  useEffect(() => {
    if (!product.data) return;
    const p = product.data;
    form.reset({
      name: p.name,
      brandName: p.brandName,
      categoryId: p.categoryId,
      subCategoryId: p.subCategoryId ?? null,
      status: p.status,
    });
    setSliderIndex(0);
  }, [product.data, form]);

  const images = product.data?.images ?? [];
  const activeImage = images[Math.min(sliderIndex, Math.max(images.length - 1, 0))];

  const saveMutation = useMutation({
    mutationFn: async (values: SimpleProductForm) => {
      const sku =
        product.data?.sku?.trim() ||
        makeSku(values.brandName, values.name);
      const payload: ProductCreateInput = {
        name: values.name,
        brandName: values.brandName,
        sku,
        categoryId: values.categoryId,
        subCategoryId: values.subCategoryId || null,
        status: values.status,
        featured: product.data?.featured ?? false,
        displayOrder: product.data?.displayOrder ?? 0,
        genericName: product.data?.genericName ?? null,
        composition: product.data?.composition ?? null,
        strength: product.data?.strength ?? null,
        dosageForm: product.data?.dosageForm ?? null,
        packSize: product.data?.packSize ?? null,
        description: product.data?.description ?? null,
        approvedIndications: product.data?.approvedIndications ?? null,
        keyInformation: product.data?.keyInformation ?? null,
        highlights: product.data?.highlights ?? null,
        prescribingInfo: product.data?.prescribingInfo ?? null,
        precautions: product.data?.precautions ?? null,
        storageInstructions: product.data?.storageInstructions ?? null,
      };
      if (isNew) return api.createProduct(payload);
      return api.updateProduct(params.id, payload);
    },
    onSuccess: async (saved) => {
      toast(isNew ? "Product created" : "Product updated");
      await publishCatalogueQuietly();
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      router.replace(`/products/${saved.id}`);
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList | File[]) => {
      const list = Array.from(files);
      for (const file of list) {
        const uploaded = await api.uploadImage(file, file.name);
        await api.addProductImages(params.id, [
          {
            url: uploaded.url,
            publicId: uploaded.publicId,
            contentHash: uploaded.contentHash,
            altText: file.name,
          },
        ]);
      }
    },
    onSuccess: async () => {
      toast("Slide images added");
      await publishCatalogueQuietly();
      await queryClient.invalidateQueries({ queryKey: ["product", params.id] });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => api.deleteProductImage(imageId),
    onSuccess: async () => {
      toast("Image removed");
      setSliderIndex((i) => Math.max(0, i - 1));
      await publishCatalogueQuietly();
      await queryClient.invalidateQueries({ queryKey: ["product", params.id] });
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const moveImage = async (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const ids = images.map((img) => img.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    try {
      await api.reorderProductImages(params.id, ids);
      setSliderIndex(to);
      await queryClient.invalidateQueries({ queryKey: ["product", params.id] });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Reorder failed", "error");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{isNew ? "Add product" : "Edit product"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <div className="space-y-1.5">
              <Label>Product name</Label>
              <Input {...form.register("name")} placeholder="DemoNutri Caps" />
            </div>
            <div className="space-y-1.5">
              <Label>Brand name</Label>
              <Input {...form.register("brandName")} placeholder="DemoNutri" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                className="h-10 w-full rounded-md border border-surface-border bg-white px-3 text-sm"
                {...form.register("categoryId", {
                  onChange: () => form.setValue("subCategoryId", null),
                })}
              >
                <option value="">Select category</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Subcategory</Label>
              <select
                className="h-10 w-full rounded-md border border-surface-border bg-white px-3 text-sm"
                {...form.register("subCategoryId")}
                disabled={!watchedCategoryId}
              >
                <option value="">No subcategory</option>
                {(subCategories.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-md border border-surface-border bg-white px-3 text-sm md:max-w-xs"
                {...form.register("status")}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save product"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/products")}
              >
                Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!isNew && (
        <Card>
          <CardHeader>
            <CardTitle>Slide images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Yahi pe product ki presentation slides add karni hain. Mobile pe
              ye images fullscreen slider me dikhengi.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    uploadMutation.mutate(e.target.files);
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadMutation.isPending ? "Uploading…" : "Add slide images"}
              </Button>
              {images.length > 0 && (
                <span className="text-sm text-slate-500">
                  {images.length} slide{images.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {images.length === 0 ? (
              <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted px-6 py-16 text-center text-sm text-slate-500">
                Abhi koi slide image nahi hai. “Add slide images” se upload
                karein.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-surface-border bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeImage.url}
                    alt={activeImage.altText ?? "Product slide"}
                    className="mx-auto max-h-[420px] w-full object-contain"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                      disabled={sliderIndex <= 0}
                      onClick={() => setSliderIndex((i) => i - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-white">
                      {sliderIndex + 1} / {images.length}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                      disabled={sliderIndex >= images.length - 1}
                      onClick={() => setSliderIndex((i) => i + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSliderIndex(index)}
                      className={`relative h-20 w-28 overflow-hidden rounded-md border-2 ${
                        index === sliderIndex
                          ? "border-brand"
                          : "border-surface-border"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={sliderIndex <= 0}
                    onClick={() => void moveImage(sliderIndex, sliderIndex - 1)}
                  >
                    Move left
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={sliderIndex >= images.length - 1}
                    onClick={() => void moveImage(sliderIndex, sliderIndex + 1)}
                  >
                    Move right
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={!activeImage || deleteImageMutation.isPending}
                    onClick={() => {
                      if (
                        activeImage &&
                        confirm("Remove this image from the slider?")
                      ) {
                        deleteImageMutation.mutate(activeImage.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove image
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isNew && (
        <p className="text-sm text-slate-500">
          Pehle product save karein — uske baad yahi page pe slide images
          upload ho jayengi.
        </p>
      )}
    </div>
  );
}
