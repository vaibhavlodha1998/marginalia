import { z } from "zod";

export const conceptType = z.enum([
  "Concept",
  "Definition",
  "Example",
  "Formula",
  "Objective",
  "Figure",
]);

export const edgeType = z.enum([
  "prerequisite_of",
  "part_of",
  "illustrates",
  "defines",
  "assessed_by",
]);

export const extractedConcept = z.object({
  key: z.string().min(1),
  type: conceptType,
  label: z.string().min(1),
  body: z.string().default(""),
  page: z.number().int().positive().nullable().optional(),
});

export const extractedEdge = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: edgeType,
});

export const graphSchema = z.object({
  concepts: z.array(extractedConcept),
  edges: z.array(extractedEdge),
});

export type ConceptGraph = z.infer<typeof graphSchema>;
