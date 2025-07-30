import { defineStackbitConfig } from "@stackbit/types";
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
                    name: "LandingPage",
                    type: "data",
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
    ]
});