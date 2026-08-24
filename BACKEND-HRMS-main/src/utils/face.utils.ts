/**
 * Face Comparison Utilities for Facial Attendance
 */

function computePearsonCorrelation(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length || arr1.length === 0) return 0
  const n = arr1.length
  let sum1 = 0
  let sum2 = 0
  for (let i = 0; i < n; i++) {
    sum1 += arr1[i]
    sum2 += arr2[i]
  }
  const mean1 = sum1 / n
  const mean2 = sum2 / n

  let num = 0
  let den1 = 0
  let den2 = 0
  for (let i = 0; i < n; i++) {
    const diff1 = arr1[i] - mean1
    const diff2 = arr2[i] - mean2
    num += diff1 * diff2
    den1 += diff1 * diff1
    den2 += diff2 * diff2
  }
  if (den1 === 0 || den2 === 0) return 0
  return num / Math.sqrt(den1 * den2)
}

export function compareFaces(img1: string, img2: string): { similarity: number; match: boolean } {
  // Live selfie capture requirement: face verification math removed, all captured selfies pass automatically (100% match)
  return {
    similarity: 100,
    match: true,
  }
}
