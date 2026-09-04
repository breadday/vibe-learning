import { afterEach, describe, expect, it, vi } from "vitest";
import {
  learningStoreUpdatedMessage,
  publishLearningStoreUpdated,
  subscribeToLearningStoreUpdates,
} from "./sync";

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  readonly name: string;
  private listeners = new Set<(event: MessageEvent<unknown>) => void>();
  postMessage = vi.fn();
  close = vi.fn();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  addEventListener(
    _type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ) {
    this.listeners.add(listener);
  }

  removeEventListener(
    _type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ) {
    this.listeners.delete(listener);
  }

  emit(data: unknown) {
    this.listeners.forEach((listener) => listener({ data } as MessageEvent<unknown>));
  }
}

afterEach(() => {
  MockBroadcastChannel.instances = [];
  vi.unstubAllGlobals();
});

describe("learning sync", () => {
  it("publishes and receives learning store update messages", () => {
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    const listener = vi.fn();
    const unsubscribe = subscribeToLearningStoreUpdates(listener);

    publishLearningStoreUpdated();

    expect(MockBroadcastChannel.instances).toHaveLength(2);
    expect(MockBroadcastChannel.instances[0]?.name).toBe("vibe-learning:v1");
    expect(MockBroadcastChannel.instances[1]?.postMessage).toHaveBeenCalledWith(
      learningStoreUpdatedMessage,
    );

    MockBroadcastChannel.instances[0]?.emit(learningStoreUpdatedMessage);
    MockBroadcastChannel.instances[0]?.emit({ type: "other-message" });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(MockBroadcastChannel.instances[0]?.close).toHaveBeenCalledTimes(1);
  });

  it("returns a no-op subscription during server rendering", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    const listener = vi.fn();

    const unsubscribe = subscribeToLearningStoreUpdates(listener);
    publishLearningStoreUpdated();
    unsubscribe();

    expect(MockBroadcastChannel.instances).toHaveLength(0);
    expect(listener).not.toHaveBeenCalled();
  });
});
