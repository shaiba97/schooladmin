"use client";

import * as React from "react";
import { BookOpen, ChevronRight, Phone } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentViewer } from "@/components/students/document-viewer";
import { TeacherAvatar } from "@/components/teachers/teacher-avatar";
import type { ApiDepartment, ApiTeacher, ApiTeacherCredential } from "@/lib/api/types";
import {
  deptName,
  fullName,
  profileImageDocument,
} from "@/lib/api/teachers";
import { formatAcademicDate } from "@/lib/format";

/**
 * Read-only mirror of the Academic Affairs teacher profile: header card,
 * Personal/Academic information, Identification grid and Teaching
 * Assignments — no edit/status controls anywhere.
 */

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}:</span> {children}
    </p>
  );
}

function statusBadge(teacher: ApiTeacher) {
  return <Badge variant={teacher.status === "ACTIVE" ? "success" : "muted"}>{teacher.status}</Badge>;
}

function sourceOf(credential: ApiTeacherCredential) {
  return credential.source === "TEACHER" ? "Teacher" : "Academic affairs";
}

function sourceLabel(source: string) {
  return source === "TEACHER" ? "Uploaded by the teacher" : "Uploaded by academic affairs";
}

function CredentialCard({ credential }: { credential: ApiTeacherCredential }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug">{credential.title}</CardTitle>
          <Badge variant={credential.source === "TEACHER" ? "info" : "muted"} className="shrink-0">
            {sourceOf(credential)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{sourceLabel(credential.source)}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <DocumentViewer document={credential} className="flex-1" />
      </CardContent>
    </Card>
  );
}

export function TeacherProfileClient({
  teacher,
  departments = [],
  departmentsError = "",
}: {
  teacher: ApiTeacher;
  departments?: ApiDepartment[];
  departmentsError?: string;
}) {
  const fullNameText = fullName(teacher);
  const profileImage = profileImageDocument(teacher);
  const credentials = teacher.credentials ?? [];
  const classSubjects = teacher.classSubjects ?? [];
  const classTeacherFor = teacher.classTeacherFor ?? [];

  return (
    <div className="space-y-4">
      {departmentsError ? (
        <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">Departments could not be loaded — department names may show as Unassigned. {departmentsError}</p>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <nav className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/academic/teachers" className="hover:text-foreground">Teachers</Link>
            <ChevronRight size={14} aria-hidden />
            <span className="text-foreground font-medium truncate">{fullNameText}</span>
          </nav>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <TeacherAvatar teacher={teacher} photoObjectKey={profileImage?.objectKey} size="lg" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold tracking-tight truncate">{fullNameText}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2 items-center">
                <Badge variant="outline">{deptName(teacher, departments)}</Badge>
                {teacher.user?.phone ? <span className="inline-flex items-center gap-1"><Phone size={12} aria-hidden />{teacher.user.phone}</span> : null}
                {statusBadge(teacher)}
                {teacher.gender ? <Badge variant="secondary">{teacher.gender}</Badge> : null}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Employee {teacher.employeeNumber || "—"} · {teacher.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Info label="Full Name">{fullNameText}</Info>
            <Info label="Gender">{teacher.gender || "—"}</Info>
            <Info label="Date of Birth">{formatAcademicDate(teacher.dateOfBirth)}</Info>
            <Info label="Phone"><span className="font-mono text-xs">{teacher.user?.phone || "—"}</span></Info>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Academic Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Info label="Department">{deptName(teacher, departments)}</Info>
            <Info label="Employee No"><span className="font-mono text-xs">{teacher.employeeNumber || "—"}</span></Info>
            <Info label="Status">{statusBadge(teacher)}</Info>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Identification</CardTitle>
            <CardDescription>
              Every document on this teacher record, whether filed by academic affairs or by the teacher.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {credentials.length === 0 ? (
              <div role="status" className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No documents yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Documents uploaded to this teacher record appear here once filed.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {credentials.map((credential) => (
                  <CredentialCard key={credential.id} credential={credential} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Teaching Assignments</CardTitle></CardHeader>
        <CardContent>
          {classSubjects.length === 0 && classTeacherFor.length === 0 ? (
            <EmptyState
              title="No teaching assignments"
              description="No subjects or class-teacher roles assigned yet."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{classSubjects.length} subject{classSubjects.length === 1 ? "" : "s"}</Badge>
                <Badge variant="outline">{classTeacherFor.length} class-teacher role{classTeacherFor.length === 1 ? "" : "s"}</Badge>
              </div>
              {classSubjects.length > 0 ? (
                <div className="space-y-2">
                  {classSubjects.map((assignment) => (
                    <div key={assignment.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-lg border bg-muted shrink-0">
                        <BookOpen size={16} aria-hidden className="text-muted-foreground" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{assignment.subject?.name ?? "Subject"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {assignment.schoolClass?.className ?? "Class"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {classTeacherFor.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {classTeacherFor.map((schoolClass) => (
                    <Badge key={schoolClass.id} variant="secondary">Class teacher · {schoolClass.className}</Badge>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
