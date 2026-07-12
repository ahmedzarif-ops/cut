# References

The creative-director skill + agent read these directly:
- Brand profile (source of truth): `company.yml` -> `brand.*`, plus any fuller brand profile under `kb_dir` (a client's profile swaps into the same slot)
- Verbal identity (pair with visual): your message-spine / verbal-identity doc under `kb_dir`
- ICP / customer truth: `company.yml` -> `icp.research_doc` (run ICP research first if it does not exist yet; never invent customer facts)
- Founder / proof: your founder-story or proof doc under `kb_dir`
- Products / prices: `company.yml` -> `offer.summary` / `offer.pricing_notes` (or your product catalog module if you keep one)
- Content/claims gate: the `content-compliance-reviewer` agent (run after visual production)
- The taste/critique brain: the `creative-director` agent
Tool routing: Figma skills (figma:*), Canva MCP, image/video generation (e.g. `higgsfield-generate`), web search.
