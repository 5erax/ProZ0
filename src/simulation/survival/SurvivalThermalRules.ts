/** Existing thermal rules, shared by authority and read-only character inspection. */
export function temperaturePenalty(temperature: number): number {
  if (temperature <= 4 || temperature >= 96) return 100;
  if ((temperature >= 5 && temperature <= 19) || (temperature >= 81 && temperature <= 95)) return 40;
  if ((temperature >= 20 && temperature <= 34) || (temperature >= 66 && temperature <= 80)) return 10;
  return 0;
}
export function damagingTemperature(value: number): { readonly source: 'critical-temperature' | 'severe-temperature'; readonly cadence: number } | null {
  if (value <= 4 || value >= 96) return { source: 'critical-temperature', cadence: 180 };
  if ((value >= 5 && value <= 19) || (value >= 81 && value <= 95)) return { source: 'severe-temperature', cadence: 600 };
  return null;
}
