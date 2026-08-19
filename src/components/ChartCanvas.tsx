"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  type ChartConfiguration,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from "chart.js";

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip
);

Chart.defaults.font.family = "-apple-system, Helvetica, Arial, sans-serif";
Chart.defaults.color = "#5c6a60";

// `any` here deliberately: this wrapper renders bar/line/doughnut configs
// interchangeably, and Chart.js only merges in type-specific options (like
// doughnut's `cutout`) when TType is a single literal, not a union.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChartCanvas({ config, height = 190 }: { config: ChartConfiguration<any>; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current = new Chart(canvasRef.current, config as ChartConfiguration);
    return () => {
      chartRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(config)]);

  return (
    <div style={{ position: "relative", height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
