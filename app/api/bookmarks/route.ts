import { NextRequest, NextResponse } from "next/server";
import {
  createBookmark,
  getAllTags,
  getSearchMode,
  listBookmarks,
  searchBookmarks
} from "@/lib/bookmark-service";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
    const tag = request.nextUrl.searchParams.get("tag")?.trim() ?? "";

    const items = query ? await searchBookmarks(query, tag) : await listBookmarks(tag);
    const tags = await getAllTags();
    const mode = getSearchMode();

    return NextResponse.json({ items, tags, ...mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { url?: string; note?: string; tags?: string };

    if (!body.url?.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!body.note?.trim()) {
      return NextResponse.json({ error: "Note is required" }, { status: 400 });
    }

    const bookmark = await createBookmark({
      url: body.url,
      note: body.note,
      tags: body.tags ?? ""
    });

    return NextResponse.json({ id: bookmark.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
