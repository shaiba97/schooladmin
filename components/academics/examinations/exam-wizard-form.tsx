"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Paperclip, Upload, UserRound, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EDUCATION_LEVELS,
  GRADE_LABELS,
  useLevelGradeTrack,
  type EducationLevel,
} from "@/components/academics/use-level-grade-track";
import { assignExamRoom, createExam } from "@/lib/api/exams";
import { listClassSubjects } from "@/lib/api/subjects";
import { deleteStagedFile, uploadExamSample } from "@/lib/api/storage";
import { academicErrorMessage } from "@/lib/format";
import type {
  ApiAcademicYear,
  ApiClassSubject,
  ApiExamType,
  ApiHall,
  ApiSchoolClass,
} from "@/lib/api/types";

type StagedSample = { objectKey: string; originalName: string; size: number };

type SubjectSelection = {
  cs: ApiClassSubject;
  maxMarks: string;
  passMarks: string;
};

function teacherName(cs: ApiClassSubject): string {
  const user = cs.teacher?.user;
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

function roomClassOf(hallName: string): string {
  return hallName.replace(/ Room \d+$/, "");
}

/**
 * Exam Wizard. One form creates the whole assessment: identity, target
 * classes, subject papers (with per-paper sample uploads) and the rooms that
 * seat candidates. Submission fans out one Exam row per selected class and
 * seats each room from that class's roster.
 */
export function ExamWizardForm({
  years,
  classes,
  examTypes,
  halls,
}: {
  years: ApiAcademicYear[];
  classes: ApiSchoolClass[];
  examTypes: ApiExamType[];
  halls: ApiHall[];
}) {
  const router = useRouter();
  const cascade = useLevelGradeTrack();

  const currentYear = React.useMemo(
    () => years.find((year) => year.isCurrent) ?? years[0] ?? null,
    [years],
  );

  const [name, setName] = React.useState("");
  const [examTypeId, setExamTypeId] = React.useState("none");
  const [examDate, setExamDate] = React.useState("");

  const [selectedClassIds, setSelectedClassIds] = React.useState<string[]>([]);
  const [subjectsByClass, setSubjectsByClass] = React.useState<Record<string, ApiClassSubject[]>>({});
  const [subjects, setSubjects] = React.useState<SubjectSelection[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = React.useState<string[]>([]);

  const [previewFiles, setPreviewFiles] = React.useState<Record<string, File | null>>({});
  const [previewStaged, setPreviewStaged] = React.useState<Record<string, StagedSample>>({});
  const [previewBusy, setPreviewBusy] = React.useState<Record<string, boolean>>({});
  const [previewError, setPreviewError] = React.useState<Record<string, string>>({});

  const [subjectsLoading, setSubjectsLoading] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const availableClasses = React.useMemo(
    () =>
      classes.filter(
        (schoolClass) =>
          schoolClass.educationLevel === cascade.educationLevel &&
          schoolClass.grade === cascade.grade &&
          (cascade.needsTrack ? schoolClass.track === cascade.track : true),
      ),
    [classes, cascade.educationLevel, cascade.grade, cascade.needsTrack, cascade.track],
  );

  const selectedClasses = React.useMemo(
    () => availableClasses.filter((schoolClass) => selectedClassIds.includes(schoolClass.id)),
    [availableClasses, selectedClassIds],
  );

  // Class is optional: leaving every class unchecked means "the whole grade".
  // Every class under the level/grade/track slice joins with its own marks book.
  const effectiveClasses = React.useMemo(
    () => (selectedClasses.length > 0 ? selectedClasses : availableClasses),
    [selectedClasses, availableClasses],
  );
  const gradeWide = selectedClasses.length === 0 && availableClasses.length > 0;

  // Drop selections that fell out of the level/grade/track slice.
  React.useEffect(() => {
    setSelectedClassIds((current) => {
      const allowed = new Set(availableClasses.map((schoolClass) => schoolClass.id));
      const next = current.filter((id) => allowed.has(id));
      return next.length === current.length ? current : next;
    });
  }, [availableClasses]);

  React.useEffect(() => {
    if (effectiveClasses.length === 0) {
      setSubjectsByClass({});
      setSubjects([]);
      return;
    }
    let cancelled = false;
    setSubjectsLoading(true);
    Promise.all(
      effectiveClasses.map((schoolClass) =>
        listClassSubjects(schoolClass.id).catch(() => [] as ApiClassSubject[]),
      ),
    )
      .then((lists) => {
        if (cancelled) return;
        const groups: Record<string, ApiClassSubject[]> = {};
        effectiveClasses.forEach((schoolClass, index) => {
          groups[schoolClass.id] = lists[index].filter((cs) => cs.subject);
        });
        setSubjectsByClass(groups);
        // Default every available paper to selected with a 100/50 split, while
        // preserving edits already made for papers that remain available.
        setSubjects((current) => {
          const byId = new Map(current.map((entry) => [entry.cs.id, entry]));
          const next: SubjectSelection[] = [];
          for (const list of Object.values(groups)) {
            for (const cs of list) {
              next.push(byId.get(cs.id) ?? { cs, maxMarks: "100", passMarks: "50" });
            }
          }
          return next;
        });
      })
      .catch((cause) => setFormError(academicErrorMessage(cause, "Unable to load class subjects.")))
      .finally(() => {
        if (!cancelled) setSubjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveClasses]);

  const roomsForSelection = React.useMemo(() => {
    if (effectiveClasses.length === 0) return [];
    const names = new Set(effectiveClasses.map((schoolClass) => schoolClass.className));
    return halls.filter((hall) => names.has(roomClassOf(hall.name)));
  }, [halls, effectiveClasses]);

  // Drop room selections that no longer serve a selected class.
  React.useEffect(() => {
    setSelectedRoomIds((current) => {
      const allowed = new Set(roomsForSelection.map((hall) => hall.id));
      const next = current.filter((id) => allowed.has(id));
      return next.length === current.length ? current : next;
    });
  }, [roomsForSelection]);

  function toggleClass(classId: string, checked: boolean) {
    setSelectedClassIds((current) =>
      checked ? [...new Set([...current, classId])] : current.filter((id) => id !== classId),
    );
  }

  function toggleSubject(cs: ApiClassSubject, checked: boolean) {
    setSubjects((current) => {
      if (checked) {
        if (current.some((entry) => entry.cs.id === cs.id)) return current;
        return [...current, { cs, maxMarks: "100", passMarks: "50" }];
      }
      clearSubjectPreview(cs.id);
      return current.filter((entry) => entry.cs.id !== cs.id);
    });
  }

  function toggleClassSubjects(classId: string, checked: boolean) {
    const list = subjectsByClass[classId] ?? [];
    if (!checked) {
      for (const cs of list) clearSubjectPreview(cs.id);
      setSubjects((current) => current.filter((entry) => entry.cs.classId !== classId));
      return;
    }
    setSubjects((current) => {
      const keep = current.filter((entry) => entry.cs.classId !== classId);
      const existing = new Map(
        current.filter((entry) => entry.cs.classId === classId).map((entry) => [entry.cs.id, entry]),
      );
      return [...keep, ...list.map((cs) => existing.get(cs.id) ?? { cs, maxMarks: "100", passMarks: "50" })];
    });
  }

  function updateSubject(csId: string, patch: Partial<Pick<SubjectSelection, "maxMarks" | "passMarks">>) {
    setSubjects((current) =>
      current.map((entry) => (entry.cs.id === csId ? { ...entry, ...patch } : entry)),
    );
  }

  function toggleRoom(roomId: string, checked: boolean) {
    setSelectedRoomIds((current) =>
      checked ? [...new Set([...current, roomId])] : current.filter((id) => id !== roomId),
    );
  }

  async function attachSubjectPreview(cs: ApiClassSubject, file: File) {
    setPreviewFiles((current) => ({ ...current, [cs.id]: file }));
    setPreviewError((current) => ({ ...current, [cs.id]: "" }));
    setPreviewBusy((current) => ({ ...current, [cs.id]: true }));
    try {
      const previous = previewStaged[cs.id];
      if (previous) void deleteStagedFile(previous.objectKey).catch(() => undefined);
      const staged = await uploadExamSample({ file, draftId: crypto.randomUUID() });
      setPreviewStaged((current) => ({ ...current, [cs.id]: staged }));
    } catch (cause) {
      setPreviewFiles((current) => ({ ...current, [cs.id]: null }));
      setPreviewError((current) => ({
        ...current,
        [cs.id]: academicErrorMessage(cause, "The sample paper could not be uploaded."),
      }));
    } finally {
      setPreviewBusy((current) => ({ ...current, [cs.id]: false }));
    }
  }

  function clearSubjectPreview(csId: string) {
    const staged = previewStaged[csId];
    if (staged) void deleteStagedFile(staged.objectKey).catch(() => undefined);
    setPreviewFiles((current) => ({ ...current, [csId]: null }));
    setPreviewStaged((current) => {
      const next = { ...current };
      delete next[csId];
      return next;
    });
    setPreviewError((current) => ({ ...current, [csId]: "" }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validation = cascade.validate();
    if (validation) {
      setFormError(validation);
      return;
    }
    if (!name.trim()) {
      setFormError("Give the exam a name.");
      return;
    }
    if (!currentYear) {
      setFormError("No academic year is available — create one first.");
      return;
    }
    if (availableClasses.length === 0) {
      setFormError("No classes are registered for this level and grade yet.");
      return;
    }
    if (subjects.length === 0) {
      setFormError("Select at least one subject paper.");
      return;
    }
    for (const entry of subjects) {
      const max = Number(entry.maxMarks);
      const pass = entry.passMarks.trim() === "" ? null : Number(entry.passMarks);
      const subjectName = entry.cs.subject?.name ?? "subject";
      if (!Number.isFinite(max) || max <= 0) {
        setFormError(`Max marks for ${subjectName} must be a positive number.`);
        return;
      }
      if (pass != null && (!Number.isFinite(pass) || pass < 0)) {
        setFormError(`Pass marks for ${subjectName} must be a number.`);
        return;
      }
      if (pass != null && pass > max) {
        setFormError(`Pass marks cannot exceed max marks for ${subjectName}.`);
        return;
      }
    }

    setPending(true);
    setFormError("");
    try {
      const created = await createExam({
        academicYearId: currentYear.id,
        name: name.trim(),
        ...(examTypeId !== "none" ? { examTypeId } : {}),
        ...(examDate ? { startsOn: examDate, endsOn: examDate } : {}),
        classIds: effectiveClasses.map((schoolClass) => schoolClass.id),
        subjects: subjects.map((entry) => ({
          classSubjectId: entry.cs.id,
          maxMarks: Number(entry.maxMarks),
          ...(entry.passMarks.trim() !== "" ? { passingMarks: Number(entry.passMarks) } : {}),
          ...(previewStaged[entry.cs.id] ? { sample: previewStaged[entry.cs.id] } : {}),
        })),
      });

      const rows = Array.isArray(created) ? created : [created];
      const classNameById = new Map(
        effectiveClasses.map((schoolClass) => [schoolClass.id, schoolClass.className]),
      );
      const examIdByClassName = new Map<string, string>();
      for (const row of rows) {
        const classId = (row.examSubjects ?? [])
          .map((subject) => subject.classSubject?.classId)
          .find((id): id is string => Boolean(id));
        const className = classId ? classNameById.get(classId) : undefined;
        if (className) examIdByClassName.set(className, row.id);
      }

      for (const hallId of selectedRoomIds) {
        const hall = halls.find((entry) => entry.id === hallId);
        if (!hall) continue;
        const target =
          examIdByClassName.get(roomClassOf(hall.name)) ?? rows[0]?.id;
        if (target) await assignExamRoom(target, { hallId }).catch(() => undefined);
      }

      router.push(rows[0] ? `/school/admin/exams/${rows[0].id}` : "/school/admin/exams");
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "The exam could not be created."));
      setPending(false);
    }
  }

  const anyPreviewBusy = Object.values(previewBusy).some(Boolean);
  const submitting = pending || anyPreviewBusy;
  const allPapersSelected =
    subjects.length > 0 &&
    Object.values(subjectsByClass).flat().every((cs) => subjects.some((entry) => entry.cs.id === cs.id));

  return (
    <form className="space-y-5 pb-10" onSubmit={(event) => void handleSubmit(event)}>
      <div>
        <Link
          href="/school/admin/exams"
          className="-ms-2 mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} aria-hidden /> Examination Center
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Examination Center · Exam Wizard
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Schedule a new exam</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the grade and classes, attach the subject papers, then pick the rooms that seat
          candidates. Everything is created in one pass.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Exam details</CardTitle>
          <CardDescription>Name the assessment and optionally classify and date it.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="exam-name">Exam name</Label>
            <Input
              id="exam-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="First Term Final Examination"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Exam type</Label>
            <Select value={examTypeId} onValueChange={setExamTypeId}>
              <SelectTrigger aria-label="Exam type">
                <SelectValue placeholder="No type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No type</SelectItem>
                {examTypes.map((examType) => (
                  <SelectItem key={examType.id} value={examType.id}>
                    {examType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-date">Examination date (optional)</Label>
            <Input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Target grade &amp; classes</CardTitle>
          <CardDescription>
            Narrow to a level, grade and track. Leave every class unchecked to schedule the exam for
            the whole grade, or tick specific classes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Educational level</Label>
              <Select
                value={cascade.educationLevel}
                onValueChange={(value) => cascade.setEducationLevel(value as EducationLevel)}
              >
                <SelectTrigger aria-label="Educational level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level === "SECONDARY" ? "Secondary" : "Intermediate"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Select value={cascade.grade} onValueChange={cascade.setGrade}>
                <SelectTrigger aria-label="Grade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cascade.grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {GRADE_LABELS[grade as keyof typeof GRADE_LABELS] ?? grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cascade.needsTrack ? (
              <div className="space-y-2">
                <Label>Track</Label>
                <Select value={cascade.track ?? ""} onValueChange={cascade.setTrack}>
                  <SelectTrigger aria-label="Track">
                    <SelectValue placeholder="Select track" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ART">Art</SelectItem>
                    <SelectItem value="SCIENCE">Science</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Classes (optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedClassIds(
                    selectedClassIds.length === availableClasses.length
                      ? []
                      : availableClasses.map((schoolClass) => schoolClass.id),
                  )
                }
                disabled={availableClasses.length === 0}
              >
                {selectedClassIds.length === availableClasses.length ? "Clear all" : "Select all"}
              </Button>
            </div>
            {availableClasses.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                No classes registered for this level, grade and track yet.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {availableClasses.map((schoolClass) => {
                  const checked = selectedClassIds.includes(schoolClass.id);
                  return (
                    <label
                      key={schoolClass.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm transition-colors ${
                        checked ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border"
                        checked={checked}
                        onChange={(event) => toggleClass(schoolClass.id, event.target.checked)}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {schoolClass.className}
                      </span>
                      <Badge variant="outline">
                        {schoolClass.counts?.students ?? 0} students
                      </Badge>
                    </label>
                  );
                })}
              </div>
            )}
            {gradeWide ? (
              <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                No class selected — this is a <span className="font-medium text-foreground">grade-wise exam</span>.
                It will be created for all {availableClasses.length} classes of this grade, each with its own
                marks book, so teachers submit results per class.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm">Subject papers</CardTitle>
              <CardDescription>
                Papers are grouped per class. Each class keeps its own marks book; attach the max,
                pass mark and an optional sample paper.
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border"
                checked={allPapersSelected}
                onChange={(event) =>
                  event.target.checked
                    ? setSubjects(
                        Object.values(subjectsByClass)
                          .flat()
                          .map((cs) => ({ cs, maxMarks: "100", passMarks: "50" })),
                      )
                    : setSubjects([])
                }
                disabled={Object.values(subjectsByClass).flat().length === 0}
              />
              Select all
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {effectiveClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes are registered for this grade yet.</p>
          ) : subjectsLoading ? (
            <div className="space-y-2" aria-busy="true">
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
            </div>
          ) : (
            effectiveClasses.map((schoolClass) => {
              const list = subjectsByClass[schoolClass.id] ?? [];
              if (list.length === 0) return null;
              const sectionSelected = list.every((cs) => subjects.some((entry) => entry.cs.id === cs.id));
              return (
                <section key={schoolClass.id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
                    <h3 className="flex flex-wrap items-baseline gap-2 text-sm font-semibold">
                      {schoolClass.className}
                      <span className="text-xs font-normal text-muted-foreground">
                        {list.filter((cs) => subjects.some((entry) => entry.cs.id === cs.id)).length}/
                        {list.length} selected
                      </span>
                    </h3>
                    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border"
                        checked={sectionSelected}
                        onChange={(event) => toggleClassSubjects(schoolClass.id, event.target.checked)}
                      />
                      Select all for this class
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {list.map((cs) => {
                      const selected = subjects.find((entry) => entry.cs.id === cs.id);
                      return (
                        <div
                          key={cs.id}
                          className={`rounded-lg border p-2.5 ${
                            selected ? "border-primary bg-primary/5" : ""
                          }`}
                        >
                          <label className="flex min-h-9 items-start gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="mt-0.5 size-4 shrink-0 rounded border"
                              checked={Boolean(selected)}
                              onChange={(event) => toggleSubject(cs, event.target.checked)}
                              aria-label={cs.subject?.name ?? "Subject"}
                            />
                            <span className="min-w-0 text-[13px] leading-snug">
                              {cs.subject?.name ?? cs.subjectId}
                            </span>
                          </label>
                          <p className="ms-6 mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <UserRound size={11} aria-hidden />
                            {teacherName(cs) || "No teacher"}
                          </p>
                          {selected ? (
                            <div className="mt-2 space-y-2">
                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label
                                    htmlFor={`max-${cs.id}`}
                                    className="mb-0.5 block text-[10px] font-medium text-muted-foreground"
                                  >
                                    Max
                                  </label>
                                  <Input
                                    id={`max-${cs.id}`}
                                    inputMode="numeric"
                                    value={selected.maxMarks}
                                    onChange={(event) =>
                                      updateSubject(cs.id, { maxMarks: event.target.value })
                                    }
                                    className="h-7 px-2 text-xs"
                                    aria-label={`Max marks for ${cs.subject?.name ?? "subject"}`}
                                  />
                                </div>
                                <div>
                                  <label
                                    htmlFor={`pass-${cs.id}`}
                                    className="mb-0.5 block text-[10px] font-medium text-muted-foreground"
                                  >
                                    Pass
                                  </label>
                                  <Input
                                    id={`pass-${cs.id}`}
                                    inputMode="numeric"
                                    value={selected.passMarks}
                                    onChange={(event) =>
                                      updateSubject(cs.id, { passMarks: event.target.value })
                                    }
                                    className="h-7 px-2 text-xs"
                                    aria-label={`Pass marks for ${cs.subject?.name ?? "subject"}`}
                                  />
                                </div>
                              </div>
                              <div className="border-t pt-1.5">
                                {previewBusy[cs.id] ? (
                                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Loader2 size={11} className="animate-spin" aria-hidden /> Uploading…
                                  </p>
                                ) : previewFiles[cs.id] ? (
                                  <p className="flex min-w-0 items-center gap-1 text-[11px]">
                                    <Paperclip size={11} className="shrink-0 text-muted-foreground" aria-hidden />
                                    <span className="min-w-0 truncate">{previewFiles[cs.id]!.name}</span>
                                    <button
                                      type="button"
                                      className="ms-auto shrink-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => clearSubjectPreview(cs.id)}
                                      aria-label={`Remove sample paper for ${cs.subject?.name ?? "subject"}`}
                                    >
                                      <X size={11} aria-hidden />
                                    </button>
                                  </p>
                                ) : (
                                  <>
                                    <label
                                      htmlFor={`preview-${cs.id}`}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium hover:bg-muted/50"
                                    >
                                      <Upload size={11} aria-hidden /> Sample paper
                                    </label>
                                    <input
                                      id={`preview-${cs.id}`}
                                      type="file"
                                      accept="application/pdf,image/*"
                                      className="sr-only"
                                      onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        event.target.value = "";
                                        if (file) void attachSubjectPreview(cs, file);
                                      }}
                                    />
                                  </>
                                )}
                                {previewError[cs.id] ? (
                                  <p role="alert" className="mt-1 text-[10px] text-destructive">
                                    {previewError[cs.id]}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Exam rooms</CardTitle>
          <CardDescription>
            Only rooms serving the selected classes are listed. Candidates are seated automatically
            from each class roster; adjust individual seats from the exam page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roomsForSelection.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rooms exist for these classes yet —{" "}
              <Link href="/school/admin/exams/rooms" className="font-medium underline">
                create rooms in the Room Wizard
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {roomsForSelection.map((room) => {
                const checked = selectedRoomIds.includes(room.id);
                return (
                  <label
                    key={room.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm ${
                      checked ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border"
                      checked={checked}
                      onChange={(event) => toggleRoom(room.id, event.target.checked)}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{room.name}</span>
                    <Badge variant="outline">{room.capacity} seats</Badge>
                  </label>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {effectiveClasses.length} class{effectiveClasses.length === 1 ? "" : "es"} ·{" "}
          {subjects.length} paper{subjects.length === 1 ? "" : "s"} ·{" "}
          {selectedRoomIds.length} room{selectedRoomIds.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/school/admin/exams")}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {pending ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden /> Creating exam…
              </>
            ) : (
              <>
                <Check size={14} aria-hidden /> Create exam
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
