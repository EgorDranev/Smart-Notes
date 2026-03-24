# Smart Notes

Smart Notes is a Railway-ready Next.js app for saving bookmarks with notes, tags, automatic title extraction, and search that works with or without OpenAI embeddings.

## Features

- Add bookmarks with URL, note, and tags
- Automatically extract the page title on save
- Generate embeddings on the server when OpenAI is configured
- Fall back to text search when no OpenAI key is available
- Filter by tags with autocomplete suggestions
- Browse all saved bookmarks with dates and one-click links

## Environment Variables

- `DATABASE_URL` required
- `OPENAI_API_KEY` optional
- `OPENAI_EMBEDDING_MODEL` optional, defaults to `text-embedding-3-small`

## Railway Deployment

Add PostgreSQL in Railway first so the app gets a valid `DATABASE_URL`. If `OPENAI_API_KEY` is not set, the app still works and search falls back to text matching.
