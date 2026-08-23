import type { VideoContent } from "@/lib/content/schema";

export function PracticeSteps({ steps }: { steps: VideoContent["practiceSteps"] }) {
  if (steps.length === 0) return <EmptyState text="TODO: 영상 검수 후 직접 해볼 단계를 작성합니다." />;
  return (
    <ol className="practice-list">
      {steps.map((step, index) => (
        <li key={step.title}>
          <span>{index + 1}</span>
          <div><strong>{step.title}</strong><p>{step.instruction}</p></div>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
