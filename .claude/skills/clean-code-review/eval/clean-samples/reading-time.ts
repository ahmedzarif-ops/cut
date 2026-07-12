// EVAL FIXTURE for Knox (clean-code critic). Intentionally clean, well-built code
// used to verify Knox returns PASS on genuinely maintainable work. NOT production
// code, NOT imported anywhere, NOT compiled by the build.

// Average adult reads ~200 words per minute; we round up so a short post never
// shows "0 min read". Source of the constant is documented so the next maintainer
// can tune it without guessing where 200 came from.
const WORDS_PER_MINUTE = 200;

// Count the words in a plain-text body. Collapses runs of whitespace so multiple
// spaces or newlines do not inflate the count.
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).length;
}

// Render a human-readable reading-time label, e.g. "4 min read".
export function readingTime(text: string): string {
  const minutes = Math.max(1, Math.ceil(countWords(text) / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}
