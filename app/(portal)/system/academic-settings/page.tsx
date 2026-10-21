import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export default function AcademicSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Academic Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen size={18} />
            Grading Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passing-score">Passing Score (%)</Label>
              <Input id="passing-score" type="number" placeholder="e.g. 50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-score">Maximum Score</Label>
              <Input id="max-score" type="number" placeholder="e.g. 100" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="late-threshold">Late Arrival Threshold (minutes)</Label>
              <Input id="late-threshold" type="number" placeholder="e.g. 15" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="absence-limit">Max Absences Before Alert</Label>
              <Input id="absence-limit" type="number" placeholder="e.g. 5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic Years & Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Manage academic years and terms. This is a minimal settings list.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">2026-2027</p>
                <p className="text-xs text-muted-foreground">3 terms</p>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">2025-2026</p>
                <p className="text-xs text-muted-foreground">3 terms (archived)</p>
              </div>
              <Button variant="outline" size="sm">View</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}
