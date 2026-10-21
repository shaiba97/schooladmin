"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { fetchFileBlob } from "@/lib/api/storage";

export type AvatarStudent = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  // NOTE: despite the name, the API stores a *storage object key* here,
  // not a URL — it must be resolved through the authenticated download.
  photoUrl?: string | null;
};

function displayName(student: AvatarStudent) {
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
}

function colorFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function StudentAvatar({
  student,
  size = "md",
  className,
}: {
  student: AvatarStudent;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [photoBroken, setPhotoBroken] = React.useState(false);

  React.useEffect(() => {
    setPhotoUrl(null);
    setPhotoBroken(false);
    if (!student.photoUrl) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchFileBlob(student.photoUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPhotoBroken(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [student.photoUrl]);

  const dims =
    size === "lg" ? "size-20 text-2xl" : size === "sm" ? "size-8 text-sm" : "size-10 text-base";
  const pixel = size === "lg" ? 80 : size === "sm" ? 32 : 40;
  const name = displayName(student) || "Unnamed student";
  const initial = (student.firstName?.[0] ?? "?").toUpperCase();

  if (photoUrl && !photoBroken) {
    return (
      <Image
        src={photoUrl}
        alt={`${name} profile photo`}
        width={pixel}
        height={pixel}
        // Blob URLs are already in-memory: skip the optimizer pipeline.
        unoptimized
        onError={() => setPhotoBroken(true)}
        className={cn("rounded-full object-cover shrink-0", dims, className)}
      />
    );
  }

  const hue = colorFor(student.id);
  const darkText = hue >= 50 && hue <= 185;
  return (
    <span
      role="img"
      aria-label={`${name} (no photo)`}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold shrink-0",
        dims,
        darkText ? "text-slate-900" : "text-white",
        className,
      )}
      style={{ backgroundColor: `hsl(${hue} 55% ${darkText ? 70 : 42}%)` }}
    >
      {initial}
    </span>
  );
}
