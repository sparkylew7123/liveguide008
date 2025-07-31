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

  // Static sitemap with documents
  siteMap: ({ documents, models }) => {
    // Filter page models
    const pageModels = models.filter(m => m.type === "page").map(m => m.name);
    
    // Create static pages as pseudo-documents
    const staticPages = [
      {
        stableId: "home",
        label: "Home",
        urlPath: "/",
        isHomePage: true,
        document: {
          id: "home",
          modelName: "HomePage",
        },
      },
      {
        stableId: "login",
        label: "Login",
        urlPath: "/login",
        document: {
          id: "login",
          modelName: "AuthPage",
        },
      },
      {
        stableId: "register",
        label: "Register",
        urlPath: "/register",
        document: {
          id: "register",
          modelName: "AuthPage",
        },
      },
      {
        stableId: "agents",
        label: "AI Agents",
        urlPath: "/agents",
        document: {
          id: "agents",
          modelName: "FeaturePage",
        },
      },
      {
        stableId: "inbox",
        label: "Inbox",
        urlPath: "/inbox",
        document: {
          id: "inbox",
          modelName: "FeaturePage",
        },
      },
      {
        stableId: "progress",
        label: "Progress",
        urlPath: "/progress",
        document: {
          id: "progress",
          modelName: "FeaturePage",
        },
      },
      {
        stableId: "settings",
        label: "Settings",
        urlPath: "/settings",
        document: {
          id: "settings",
          modelName: "FeaturePage",
        },
      },
      {
        stableId: "onboarding",
        label: "Voice Onboarding",
        urlPath: "/onboarding/voice-guided",
        document: {
          id: "onboarding",
          modelName: "Page",
        },
      },
      {
        stableId: "privacy",
        label: "Privacy Policy",
        urlPath: "/privacy",
        document: {
          id: "privacy",
          modelName: "Page",
        },
      },
    ];
    
    // Process any existing documents
    const dynamicPages = documents
      .filter(d => pageModels.includes(d.modelName))
      .map(document => ({
        stableId: document.id,
        label: String(document.fields?.title || document.id),
        urlPath: document.modelName === "HomePage" ? "/" : `/${String(document.fields?.slug || document.id)}`,
        document,
        isHomePage: document.modelName === "HomePage",
      }));
    
    // Return combined static and dynamic pages
    return [...staticPages, ...dynamicPages];
  },

  // Pages directory configuration
  pagesDir: "src/app",
});