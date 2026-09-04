"use client";

import { useReportWebVitals } from "next/web-vitals";
import { reportWebVitals, type WebVitalMetric } from "@/lib/analytics/vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    reportWebVitals(metric as WebVitalMetric);
  });

  return null;
}
