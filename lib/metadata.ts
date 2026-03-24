const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/i;

export async function fetchPageTitle(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Smart Notes Bot/1.0"
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      return new URL(url).hostname;
    }

    const html = await response.text();
    const titleMatch = html.match(TITLE_REGEX);
    return titleMatch?.[1]?.trim() || new URL(url).hostname;
  } catch {
    return new URL(url).hostname;
  }
}
