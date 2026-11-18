"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  categoryCreateSchema,
  type CategoryCreateInput,
} from "@pharma/validation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { publishCatalogueQuietly } from "@/lib/publish-catalogue";
import type { Category, SubCategory } from "@pharma/shared-types";

export default function CategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [subName, setSubName] = useState("");
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);

  const categories = useQuery({
    queryKey: ["categories", search],
    queryFn: async () => {
      const q = new URLSearchParams({
        limit: "100",
        ...(search ? { search } : {}),
      });
      return api.getCategories(`?${q.toString()}`);
    },
  });

  const form = useForm<CategoryCreateInput>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      displayOrder: 0,
      isActive: true,
    },
  });

  const items = useMemo(() => categories.data?.data ?? [], [categories.data]);
  const selected =
    items.find((c) => c.id === selectedCategoryId) ?? items[0] ?? null;
  const activeCategoryId = selected?.id ?? "";

  const subCategories = useQuery({
    queryKey: ["subcategories", activeCategoryId],
    enabled: Boolean(activeCategoryId),
    queryFn: () => api.listSubCategories(activeCategoryId),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CategoryCreateInput) => {
      if (editing) return api.updateCategory(editing.id, values);
      return api.createCategory(values);
    },
    onSuccess: async (saved) => {
      toast(editing ? "Category updated" : "Category created");
      setEditing(null);
      setSelectedCategoryId(saved.id);
      form.reset({ name: "", description: "", displayOrder: 0, isActive: true });
      await publishCatalogueQuietly();
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => toast(error.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: async () => {
      toast("Category deleted");
      await publishCatalogueQuietly();
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => toast(error.message, "error"),
  });

  const saveSubMutation = useMutation({
    mutationFn: async () => {
      if (!activeCategoryId || !subName.trim()) {
        throw new Error("Subcategory name is required");
      }
      if (editingSub) {
        return api.updateSubCategory(editingSub.id, { name: subName.trim() });
      }
      return api.createSubCategory(activeCategoryId, {
        name: subName.trim(),
        displayOrder: (subCategories.data?.length ?? 0) + 1,
        isActive: true,
      });
    },
    onSuccess: async () => {
      toast(editingSub ? "Subcategory updated" : "Subcategory created");
      setSubName("");
      setEditingSub(null);
      await publishCatalogueQuietly();
      await queryClient.invalidateQueries({
        queryKey: ["subcategories", activeCategoryId],
      });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => toast(error.message, "error"),
  });

  const deleteSubMutation = useMutation({
    mutationFn: (id: string) => api.deleteSubCategory(id),
    onSuccess: async () => {
      toast("Subcategory deleted");
      await publishCatalogueQuietly();
      await queryClient.invalidateQueries({
        queryKey: ["subcategories", activeCategoryId],
      });
    },
    onError: (error: Error) => toast(error.message, "error"),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit category" : "Create category"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input {...form.register("name")} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea {...form.register("description")} />
              </div>
              <div className="space-y-1.5">
                <Label>Display order</Label>
                <Input
                  type="number"
                  {...form.register("displayOrder", { valueAsNumber: true })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" {...form.register("isActive")} />
                Active
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  <Plus className="h-4 w-4" />
                  {editing ? "Save changes" : "Create"}
                </Button>
                {editing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(null);
                      form.reset({
                        name: "",
                        description: "",
                        displayOrder: 0,
                        isActive: true,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {activeCategoryId ? (
          <Card>
            <CardHeader>
              <CardTitle>Manage subcategories · {selected?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-500">
                Select a category in the table (right), then add/edit its
                subcategories here.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Subcategory name"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={() => saveSubMutation.mutate()}
                  disabled={saveSubMutation.isPending}
                >
                  {editingSub ? "Save" : "Add"}
                </Button>
              </div>
              <div className="space-y-2">
                {(subCategories.data ?? []).map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2"
                  >
                    <p className="text-sm font-medium">{sub.name}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSub(sub);
                          setSubName(sub.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm("Delete this subcategory?")) {
                            deleteSubMutation.mutate(sub.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!subCategories.data?.length && (
                  <p className="text-sm text-slate-500">
                    No subcategories yet for this category.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Categories</CardTitle>
          <Input
            className="max-w-xs"
            placeholder="Search categories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-border text-slate-500">
                <tr>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Subcategories</th>
                  <th className="py-2 font-medium">Order</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((category) => (
                  <tr
                    key={category.id}
                    className={`border-b border-surface-border ${
                      category.id === activeCategoryId ? "bg-surface-muted/60" : ""
                    }`}
                  >
                    <td className="py-3">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => setSelectedCategoryId(category.id)}
                      >
                        <p className="font-medium text-slate-800">{category.name}</p>
                        <p className="text-xs text-slate-500">
                          {category.description}
                        </p>
                      </button>
                    </td>
                    <td className="py-3">
                      {category.subCategories?.length ?? 0}
                    </td>
                    <td className="py-3">{category.displayOrder}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCategoryId(category.id);
                            setEditing(category);
                            form.reset({
                              name: category.name,
                              description: category.description ?? "",
                              displayOrder: category.displayOrder,
                              isActive: category.isActive,
                              imageUrl: category.imageUrl,
                              imageHash: category.imageHash,
                            });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm("Delete this category?")) {
                              deleteMutation.mutate(category.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && (
              <p className="py-8 text-center text-sm text-slate-500">
                No categories yet. Create the first one.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
