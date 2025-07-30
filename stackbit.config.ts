import { defineStackbitConfig, SiteMapEntry } from "@stackbit/types";
import { GitContentSource } from "@stackbit/cms-git";

export default defineStackbitConfig({
    stackbitVersion: "~0.6.0",
    ssgName: "nextjs",
    nodeVersion: "21",
    modelExtensions: [
        {
            name: "Page",
            fields: [
                {
                    name: "pageId",
                    type: "string",
                    required: true,
                    hidden: true
                }
            ]
        }
    ],
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
                        { name: "title", type: "string", required: true },
                        { name: "slug", type: "slug", required: true }
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
    siteMap: ({ documents }) => {
        // Create sitemap entries
        const siteMapEntries: SiteMapEntry[] = [];
        
        // Add home page
        const landingPage = documents.find(doc => doc.modelName === 'LandingPage');
        if (landingPage) {
            siteMapEntries.push({
                stableId: 'home',
                label: 'Home',
                urlPath: '/',
                document: landingPage,
                isHomePage: true,
            });
        }
        
        // Add other pages
        documents
            .filter((doc) => doc.modelName === 'Page')
            .forEach((document) => {
                const slugField = document.fields?.slug;
                const titleField = document.fields?.title;
                const pageIdField = document.fields?.pageId;
                
                // Extract string values from DocumentField
                const slug = typeof slugField === 'object' && slugField !== null && 'value' in slugField 
                    ? String(slugField.value) 
                    : typeof slugField === 'string' 
                    ? slugField 
                    : null;
                    
                const title = typeof titleField === 'object' && titleField !== null && 'value' in titleField
                    ? String(titleField.value)
                    : typeof titleField === 'string'
                    ? titleField
                    : 'Untitled Page';
                    
                const pageId = typeof pageIdField === 'object' && pageIdField !== null && 'value' in pageIdField
                    ? String(pageIdField.value)
                    : typeof pageIdField === 'string'
                    ? pageIdField
                    : document.id;
                
                if (slug) {
                    siteMapEntries.push({
                        stableId: String(pageId),
                        label: title,
                        urlPath: `/${slug}`,
                        document,
                        isHomePage: false,
                    });
                }
            });
            
        return siteMapEntries;
    }
});