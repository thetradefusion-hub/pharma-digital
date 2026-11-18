import { describe, expect, it } from "vitest";
import {
  categoryCreateSchema,
  loginSchema,
  productCreateSchema,
  slideCreateSchema,
} from "@pharma/validation";

describe("shared validation schemas", () => {
  it("accepts valid login payload", () => {
    const parsed = loginSchema.parse({
      emailOrUsername: "admin@pharma.demo",
      password: "Admin@12345",
    });
    expect(parsed.emailOrUsername).toContain("@");
  });

  it("rejects empty category name", () => {
    expect(() => categoryCreateSchema.parse({ name: "" })).toThrow();
  });

  it("requires product sku and category", () => {
    expect(() =>
      productCreateSchema.parse({
        name: "Demo",
        brandName: "Brand",
      }),
    ).toThrow();
  });

  it("validates slide types", () => {
    const slide = slideCreateSchema.parse({
      title: "Intro",
      slideType: "PRODUCT_INTRO",
      bulletPoints: ["DEMO SAMPLE"],
    });
    expect(slide.slideType).toBe("PRODUCT_INTRO");
  });
});
