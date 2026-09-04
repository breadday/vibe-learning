export const learningSyncChannelName = "vibe-learning:v1";
export const learningStoreUpdatedMessage = {
  type: "learning-store-updated",
} as const;

type LearningSyncMessage = typeof learningStoreUpdatedMessage;
type LearningSyncListener = () => void;

let publisher: BroadcastChannel | null = null;

function canUseBroadcastChannel() {
  return typeof window !== "undefined" && typeof BroadcastChannel !== "undefined";
}

function getPublisher() {
  if (!canUseBroadcastChannel()) {
    return null;
  }

  publisher ??= new BroadcastChannel(learningSyncChannelName);
  return publisher;
}

export function publishLearningStoreUpdated() {
  getPublisher()?.postMessage(learningStoreUpdatedMessage);
}

export function subscribeToLearningStoreUpdates(
  listener: LearningSyncListener,
): () => void {
  if (!canUseBroadcastChannel()) {
    return () => undefined;
  }

  const channel = new BroadcastChannel(learningSyncChannelName);
  const handleMessage = (event: MessageEvent<unknown>) => {
    const message = event.data as Partial<LearningSyncMessage> | null;
    if (message?.type === learningStoreUpdatedMessage.type) {
      listener();
    }
  };

  channel.addEventListener("message", handleMessage);
  return () => {
    channel.removeEventListener("message", handleMessage);
    channel.close();
  };
}
