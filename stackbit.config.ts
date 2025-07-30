import { defineStackbitConfig, SiteMapEntry } from "@stackbit/types";
import { GitContentSource } from "@stackbit/cms-git";

export default defineStackbitConfig({
    stackbitVersion: "~0.6.0",
    ssgName: "nextjs",
    nodeVersion: "21",
    contentSources: [
        new GitContentSource({
            rootPath: __dirname,
            contentDirs: ["content"],
            models: [
                {
                    name: "HomePage",
                    type: "page",
                    urlPath: "/",
                    filePath: "content/landing.json",
                    singleInstance: true,
                    fields: [
                        {
                            name: "hero",
                            type: "object",
                            fields: [
                                { name: "badge", type: "string", required: true },
                                { name: "title", type: "string", required: true },
                                { name: "description", type: "string", required: true },
                                { name: "ctaText", type: "string", required: true },
                                { name: "features", type: "list", items: { type: "string" } }
                            ]
                        },
                        {
                            name: "whyChoose",
                            type: "object",
                            fields: [
                                { name: "title", type: "string", required: true },
                                { name: "subtitle", type: "string", required: true },
                                {
                                    name: "features",
                                    type: "list",
                                    items: {
                                        type: "object",
                                        fields: [
                                            { name: "title", type: "string", required: true },
                                            { name: "description", type: "string", required: true }
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    name: "AuthContent",
                    type: "data",
                    filePath: "content/auth.json",
                    singleInstance: true,
                    fields: [
                        {
                            name: "login",
                            type: "object",
                            fields: [
                                { name: "title", type: "string", required: true },
                                { name: "emailLabel", type: "string", required: true },
                                { name: "emailPlaceholder", type: "string", required: true }
                            ]
                        }
                    ]
                },
                {
                    name: "InboxContent",
                    type: "data",
                    filePath: "content/inbox.json",
                    singleInstance: true,
                    fields: [
                        {
                            name: "header",
                            type: "object",
                            fields: [
                                { name: "title", type: "string", required: true },
                                { name: "subtitle", type: "string", required: true }
                            ]
                        }
                    ]
                }
            ]
        })
    ],
    siteMap: ({ documents, models }) => {
        // 1. Filter all page models
        const pageModels = models.filter((m) => m.type === "page");

        // 2. Create site map entries for our static pages
        const homePageDoc = documents.find(d => d.modelName === "HomePage");
        const staticPages: SiteMapEntry[] = homePageDoc ? [
            {
                stableId: "home",
                urlPath: "/",
                document: homePageDoc,
                isHomePage: true,
            }
        ] : [];

        // 3. Map other page documents to site map entries
        const dynamicPages = documents
            .filter((d) => pageModels.some(m => m.name === d.modelName && m.name !== "HomePage"))
            .map((document) => {
                const urlPath = (() => {
                    switch (document.modelName) {
                        case 'AuthContent':
                            return null; // Data model, not a page
                        case 'InboxContent':
                            return null; // Data model, not a page
                        default:
                            return `/${document.modelName.toLowerCase()}`;
                    }
                })();

                if (!urlPath) return null;

                return {
                    stableId: document.id,
                    urlPath,
                    document,
                    isHomePage: false,
                };
            })
            .filter(Boolean) as SiteMapEntry[];

        return [...staticPages, ...dynamicPages];
    }
});