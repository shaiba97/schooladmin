"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  { href: "/academic/students", label: "Students", summary: "Roster, admissions, transfers — first deep build." },
  { href: "/academic/attendance", label: "Attendance", summary: "Daily, sessions, and attendance reports." },
  { href: "/academic/academics", label: "Academics", summary: "Teachers, subjects, classes, grading." },
  { href: "/academic/examinations", label: "Examination Center", summary: "Scheduling, halls, marks, report cards." },
  { href: "/academic/timetable", label: "Timetable", summary: "Class, teacher, and room timetables." },
  { href: "/academic/promotion", label: "Promotion", summary: "Promotion, repetition, graduation." },
  { href: "/academic/reports", label: "Academic Reports", summary: "Students, attendance, and performance reports." },
  { href: "/academic/documents", label: "Documents", summary: "Academic and certificate documents." },
];

export default function AcademicPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Academic Affairs</h1>
        <p className="text-sm text-muted-foreground">
          Admin-native academic workspace. Each section is being built deep, one at a time (Students first).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className="transition-opacity hover:opacity-90">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">{section.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{section.summary}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
