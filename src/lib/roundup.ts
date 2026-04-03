/** Spare change to reach the next whole dollar (0 if already whole). */
export function roundUpSpareCents(amount: number): number {
  const spare = Math.ceil(amount) - amount
  return spare > 1e-6 ? spare : 0
}
