import { defineStackbitConfig, SiteMapEntry, Document, Model } from "@stackbit/types";

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

  // Content source configuration
  contentSources: [
    {
      name: "pages",
      type: "git",
      branch: "main",
      rootPath: "/",
    },
  ],

  // Dynamic sitemap generation
  siteMap: ({ documents, models }: { documents: Document[], models: Model[] }): SiteMapEntry[] => {
    // 1. Filter all page models which were defined in modelExtensions
    const pageModels = models.filter((m) => m.type === "page");

    // 2. Create static entries for known pages
    const staticPages: SiteMapEntry[] = [
      {
        stableId: "home",
        label: "Home",
        urlPath: "/",
        document: {
          id: "home",
          modelName: "HomePage",
          fields: {
            title: "Home",
            description: "Welcome to LiveGuide",
          },
        },
        isHomePage: true,
      },
      {
        stableId: "login",
        label: "Login",
        urlPath: "/login",
        document: {
          id: "login",
          modelName: "AuthPage",
          fields: {
            title: "Login",
            slug: "login",
            authType: "login",
          },
        },
        isHomePage: false,
      },
      {
        stableId: "register",
        label: "Register",
        urlPath: "/register",
        document: {
          id: "register",
          modelName: "AuthPage",
          fields: {
            title: "Register",
            slug: "register",
            authType: "register",
          },
        },
        isHomePage: false,
      },
      {
        stableId: "agents",
        label: "Agents",
        urlPath: "/agents",
        document: {
          id: "agents",
          modelName: "FeaturePage",
          fields: {
            title: "AI Agents",
            slug: "agents",
            description: "Choose your AI coaching companion",
            icon: "robot",
          },
        },
        isHomePage: false,
      },
      {
        stableId: "inbox",
        label: "Inbox",
        urlPath: "/inbox",
        document: {
          id: "inbox",
          modelName: "FeaturePage",
          fields: {
            title: "Inbox",
            slug: "inbox",
            description: "Your messages and notifications",
            icon: "inbox",
          },
        },
        isHomePage: false,
      },
      {
        stableId: "progress",
        label: "Progress",
        urlPath: "/progress",
        document: {
          id: "progress",
          modelName: "FeaturePage",
          fields: {
            title: "Progress",
            slug: "progress",
            description: "Track your personal development journey",
            icon: "chart",
          },
        },
        isHomePage: false,
      },
      {
        stableId: "settings",
        label: "Settings",
        urlPath: "/settings",
        document: {
          id: "settings",
          modelName: "FeaturePage",
          fields: {
            title: "Settings",
            slug: "settings",
            description: "Manage your account and preferences",
            icon: "cog",
          },
        },
        isHomePage: false,
      },
      {
        stableId: "onboarding",
        label: "Voice Onboarding",
        urlPath: "/onboarding/voice-guided",
        document: {
          id: "onboarding",
          modelName: "Page",
          fields: {
            title: "Voice Onboarding",
            slug: "onboarding/voice-guided",
            description: "Get started with voice-guided setup",
          },
        },
        isHomePage: false,
      },
      {
        stableId: "privacy",
        label: "Privacy Policy",
        urlPath: "/privacy",
        document: {
          id: "privacy",
          modelName: "Page",
          fields: {
            title: "Privacy Policy",
            slug: "privacy",
            description: "Our privacy and data protection policies",
          },
        },
        isHomePage: false,
      },
    ];

    // 3. Process any dynamic documents (if they exist)
    const dynamicPages = documents
      .filter((d) => pageModels.some((m) => m.name === d.modelName))
      .filter((d) => !staticPages.some((sp) => sp.document?.id === d.id))
      .map((document): SiteMapEntry => {
        // Determine URL path based on model and slug
        const urlPath = (() => {
          switch (document.modelName) {
            case "HomePage":
              return "/";
            case "AuthPage":
            case "FeaturePage":
            case "Page":
              return `/${document.fields?.slug || document.id}`;
            default:
              return `/${document.id}`;
          }
        })();

        return {
          stableId: document.id,
          label: document.fields?.title || document.id,
          urlPath,
          document,
          isHomePage: document.modelName === "HomePage",
        };
      });

    // 4. Combine static and dynamic pages
    return [...staticPages, ...dynamicPages];
  },

  // Pages directory configuration
  pagesDir: "src/app",
});