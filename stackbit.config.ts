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
                        { name: "slug", type: "slug", required: true },
                        { name: "title", type: "string", required: true },
                        { name: "content", type: "markdown" }
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

        // 2. Map page documents to site map entries
        return documents
            .filter((d) => pageModels.some(m => m.name === d.modelName))
            .map((document) => {
                // Handle different page types
                if (document.modelName === 'LandingPage') {
                    return {
                        stableId: 'home',
                        urlPath: '/',
                        document,
                        isHomePage: true,
                    };
                }
                
                // Handle generic pages with slugs
                const slugField = document.fields?.slug;
                const slug: string = typeof slugField === 'string' ? slugField : '';
                const isHome = slug === 'index' || slug.length === 0;
                
                return {
                    stableId: document.id,
                    urlPath: isHome ? '/' : `/${slug}`,
                    document,
                    isHomePage: isHome,
                };
            }) as SiteMapEntry[];
    }
});