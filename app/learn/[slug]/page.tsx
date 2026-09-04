import type { ComponentType } from "react";
import { notFound } from "next/navigation";
import { LearningWorkspace } from "@/components/LearningWorkspace";
import FirstVideoContent from "@/content/reviewed/first-video.mdx";
import {
  listReviewedContent,
  loadReviewedContent,
} from "@/lib/content/loadReviewedContent";

export const dynamic = "force-static";

const reviewedMdx: Record<string, ComponentType> = {
  "first-video": FirstVideoContent,
};

export async function generateStaticParams() {
  const contents = await listReviewedContent();
  return contents.map((content) => ({ slug: content.slug }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const content = await loadReviewedContent(slug);
  if (!content) {
    return { title: "Not Found" };
  }
  return {
    title: `${content.video.title} | Vibe Learning`,
    description: content.video.title,
    openGraph: {
      title: content.video.title,
      description: content.video.title,
    },
  };
}

export default async function LearnPage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const content = await loadReviewedContent(slug);
  if (!content) {
    notFound();
  }
  const MdxContent = reviewedMdx[slug];
  return (
    <LearningWorkspace
      content={content}
      mdxContent={MdxContent ? <MdxContent /> : undefined}
    />
  );
}
