import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fetchPageTitle } from "@/lib/metadata";
import { getEmbeddingModel, getOpenAIClient, isOpenAIConfigured } from "@/lib/openai";
import type { BookmarkItem } from "@/lib/types";

type CreateBookmarkInput = {
  url: string;
  note: string;
  tags: string;
};

type BookmarkWithEmbedding = {
  id: string;
  url: string;
  title: string;
  note: string;
  tags: string[];
  createdAt: Date;
  embedding: Prisma.JsonValue | null;
};

function normalizeTags(tags: string) {
  return [...new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean))].sort();
}

function buildEmbeddingInput(input: { title: string; note: string; tags: string[]; url: string }) {
  return [
    `Title: ${input.title}`,
    `Note: ${input.note}`,
    `Tags: ${input.tags.join(", ") || "none"}`,
    `URL: ${input.url}`
  ].join("\n");
}

async function createEmbedding(text: string) {
  if (!isOpenAIConfigured()) {
    return null;
  }

  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: getEmbeddingModel(),
    input: text
  });

  return response.data[0]?.embedding ?? [];
}

function extractVector(value: Prisma.JsonValue | null): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function mapBookmark(item: BookmarkWithEmbedding, similarity: number | null = null): BookmarkItem {
  return {
    id: item.id,
    url: item.url,
    title: item.title,
    note: item.note,
    tags: item.tags,
    createdAt: item.createdAt.toISOString(),
    similarity
  };
}

export async function createBookmark(input: CreateBookmarkInput) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(input.url);
  } catch {
    throw new Error("Please provide a valid URL.");
  }

  const title = await fetchPageTitle(parsedUrl.toString());
  const tags = normalizeTags(input.tags);
  const embeddingInput = buildEmbeddingInput({
    title,
    note: input.note.trim(),
    tags,
    url: parsedUrl.toString()
  });
  const embedding = await createEmbedding(embeddingInput);

  return db.bookmark.create({
    data: {
      url: parsedUrl.toString(),
      title,
      note: input.note.trim(),
      tags,
      ...(embedding ? { embedding } : {})
    }
  });
}

export async function listBookmarks(tag?: string) {
  const items = await db.bookmark.findMany({
    where: tag ? { tags: { has: tag } } : undefined,
    orderBy: { createdAt: "desc" }
  });

  return items.map((item) => mapBookmark(item));
}

function textScore(item: { title: string; note: string; tags: string[]; url: string }, query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return 0;
  }

  const haystack = [item.title, item.note, item.tags.join(" "), item.url].join(" ").toLowerCase();
  const matchedTerms = terms.filter((term) => haystack.includes(term)).length;

  return matchedTerms / terms.length;
}

export async function searchBookmarks(query: string, tag?: string) {
  const items = await db.bookmark.findMany({
    where: tag ? { tags: { has: tag } } : undefined,
    orderBy: { createdAt: "desc" }
  });

  if (!isOpenAIConfigured()) {
    return items
      .map((item) => {
        const score = textScore(item, query);
        return {
          ...mapBookmark(item, score),
          score
        };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .map(({ score: _score, ...item }) => item);
  }

  const queryEmbedding = await createEmbedding(query);

  return items
    .map((item) => {
      const score = cosineSimilarity(queryEmbedding ?? [], extractVector(item.embedding));
      return {
        ...mapBookmark(item, score),
        score
      };
    })
    .sort((left, right) => right.score - left.score)
    .map(({ score: _score, ...item }) => item);
}

export async function getAllTags() {
  const result = await db.bookmark.findMany({
    select: {
      tags: true
    }
  });

  return [...new Set(result.flatMap((item) => item.tags))].sort((left, right) =>
    left.localeCompare(right)
  );
}

export function getSearchMode() {
  return {
    semanticSearchEnabled: isOpenAIConfigured()
  };
}
