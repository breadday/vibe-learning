import { LearningWorkspace } from "@/components/LearningWorkspace";
import { firstVideo } from "@/lib/content/first-video";

export default function Home() {
  return <LearningWorkspace content={firstVideo} />;
}
