"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Receipt,
  School,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Can, SessionRole, SessionRolesProvider, useSessionRoles } from "@/components/auth/session-roles";

export type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

export type NavSection = {
  title: string;
  roles: SessionRole[];
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    roles: ["ADMIN", "ACADEMIC_ADMIN", "ACCOUNTANT", "EXAMINATION_OFFICER", "SYSTEM_ADMIN"],
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Academic Affairs",
    roles: ["ADMIN", "ACADEMIC_ADMIN", "EXAMINATION_OFFICER", "RECEPTIONIST"],
    items: [
      { href: "/academic/students", label: "Students", icon: Users },
      { href: "/academic/teachers", label: "Teachers", icon: GraduationCap },
      { href: "/academic/attendance", label: "Attendance", icon: CalendarDays },
      { href: "/school/admin/exams", label: "Examination Center", icon: ClipboardList },
      { href: "/academic/timetable", label: "Timetable", icon: CalendarDays },
    ],
  },
  {
    title: "Financial Affairs",
    roles: ["ADMIN", "ACCOUNTANT", "FINANCE_ADMIN", "CASHIER", "FINANCE_APPROVER", "AUDITOR"],
    items: [
      { href: "/school/admin/finance/dashboard", label: "Financial Dashboard", icon: LayoutDashboard },
      { href: "/school/admin/finance/payments", label: "Students Payments", icon: Receipt },
      { href: "/school/admin/finance/payouts", label: "Teacher Payouts", icon: Wallet },
      { href: "/school/admin/finance/expenses", label: "Expenses", icon: ArrowRightLeft },
    ],
  },
  {
    title: "People & Operations",
    roles: ["ADMIN", "ACADEMIC_ADMIN"],
    items: [
      { href: "/school/admin/staff/attendance", label: "Staff Attendance", icon: CalendarDays },
      { href: "/people/departments", label: "Departments", icon: School },
      { href: "/people/notifications", label: "Notifications & Announcements", icon: Megaphone },
      { href: "/people/communication", label: "Communication", icon: FileText },
    ],
  },
  {
    title: "My School",
    roles: ["ADMIN", "SYSTEM_ADMIN"],
    items: [
      { href: "/admin/profile", label: "Profile & Subscription", icon: UserCog },
    ],
  },
  {
    title: "Administration & System",
    roles: ["ADMIN", "SYSTEM_ADMIN"],
    items: [
      { href: "/system/users", label: "Users & Access", icon: UserCog },
      { href: "/system/staff", label: "Staff", icon: Users },
    ],
  },
];

function sectionVisible(section: NavSection, roles: string[] | null): boolean {
  if (!roles) return false;
  return section.roles.some((role) => roles.includes(role));
}

export function Sidebar() {
  const pathname = usePathname();
  const roles = useSessionRoles();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e bg-background p-4 md:flex print:hidden">
      <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Admin Portal
      </p>
      <nav aria-label="Admin portal" className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto">
        {NAV_SECTIONS.filter((section) => sectionVisible(section, roles)).map((section) => (
          <div key={section.title}>
            <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <div className="mt-1 flex flex-col gap-1">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const className = cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                );
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={className}>
                    <Icon size={18} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <LogoutButton />
    </aside>
  );
}

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = React.useState<SessionRole[] | null>(null);

  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("ad_roles");
      setRoles(raw ? (JSON.parse(raw) as SessionRole[]) : []);
    } catch {
      setRoles([]);
    }
  }, []);

  return (
    <SessionRolesProvider roles={roles}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </SessionRolesProvider>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {
    // Cookies may already be gone; still land on login.
    } finally {
      try {
        window.sessionStorage.removeItem("ad_roles");
      } catch {
        // Storage unavailable — nothing to clear.
      }
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <LogOut size={18} aria-hidden />
      Sign out
    </button>
  );
}

export { Can };
