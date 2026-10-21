"use client";

import * as React from "react";
import { adminApiFetch, ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

type Entry = {
  id: string;
  status: "PRESENT" | "ABSENT" | "LEAVE";
  leftAt?: string | null;
  remarks?: string | null;
  attendanceDate: string;
  teacher?: {
    id?: string;
    employeeNumber?: string | null;
    user?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

const STATUS_STYLES: Record<Entry["status"], string> = {
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  LEAVE: "bg-blue-100 text-blue-700",
};

export default function StaffAttendancePage() {
  const [date, setDate] = React.useState<Date>(new Date());
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);

  // Reception/staff-side marks broadcast school-wide; refetch the month.
  useRealtimeEvent(["attendance_updated"], {
    onEvent: () => setReloadTick((tick) => tick + 1),
    onReconnect: () => setReloadTick((tick) => tick + 1),
  });

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const month = format(date, "yyyy-MM");
        const data = await adminApiFetch<Entry[]>(`/staff-attendance?month=${month}`);
        if (cancelled) return;
        setEntries(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load staff attendance");
          setEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [date, reloadTick]);

  const dayKey = format(date, "yyyy-MM-dd");
  const dayEntries = entries.filter((e) => e.attendanceDate.startsWith(dayKey));
  const summary = React.useMemo(
    () => ({
      present: entries.filter((e) => e.status === "PRESENT").length,
      absent: entries.filter((e) => e.status === "ABSENT").length,
      leave: entries.filter((e) => e.status === "LEAVE").length,
    }),
    [entries],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Staff Attendance</h1>
        <Popover>
          <PopoverTrigger className="inline-flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-normal ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, "PPP")}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
          </PopoverContent>
        </Popover>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Present (month)", value: summary.present, className: "text-green-600" },
          { label: "Absent (month)", value: summary.absent, className: "text-red-600" },
          { label: "On leave (month)", value: summary.leave, className: "text-blue-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-semibold">
                {s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Records — {format(date, "PPP")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : dayEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance recorded for this day.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Teacher</th>
                    <th className="py-2 pr-4 font-medium">Emp. No</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Left at</th>
                    <th className="py-2 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {dayEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {entry.teacher?.user
                          ? `${entry.teacher.user.firstName ?? ""} ${entry.teacher.user.lastName ?? ""}`.trim()
                          : "Unknown"}
                      </td>
                      <td className="py-2 pr-4">{entry.teacher?.employeeNumber ?? "-"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[entry.status]}`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{entry.leftAt ?? "-"}</td>
                      <td className="py-2">{entry.remarks ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
