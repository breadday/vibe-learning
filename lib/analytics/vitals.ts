export type WebVitalMetric = {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating?: string;
  navigationType?: string;
};

/** Keep local measurements visible without sending user data to a custom endpoint. */
export function reportWebVitals(metric: WebVitalMetric) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[Web Vitals] ${metric.name}: ${metric.value}`, metric);
  }
}
