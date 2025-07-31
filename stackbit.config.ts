import { defineStackbitConfig } from "@stackbit/types";

export default defineStackbitConfig({
  stackbitVersion: "~0.6.0",
  ssgName: "nextjs",
  nodeVersion: "22",
  cmsName: "git",
  buildCommand: "npm run build",
  publishDir: ".next",
  assets: {
    referenceType: "static",
    staticDir: "public",
    uploadDir: "images",
    publicPath: "/",
  },
  
  // Page models for all routes
  models: {
    Page: {
      type: "data",
      label: "Page",
      labelField: "title",
      fields: [
        {
          type: "string",
          name: "title",
          label: "Title",
          required: true,
        },
        {
          type: "string",
          name: "slug",
          label: "URL Slug",
          required: true,
        },
        {
          type: "string",
          name: "description",
          label: "Description",
        },
      ],
    },
    HomePage: {
      type: "data",
      label: "Home Page",
      singleInstance: true,
      fields: [
        {
          type: "string",
          name: "title",
          label: "Title",
          required: true,
        },
        {
          type: "string",
          name: "description",
          label: "Description",
        },
      ],
    },
    AuthPage: {
      type: "data",
      label: "Auth Page",
      fields: [
        {
          type: "string",
          name: "title",
          label: "Title",
          required: true,
        },
        {
          type: "string",
          name: "slug",
          label: "URL Slug",
          required: true,
        },
        {
          type: "enum",
          name: "authType",
          label: "Auth Type",
          options: ["login", "register", "forgot-password"],
          required: true,
        },
      ],
    },
    FeaturePage: {
      type: "data",
      label: "Feature Page",
      fields: [
        {
          type: "string",
          name: "title",
          label: "Title",
          required: true,
        },
        {
          type: "string",
          name: "slug",
          label: "URL Slug",
          required: true,
        },
        {
          type: "string",
          name: "description",
          label: "Description",
        },
        {
          type: "string",
          name: "icon",
          label: "Icon Name",
        },
      ],
    },
  },

  // Model extensions to define page types with dynamic URLs
  modelExtensions: [
    { name: "HomePage", type: "page", urlPath: "/" },
    { name: "AuthPage", type: "page", urlPath: "/{slug}" },
    { name: "FeaturePage", type: "page", urlPath: "/{slug}" },
    { name: "Page", type: "page", urlPath: "/{slug}" },
  ],

  // Pages directory configuration
  pagesDir: "src/app",
});