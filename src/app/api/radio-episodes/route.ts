import {
  TSUYUKUSA_RADIO_SHOW_ID,
  type RadioEpisode,
} from "@/src/lib/radioFavorites";

export const revalidate = 3600;

const RSS_URL = "https://anchor.fm/s/db812d84/podcast/rss";

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const cdata = block.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
  if (cdata) return decodeXml(cdata[1]);
  const plain = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return plain ? decodeXml(plain[1]) : "";
}

function episodeEmbedFromLink(link: string): string | null {
  try {
    const parsed = new URL(link);
    const slugMatch = parsed.pathname.match(/\/episodes\/([^/]+)/);
    if (!slugMatch) return null;
    return `https://open.spotify.com/embed/show/${TSUYUKUSA_RADIO_SHOW_ID}/episode/${slugMatch[1]}?utm_source=generator`;
  } catch {
    return null;
  }
}

function parseEpisodes(xml: string): RadioEpisode[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 50).map(block => {
    const id = extractTag(block, "guid") || extractTag(block, "link");
    const title = extractTag(block, "title") || "エピソード";
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const duration = extractTag(block, "itunes:duration");
    const enclosureMatch = block.match(/<enclosure[^>]+url="([^"]+)"/);
    const audioUrl = enclosureMatch?.[1] ?? null;
    const embedUrl = link ? episodeEmbedFromLink(link) : null;
    return {
      id,
      title,
      pubDate,
      duration,
      openUrl: link,
      embedUrl,
      audioUrl,
    };
  });
}

export async function GET() {
  try {
    const res = await fetch(RSS_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!res.ok) {
      return Response.json({ episodes: [] }, { status: 502 });
    }
    const xml = await res.text();
    const episodes = parseEpisodes(xml);
    return Response.json({ episodes });
  } catch {
    return Response.json({ episodes: [] }, { status: 500 });
  }
}
