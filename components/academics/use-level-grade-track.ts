"use client";

import * as React from "react";

/**
 * Shared Education Level -> Grade -> Track cascade.
 *
 * Mirrors the rules first established in the academic portal's class form so
 * every admin form (exam setup, class filters) agrees on which combinations
 * are legal. Keep this file in sync with
 * academic/components/academics/use-level-grade-track.ts.
 */

export const EDUCATION_LEVELS = ["SECONDARY", "INTERMEDIATE"] as const;
export const SECONDARY_GRADES = ["FIRST", "SECOND", "THIRD"] as const;
export const INTERMEDIATE_GRADES = ["SIXTH", "SEVENTH", "EIGHTH", "NINTH"] as const;
export const TRACKS = ["ART", "SCIENCE"] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
export type Track = (typeof TRACKS)[number];
export type Grade = (typeof SECONDARY_GRADES)[number] | (typeof INTERMEDIATE_GRADES)[number];

export const GRADE_LABELS: Record<Grade, string> = {
  FIRST: "1st Secondary",
  SECOND: "2nd Secondary",
  THIRD: "3rd Secondary",
  SIXTH: "6th",
  SEVENTH: "7th",
  EIGHTH: "8th",
  NINTH: "9th",
};

export function gradesForLevel(level: EducationLevel): readonly string[] {
  return level === "SECONDARY" ? SECONDARY_GRADES : INTERMEDIATE_GRADES;
}

export function needsTrackFor(level: EducationLevel, grade: string): boolean {
  return level === "SECONDARY" && (grade === "SECOND" || grade === "THIRD");
}

export function validateLevelGradeTrack(
  level: EducationLevel,
  grade: string,
  track: string | null,
): string | null {
  if (level === "SECONDARY") {
    if (!(SECONDARY_GRADES as readonly string[]).includes(grade)) {
      return "Grade must be FIRST, SECOND, or THIRD for SECONDARY.";
    }
    if (needsTrackFor(level, grade) && !track) {
      return "Track is required for Second/Third Secondary.";
    }
    if (!needsTrackFor(level, grade) && track) {
      return "Track must be absent unless grade is Second or Third Secondary.";
    }
  } else {
    if (!(INTERMEDIATE_GRADES as readonly string[]).includes(grade)) {
      return "Grade must be SIXTH, SEVENTH, EIGHTH, or NINTH for INTERMEDIATE.";
    }
    if (track) {
      return "Track must be absent for INTERMEDIATE.";
    }
  }
  return null;
}

export function useLevelGradeTrack(initial?: {
  educationLevel?: EducationLevel;
  grade?: string;
  track?: string | null;
}) {
  const [educationLevel, setEducationLevelState] = React.useState<EducationLevel>(
    initial?.educationLevel ?? "SECONDARY",
  );
  const [grade, setGradeState] = React.useState<string>(initial?.grade ?? "FIRST");
  const [track, setTrackState] = React.useState<string | null>(initial?.track ?? null);

  const grades = gradesForLevel(educationLevel);
  const needsTrack = needsTrackFor(educationLevel, grade);

  React.useEffect(() => {
    if (!grades.includes(grade)) {
      setGradeState(grades[0]);
    }
    if (!needsTrackFor(educationLevel, grade) && track) {
      setTrackState(null);
    }
  }, [educationLevel, grade, grades, track]);

  function setEducationLevel(level: EducationLevel) {
    setEducationLevelState(level);
  }

  function setGrade(next: string) {
    setGradeState(next);
  }

  function setTrack(next: string | null) {
    setTrackState(next);
  }

  return {
    educationLevel,
    grade,
    track,
    grades,
    needsTrack,
    setEducationLevel,
    setGrade,
    setTrack,
    validate: () => validateLevelGradeTrack(educationLevel, grade, track),
  };
}
