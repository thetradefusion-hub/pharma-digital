import type {
  ApiResponse,
  AuthTokens,
  AuthUser,
  CatalogueManifest,
  CatalogueVersionInfo,
  Category,
  DashboardCharts,
  DashboardStats,
  ActivityLogItem,
  PaginationMeta,
  Presentation,
  PresentationSlide,
  Product,
  ProductImage,
  SubCategory,
} from "@pharma/shared-types";

export type TokenGetter = () => string | null | Promise<string | null>;
export type TokenSetter = (tokens: AuthTokens | null) => void | Promise<void>;

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: TokenGetter;
  getRefreshToken?: TokenGetter;
  setTokens?: TokenSetter;
  onUnauthorized?: () => void | Promise<void>;
  fetchImpl?: typeof fetch;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class PharmaApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: TokenGetter;
  private readonly getRefreshToken?: TokenGetter;
  private readonly setTokens?: TokenSetter;
  private readonly onUnauthorized?: () => void | Promise<void>;
  private readonly fetchImpl: typeof fetch;
  private refreshPromise: Promise<AuthTokens | null> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
    this.getRefreshToken = options.getRefreshToken;
    this.setTokens = options.setTokens;
    this.onUnauthorized = options.onUnauthorized;
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    retry = true,
  ): Promise<{ data: T; meta?: PaginationMeta }> {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = this.getAccessToken ? await this.getAccessToken() : null;
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (response.status === 401 && retry && this.getRefreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return this.request<T>(path, init, false);
      }
      await this.onUnauthorized?.();
    }

    const raw = await response.text();
    let payload: ApiResponse<T> | null = null;
    if (raw) {
      try {
        payload = JSON.parse(raw) as ApiResponse<T>;
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      if (payload && !payload.success) {
        throw new ApiError(
          payload.error.code,
          payload.error.message,
          response.status,
          "details" in payload.error ? payload.error.details : undefined,
        );
      }
      const fallback =
        response.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : raw?.trim() || response.statusText || "Request failed";
      throw new ApiError(
        response.status === 429 ? "RATE_LIMITED" : "HTTP_ERROR",
        fallback.slice(0, 200),
        response.status,
      );
    }

    if (!payload || !payload.success) {
      throw new ApiError(
        "INVALID_RESPONSE",
        "Server returned an unexpected response",
        response.status,
      );
    }

    return { data: payload.data, meta: payload.meta };
  }

  private async refreshAccessToken(): Promise<AuthTokens | null> {
    if (!this.getRefreshToken || !this.setTokens) return null;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const refreshToken = await this.getRefreshToken!();
      if (!refreshToken) return null;
      try {
        const result = await this.request<AuthTokens>(
          "/auth/refresh",
          {
            method: "POST",
            body: JSON.stringify({ refreshToken }),
          },
          false,
        );
        await this.setTokens!(result.data);
        return result.data;
      } catch {
        await this.setTokens!(null);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async login(emailOrUsername: string, password: string) {
    const result = await this.request<{ user: AuthUser; tokens: AuthTokens }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ emailOrUsername, password }),
      },
      false,
    );
    await this.setTokens?.(result.data.tokens);
    return result.data;
  }

  async logout(refreshToken: string) {
    await this.request<{ ok: true }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    await this.setTokens?.(null);
  }

  async me() {
    const result = await this.request<AuthUser>("/auth/me");
    return result.data;
  }

  async getCategories(query = "") {
    const result = await this.request<Category[]>(`/categories${query}`);
    return result;
  }

  async createCategory(body: unknown) {
    const result = await this.request<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.data;
  }

  async updateCategory(id: string, body: unknown) {
    const result = await this.request<Category>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return result.data;
  }

  async deleteCategory(id: string) {
    await this.request<{ ok: true }>(`/categories/${id}`, { method: "DELETE" });
  }

  async listSubCategories(categoryId: string) {
    const result = await this.request<SubCategory[]>(
      `/categories/${categoryId}/subcategories`,
    );
    return result.data;
  }

  async createSubCategory(
    categoryId: string,
    body: { name: string; description?: string | null; displayOrder?: number; isActive?: boolean },
  ) {
    const result = await this.request<SubCategory>(
      `/categories/${categoryId}/subcategories`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return result.data;
  }

  async updateSubCategory(subId: string, body: unknown) {
    const result = await this.request<SubCategory>(
      `/categories/subcategories/${subId}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    return result.data;
  }

  async deleteSubCategory(subId: string) {
    await this.request<{ ok: true }>(`/categories/subcategories/${subId}`, {
      method: "DELETE",
    });
  }

  async getProducts(query = "") {
    return this.request<Product[]>(`/products${query}`);
  }

  async getProduct(id: string) {
    const result = await this.request<Product>(`/products/${id}`);
    return result.data;
  }

  async createProduct(body: unknown) {
    const result = await this.request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.data;
  }

  async updateProduct(id: string, body: unknown) {
    const result = await this.request<Product>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return result.data;
  }

  async deleteProduct(id: string) {
    await this.request<{ ok: true }>(`/products/${id}`, { method: "DELETE" });
  }

  async duplicateProduct(id: string) {
    const result = await this.request<Product>(`/products/${id}/duplicate`, {
      method: "POST",
    });
    return result.data;
  }

  async getPresentation(productId: string) {
    const result = await this.request<Presentation>(
      `/products/${productId}/presentation`,
    );
    return result.data;
  }

  async upsertPresentation(productId: string, body: unknown) {
    const result = await this.request<Presentation>(
      `/products/${productId}/presentation`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    return result.data;
  }

  async createSlide(productId: string, body: unknown) {
    const result = await this.request<PresentationSlide>(
      `/products/${productId}/slides`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return result.data;
  }

  async updateSlide(id: string, body: unknown) {
    const result = await this.request<PresentationSlide>(`/slides/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return result.data;
  }

  async deleteSlide(id: string) {
    await this.request<{ ok: true }>(`/slides/${id}`, { method: "DELETE" });
  }

  async reorderSlides(presentationId: string, slideIds: string[]) {
    const result = await this.request<PresentationSlide[]>(
      `/presentations/${presentationId}/reorder`,
      { method: "PUT", body: JSON.stringify({ slideIds }) },
    );
    return result.data;
  }

  async publishPresentation(presentationId: string) {
    const result = await this.request<Presentation>(
      `/presentations/${presentationId}/publish`,
      { method: "POST" },
    );
    return result.data;
  }

  async getCatalogueVersion() {
    const result = await this.request<CatalogueVersionInfo>("/catalogue/version");
    return result.data;
  }

  async getCatalogueManifest() {
    const result = await this.request<CatalogueManifest>("/catalogue/manifest");
    return result.data;
  }

  async publishCatalogue(body: unknown = {}) {
    const result = await this.request<CatalogueVersionInfo>("/catalogue/publish", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.data;
  }

  async getDashboardStats() {
    const result = await this.request<DashboardStats>("/dashboard/stats");
    return result.data;
  }

  async getDashboardCharts() {
    const result = await this.request<DashboardCharts>("/dashboard/charts");
    return result.data;
  }

  async getDashboardActivity() {
    const result = await this.request<ActivityLogItem[]>("/dashboard/activity");
    return result.data;
  }

  async uploadImage(file: Blob, fileName: string) {
    const form = new FormData();
    form.append("file", file, fileName);
    const result = await this.request<{
      url: string;
      publicId: string;
      contentHash: string;
    }>("/uploads/image", { method: "POST", body: form });
    return result.data;
  }

  async reorderProductImages(productId: string, imageIds: string[]) {
    const result = await this.request<ProductImage[]>(
      `/products/${productId}/images/reorder`,
      { method: "PUT", body: JSON.stringify({ imageIds }) },
    );
    return result.data;
  }

  async addProductImages(
    productId: string,
    images: Array<{
      url: string;
      publicId?: string;
      contentHash?: string;
      altText?: string;
    }>,
  ) {
    const result = await this.request<ProductImage[]>(
      `/products/${productId}/images`,
      { method: "POST", body: JSON.stringify({ images }) },
    );
    return result.data;
  }

  async deleteProductImage(imageId: string) {
    await this.request<{ ok: true }>(`/products/images/${imageId}`, {
      method: "DELETE",
    });
  }

  async listUsers(query = "") {
    return this.request<
      Array<{
        id: string;
        email: string;
        username: string;
        fullName: string;
        role: string;
        isActive: boolean;
        lastLoginAt: string | null;
      }>
    >(`/users${query}`);
  }

  async createUser(body: unknown) {
    const result = await this.request<unknown>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.data;
  }

  async updateUser(id: string, body: unknown) {
    const result = await this.request<unknown>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return result.data;
  }

  async setUserStatus(id: string, isActive: boolean) {
    const result = await this.request<unknown>(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    return result.data;
  }

  async resetUserPassword(id: string, password: string) {
    const result = await this.request<{ ok: true }>(
      `/users/${id}/reset-password`,
      { method: "POST", body: JSON.stringify({ password }) },
    );
    return result.data;
  }

  async getCatalogueChanges(sinceVersion?: number) {
    const query =
      sinceVersion !== undefined ? `?sinceVersion=${sinceVersion}` : "";
    const result = await this.request<{
      currentVersion: number;
      changes: Array<{
        id: string;
        version: number;
        entityType: string;
        entityId: string;
        changeType: string;
        summary: string;
        createdAt: string;
      }>;
    }>(`/catalogue/changes${query}`);
    return result.data;
  }

  async unpublishCatalogue() {
    const result = await this.request<CatalogueVersionInfo>(
      "/catalogue/unpublish",
      { method: "POST" },
    );
    return result.data;
  }

  async getCataloguePayload() {
    const result = await this.request<{
      version: CatalogueVersionInfo;
      categories: Category[];
      subCategories: SubCategory[];
      products: Product[];
    }>("/catalogue/payload");
    return result.data;
  }
}

export function createApiClient(options: ApiClientOptions) {
  return new PharmaApiClient(options);
}
