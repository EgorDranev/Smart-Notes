export type BookmarkItem = {
  id: string;
  url: string;
  title: string;
  note: string;
  tags: string[];
  createdAt: string;
  similarity: number | null;
};

export type BookmarkResponse = {
  items: BookmarkItem[];
  tags: string[];
  semanticSearchEnabled: boolean;
};
