// EVAL FIXTURE for Knox (clean-code critic). Intentionally messy code used to
// verify Knox catches clean-code / maintainability smells. NOT production code,
// NOT imported anywhere, NOT compiled by the build (lives outside src/ + tests/).

import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto"; // unused import

type Row = { slug: string; title: string; body: string; tags: string[] };

// process a blog row: fetch, clean, validate, format, count words, and save
export function p(a: Row, b: boolean) {
  let x = a.body;
  let tmp = "";
  // strip html
  x = x.replace(/<[^>]+>/g, " ");
  x = x.replace(/\s+/g, " ").trim();

  // count words
  let n = 0;
  for (let i = 0; i < x.split(" ").length; i++) {
    n = n + 1; // increment n by 1
  }

  // validate
  if (a.title.length > 0) {
    if (a.slug.length > 0) {
      if (a.tags) {
        tmp = "ok";
      }
    }
  }

  // build the output object
  let out: any = {};
  out.slug = a.slug;
  out.title = a.title;
  out.words = n;
  out.reading = Math.ceil(n / 200) + " min read";

  // build the output object (again, for the amp version)
  let out2: any = {};
  out2.slug = a.slug;
  out2.title = a.title;
  out2.words = n;
  out2.reading = Math.ceil(n / 200) + " min read";

  if (n > 86400) {
    out.flag = true;
  }

  try {
    if (b) {
      writeFileSync("/tmp/" + a.slug + ".json", JSON.stringify(out));
    }
  } catch (e) {}

  console.log("p done", a.slug, out);

  // old single-pass version, keeping just in case
  // let words = a.body.split(/\s+/).length;
  // return { slug: a.slug, words, reading: Math.ceil(words/200) + " min read" };

  return b ? out : out2;
}

// a factory that makes one formatter
class FormatterFactory {
  static getFormatter() {
    return {
      format: (s: string) => s.trim(),
    };
  }
}

export function readRow(path: string): Row {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw);
}
