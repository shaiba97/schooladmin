"use client";

import * as React from "react";
import { adminApiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Megaphone } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  body: string;
  targetType: string;
  createdAt: string;
  status: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [targetType, setTargetType] = React.useState("SCHOOL_WIDE");
  const [targetId, setTargetId] = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await adminApiFetch<Notification[]>("/notifications/me");
      setNotifications(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setSuccess(false);
    try {
      await adminApiFetch("/notifications", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          targetType,
          targetId: targetType === "SCHOOL_WIDE" ? undefined : targetId,
        }),
      });
      setTitle("");
      setBody("");
      setTargetId("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send notification");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications & Announcements</h1>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">Notification sent.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone size={18} />
              Send Notification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notif-title">Title</Label>
                <Input
                  id="notif-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. School closed tomorrow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notif-body">Message</Label>
                <Textarea
                  id="notif-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter your message..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHOOL_WIDE">School Wide</SelectItem>
                    <SelectItem value="CLASS">Class</SelectItem>
                    <SelectItem value="GRADE">Grade</SelectItem>
                    <SelectItem value="EDUCATION_LEVEL">Education Level</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {targetType !== "SCHOOL_WIDE" && (
                <div className="space-y-2">
                  <Label htmlFor="target-id">Target ID</Label>
                  <Input
                    id="target-id"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder={`Enter ${targetType.toLowerCase()} ID`}
                  />
                </div>
              )}
              <Button
                onClick={() => void send()}
                disabled={sending || !title.trim() || !body.trim()}
                className="w-full"
              >
                {sending ? "Sending..." : "Send Notification"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 10).map((n) => (
                  <div key={n.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{n.title}</p>
                      <Badge variant="secondary">{n.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
