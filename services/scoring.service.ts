/**
 * Pure service for calculating technician scores based on attendance, ratings, and job completions.
 * This file contains no database dependencies.
 */

export function calculateScore(input: {
  totalDays: number;
  presentDays: number;
  averageRating: number;
  ratingCount: number;
  completedJobs: number;
}): number {
  // Attendance score (0–40 points): (presentDays / totalDays) * 40
  const attendanceScore = input.totalDays > 0 ? (input.presentDays / input.totalDays) * 40 : 0;

  // Rating score (0–40 points): (averageRating / 5) * 40
  const ratingScore = input.averageRating > 0 ? (input.averageRating / 5) * 40 : 0;

  // Job completion score (0–20 points): min(completedJobs / 10, 1) * 20 (caps at 10 jobs = full score)
  const jobScore = Math.min(input.completedJobs / 10, 1) * 20;

  // Total: sum of all three, rounded to 2 decimal places
  const total = attendanceScore + ratingScore + jobScore;
  return Math.round(total * 100) / 100;
}
