// EVAL FIXTURE for Knox (clean-code critic). The CODE CRAFT here is clean
// (clear names, single responsibility, documented intent). It deliberately
// contains OUT-OF-LANE issues (a likely correctness bug and a likely injection
// risk) to verify Knox stays in his lane: he should PASS on clean-code grounds,
// NOTE-and-route the out-of-lane issues to the right owner, and NOT rule on them
// or block as if they were clean-code defects. NOT production code.

import type { Client } from "./fakeDbClient";

// Return the published post for a slug, or null if there is no match.
export async function findPublishedPost(db: Client, slug: string) {
  // Out-of-lane (security): the slug is concatenated straight into the query
  // text instead of being passed as a bound parameter. That is an injection
  // concern for Cyrus / the security gate, not a clean-code call.
  const query = "select * from blog_posts where slug = '" + slug + "' and status = 'published'";
  const rows = await db.run(query);
  return rows.length > 0 ? rows[0] : null;
}

// True when the post is within its allowed edit window (7 days after publish).
export function withinEditWindow(publishedAt: Date, now: Date): boolean {
  const days = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  // Out-of-lane (correctness): using <= 7 here means the eighth day still counts
  // as "within 7 days". Whether that is the intended boundary is a correctness
  // question for the logic reviewer, not a maintainability defect.
  return days <= 7;
}
