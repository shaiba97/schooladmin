"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "./button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div role="status" className="text-center py-12 px-6 rounded-xl border bg-card border-dashed">
      {Icon ? <Icon size={32} className="mx-auto text-muted-foreground/60" aria-hidden /> : null}
      <h3 className="mt-3 text-sm font-medium">{title}</h3>
      {description ? <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{description}</p> : null}
      {action ? (
        <Button className="mt-4" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
