import swaggerJsdoc from "swagger-jsdoc";
import { env } from "../config/env.js";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Pharma Digital Catalogue API",
      version: "1.0.0",
      description:
        "REST API for pharmaceutical digital catalogue, interactive visual aids, and offline sync.",
    },
    servers: [{ url: `${env.API_BASE_URL}/api` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/auth/login": {
        post: {
          tags: ["Auth"],
          security: [],
          summary: "Login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["emailOrUsername", "password"],
                  properties: {
                    emailOrUsername: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Authenticated" } },
        },
      },
      "/catalogue/version": {
        get: {
          tags: ["Catalogue"],
          summary: "Get published catalogue version",
          responses: { 200: { description: "Version info" } },
        },
      },
      "/catalogue/publish": {
        post: {
          tags: ["Catalogue"],
          summary: "Publish a new catalogue version",
          responses: { 201: { description: "Published" } },
        },
      },
      "/products": {
        get: {
          tags: ["Products"],
          summary: "List products",
          responses: { 200: { description: "Product list" } },
        },
        post: {
          tags: ["Products"],
          summary: "Create product",
          responses: { 201: { description: "Created" } },
        },
      },
      "/categories": {
        get: {
          tags: ["Categories"],
          summary: "List categories",
          responses: { 200: { description: "Category list" } },
        },
      },
      "/dashboard/stats": {
        get: {
          tags: ["Dashboard"],
          summary: "Dashboard statistics",
          responses: { 200: { description: "Stats" } },
        },
      },
    },
  },
  apis: [],
});
