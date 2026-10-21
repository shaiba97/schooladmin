"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { fetchFileBlob } from "@/lib/api/storage";

export type AvatarTeacher = {
  id: string;
  user?: { firstName: string; lastName?: string | null } | null;
};

function colorFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function TeacherAvatar({
  teacher,
  photoObjectKey,
  size = "md",
  className,
}: {
  teacher: AvatarTeacher;
  photoObjectKey?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [photoBroken, setPhotoBroken] = React.useState(false);

  React.useEffect(() => {
    setPhotoUrl(null);
    setPhotoBroken(false);
    if (!photoObjectKey) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchFileBlob(photoObjectKey)
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
  }, [photoObjectKey]);

  const dims =
    size === "lg" ? "size-20 text-2xl" : size === "sm" ? "size-8 text-sm" : "size-10 text-base";
  const pixel = size === "lg" ? 80 : size === "sm" ? 32 : 40;
  const name = [teacher.user?.firstName, teacher.user?.lastName].filter(Boolean).join(" ") || "Unnamed teacher";
  const initial = (teacher.user?.firstName?.[0] ?? "?").toUpperCase();

  if (photoUrl && !photoBroken) {
    return (
      <Image
        src={photoUrl}
        alt={`${name} profile photo`}
        width={pixel}
        height={pixel}
        // Blob URLs are already in-memory: skip the optimizer pipeline.
        unoptimized
        loading="lazy"
        onError={() => setPhotoBroken(true)}
        className={cn("rounded-full object-cover shrink-0", dims, className)}
      />
    );
  }

  const hue = colorFor(teacher.id);
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
