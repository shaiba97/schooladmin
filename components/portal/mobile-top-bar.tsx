"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/components/portal/sidebar";
import { useSessionRoles } from "@/components/auth/session-roles";

export function MobileTopBar() {
  const pathname = usePathname();
  const roles = useSessionRoles();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="fixed inset-x-0 top-0 z-40 border-b bg-background/95 backdrop-blur print:hidden md:hidden">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
        <ShieldCheck size={20} className="shrink-0 text-muted-foreground" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Admin Portal
        </p>
      </div>
      {open && (
        <nav
          aria-label="Admin portal"
          className="max-h-[70vh] overflow-y-auto border-t bg-background px-4 py-3"
        >
          <div className="flex flex-col gap-4">
            {NAV_SECTIONS.filter((section) =>
              roles ? section.roles.some((role) => roles.includes(role)) : false,
            ).map((section) => (
              <div key={section.title}>
                <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
                <div className="mt-1 flex flex-col gap-1">
                  {section.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon size={18} aria-hidden />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
