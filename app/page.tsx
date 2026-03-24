import { BookmarkApp } from "@/components/bookmark-app";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="stats">
          <span className="stat-pill">AI-powered semantic search</span>
          <span className="stat-pill">Automatic title extraction</span>
          <span className="stat-pill">Railway-ready deployment</span>
        </div>
        <h1>Smart Notes for ideas worth keeping.</h1>
        <p>
          Save URLs with notes and tags, generate embeddings on the server, search in natural
          language, and filter everything instantly by tag.
        </p>
      </section>
      <BookmarkApp />
    </main>
  );
}
