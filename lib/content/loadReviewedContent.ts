import fs from "node:fs/promises";
import path from "node:path";
import { videoContentSchema, type VideoContent } from "./schema";

export type ReviewedContent = VideoContent & { mdxContent: string };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function loadReviewedContent(slug: string): Promise<ReviewedContent | null> {
  if (!slugPattern.test(slug)) {
    return null;
  }

  const contentDir = path.join(process.cwd(), "content");
  let rawJson: string;
  try {
    rawJson = await fs.readFile(path.join(contentDir, `${slug}.json`), "utf8");
  } catch {
    return null;
  }

  const content = videoContentSchema.parse(JSON.parse(rawJson));
  if (content.verificationStatus !== "reviewed") {
    return null;
  }

  let mdxContent = "";
  try {
    mdxContent = await fs.readFile(
      path.join(contentDir, "reviewed", `${slug}.mdx`),
      "utf8",
    );
  } catch {
    mdxContent = "";
  }

  return { ...content, mdxContent };
}

export async function listReviewedContent(): Promise<ReviewedContent[]> {
  const contentDir = path.join(process.cwd(), "content");
  const entries = await fs.readdir(contentDir);
  const slugs = entries
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.slice(0, -".json".length))
    .sort();
  const contents = await Promise.all(
    slugs.map((slug) => loadReviewedContent(slug)),
  );
  return contents.filter((content) => content !== null);
}
