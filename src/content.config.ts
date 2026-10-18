import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const blog = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
	schema: z.object({
		title: z.string().min(10).max(100),
		description: z.string().min(50).max(180),
		published: z.coerce.date(),
		updated: z.coerce.date().optional(),
		category: z.enum(["Code review", "TypeScript", "Engineering practice"]),
		relatedRules: z.array(z.string()).min(1),
		draft: z.boolean().default(false),
	}).refine((post) => !post.updated || post.updated >= post.published, {
		message: "An update cannot precede publication",
	}),
});

export const collections = { blog };
