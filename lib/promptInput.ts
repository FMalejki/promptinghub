import { z } from "zod";

const fileSchema = z.object({
  path: z.string().min(1).max(200),
  // Matches the GitHub importer's per-file cap (128 KB); generous headroom so
  // imported source files aren't rejected at publish time.
  content: z.string().max(200000),
  language: z.string().max(40).optional(),
});

const testedModelSchema = z.object({
  modelId: z.string().min(1).max(80),
  version: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
});

export const newPromptSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(300),
    category: z.string().min(1).max(40),
    body: z.string().max(50000).optional(),
    files: z.array(fileSchema).max(500).optional(),
    image: z.string().url().or(z.literal("")).optional(),
    isPrivate: z.boolean().optional(),
    // Author flag: this prompt is a reusable "skill".
    isSkill: z.boolean().optional(),
    // "Best used with": web chat, coding agent, or both.
    useWith: z.enum(["chat", "agent", "both"]).optional(),
    testedModels: z.array(testedModelSchema).max(50).optional(),
    priceCents: z.number().int().min(0).max(1000000).optional(),
    tags: z.union([z.string().max(400), z.array(z.string().max(60)).max(50)]).optional(),
    forkedFrom: z.string().max(64).optional(),
    // Optional author-written README (markdown), shown above the files.
    readme: z.string().max(20000).optional(),
    // Optional multimodal attachments (by URL): images, video, audio, pdf, docs.
    attachments: z
      .array(z.object({ url: z.string().max(2000), name: z.string().max(200).optional() }))
      .max(20)
      .optional(),
    // Emails allowed to read a PRIVATE prompt (array, or a comma/newline string
    // from the share textarea). Normalized server-side in lib/prompts.
    sharedWith: z.union([z.string().max(4000), z.array(z.string().max(200)).max(200)]).optional(),
    // Emails granted EDIT access (collaborators). Owner-only — the server drops
    // this field for non-owner editors. Same accepted shapes as sharedWith.
    collaborators: z.union([z.string().max(4000), z.array(z.string().max(200)).max(200)]).optional(),
    // Optional "commit message" describing an edit (used on update, ignored on create).
    message: z.string().max(200).optional(),
  })
  .refine((d) => Boolean(d.body && d.body.trim().length) || Boolean(d.files && d.files.length), {
    message: "Provide a prompt body or at least one file",
    path: ["files"],
  });

export type NewPromptInput = z.infer<typeof newPromptSchema>;
