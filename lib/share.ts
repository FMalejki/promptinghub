// Pure social-share intent URL builder. No window/DOM so it's unit-testable.

export type ShareLinks = { x: string; linkedin: string; reddit: string };

export function buildShareLinks(url: string, title: string): ShareLinks {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
  };
}
