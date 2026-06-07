import { z } from "zod";

const fileSchema = z.object({
  path: z.string().min(1).max(200),
  content: z.string().max(50000),
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
    files: z.array(fileSchema).max(50).optional(),
    image: z.string().url().or(z.literal("")).optional(),
    isPrivate: z.boolean().optional(),
    testedModels: z.array(testedModelSchema).max(50).optional(),
  })
  .refine((d) => Boolean(d.body && d.body.trim().length) || Boolean(d.files && d.files.length), {
    message: "Provide a prompt body or at least one file",
    path: ["files"],
  });

export type NewPromptInput = z.infer<typeof newPromptSchema>;
