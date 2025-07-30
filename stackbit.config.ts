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
                    name: "Page",
                    type: "page",
                    urlPath: "/{slug}",
                    filePath: "content/pages/{slug}.json",
                    fields: [
                        { name: "title", type: "string", required: true }
                    ]
                },
                {
                    name: "LandingPage",
                    type: "page",
                    urlPath: "/",
                    filePath: "content/landing.json",
                    singleInstance: true,
                    fields: [
                        { name: "title", type: "string", default: "Home" }
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

        return documents
            // 2. Filter all documents which are of a page model
            .filter((d) => pageModels.some(m => m.name === d.modelName))
            // 3. Map each document to a SiteMapEntry
            .map((document) => {
                // Special handling for LandingPage
                if (document.modelName === 'LandingPage') {
                    return {
                        stableId: document.id,
                        urlPath: '/',
                        document,
                        isHomePage: true,
                    };
                }

                // Map the model name to its corresponding URL prefix
                const urlPrefix = (() => {
                    switch (document.modelName) {
                        case 'Page':
                            return 'page';
                        case 'BlogPost':
                            return 'blog';
                        default:
                            return document.modelName.toLowerCase();
                    }
                })();

                return {
                    stableId: document.id,
                    urlPath: `/${urlPrefix}/${document.id}`,
                    document,
                    isHomePage: false,
                };
            })
            .filter(Boolean) as SiteMapEntry[];
    }
});