import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Function to handle empty or all-zero chart data that causes recharts to crash
export function ensureValidRadarData(data: any[] | undefined | null, fallback: any[]) {
  if (!data || !Array.isArray(data) || data.length === 0) return fallback;
  const hasValue = data.some(d => (d?.value || 0) > 0);
  if (!hasValue) {
    return data.map(d => ({ ...d, value: 5 }));
  }
  return data;
}
