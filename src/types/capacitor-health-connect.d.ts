// Minimal ambient types for @devmaxime/capacitor-health-connect (ships no .d.ts).
// Covers only the surface src/lib/health.ts uses.
declare module '@devmaxime/capacitor-health-connect' {
  interface AggregateRecord {
    value: number
    startTime: string
    endTime: string
  }

  export const HealthConnect: {
    checkAvailability(): Promise<{ availability: string }>
    requestPermissions(opts: { read: string[]; write: string[] }): Promise<{ read: string[] }>
    aggregateRecords(opts: {
      start: string
      end: string
      type: string
      groupBy?: string
    }): Promise<{ aggregates: AggregateRecord[] }>
  }
}
