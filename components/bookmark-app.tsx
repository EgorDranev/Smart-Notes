"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import type { BookmarkItem, BookmarkResponse } from "@/lib/types";

const initialForm = {
  url: "",
  note: "",
  tags: ""
};

export function BookmarkApp() {
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  async function loadBookmarks(nextQuery = query, nextTag = selectedTag) {
    const params = new URLSearchParams();

    if (nextQuery.trim()) {
      params.set("query", nextQuery.trim());
    }

    if (nextTag.trim()) {
      params.set("tag", nextTag.trim());
    }

    const response = await fetch(`/api/bookmarks?${params.toString()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Failed to load bookmarks");
    }

    const data = (await response.json()) as BookmarkResponse;
    setItems(data.items);
    setTags(data.tags);
  }

  useEffect(() => {
    startTransition(() => {
      loadBookmarks().catch((error: Error) => {
        setFeedback({ tone: "error", text: error.message });
      });
    });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const response = await fetch("/api/bookmarks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setFeedback({ tone: "error", text: data.error ?? "Failed to save bookmark" });
      return;
    }

    setForm(initialForm);
    setFeedback({ tone: "success", text: "Bookmark saved and embedded successfully." });

    startTransition(() => {
      loadBookmarks().catch((error: Error) => {
        setFeedback({ tone: "error", text: error.message });
      });
    });
  }

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(() => {
      loadBookmarks(query, selectedTag).catch((error: Error) => {
        setFeedback({ tone: "error", text: error.message });
      });
    });
  }

  function onResetFilters() {
    setQuery("");
    setSelectedTag("");

    startTransition(() => {
      loadBookmarks("", "").catch((error: Error) => {
        setFeedback({ tone: "error", text: error.message });
      });
    });
  }

  return (
    <section className="content-grid">
      <aside className="panel">
        <div className="panel-inner">
          <h2>Add bookmark</h2>
          <p className="panel-copy">
            Paste a URL, add context, and separate tags with commas. The server fetches the page
            title and creates an embedding for semantic search.
          </p>
          <form className="stack" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="url">URL</label>
              <input
                id="url"
                name="url"
                placeholder="https://example.com/article"
                required
                type="url"
                value={form.url}
                onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="note">Note</label>
              <textarea
                id="note"
                name="note"
                placeholder="Why this page matters"
                required
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="tags">Tags</label>
              <input
                id="tags"
                list="tag-options"
                name="tags"
                placeholder="ai, research, reading-list"
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              />
              <datalist id="tag-options">
                {tags.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </div>

            <div className="actions">
              <button className="button button-primary" disabled={isPending} type="submit">
                {isPending ? "Saving..." : "Save bookmark"}
              </button>
            </div>
          </form>
          {feedback ? (
            <p className="feedback" data-tone={feedback.tone}>
              {feedback.text}
            </p>
          ) : (
            <p className="hint">OpenAI key stays on the server in environment variables.</p>
          )}
        </div>
      </aside>

      <section className="panel">
        <div className="panel-inner">
          <h2>Search and browse</h2>
          <p className="panel-copy">
            Search in natural language, filter by tag, and see semantic similarity on each result.
          </p>

          <form className="toolbar" onSubmit={onSearchSubmit}>
            <div className="field">
              <label htmlFor="query">Natural language search</label>
              <input
                id="query"
                name="query"
                placeholder='Find articles about machine learning and notes'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="toolbar-row">
              <div className="field">
                <label htmlFor="tag-filter">Tag filter</label>
                <select
                  id="tag-filter"
                  name="tag-filter"
                  value={selectedTag}
                  onChange={(event) => setSelectedTag(event.target.value)}
                >
                  <option value="">All tags</option>
                  {tags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              <div className="actions" style={{ alignItems: "end" }}>
                <button className="button button-primary" disabled={isPending} type="submit">
                  {isPending ? "Searching..." : "Search"}
                </button>
                <button className="button button-secondary" type="button" onClick={onResetFilters}>
                  Reset
                </button>
              </div>
            </div>
          </form>

          <div className="cards">
            {items.length === 0 ? (
              <div className="empty">No bookmarks yet. Add your first one to get started.</div>
            ) : (
              items.map((item) => (
                <article className="card" key={item.id}>
                  <div className="card-top">
                    <div>
                      <h3>{item.title}</h3>
                      <div className="meta">
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                        <a href={item.url} rel="noreferrer" target="_blank">
                          Open link
                        </a>
                      </div>
                    </div>
                    {item.similarity !== null ? (
                      <div className="result-score">{Math.round(item.similarity * 100)}% match</div>
                    ) : null}
                  </div>
                  <p>{item.note}</p>
                  <div className="tags">
                    {item.tags.map((tag) => (
                      <span className="tag" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
