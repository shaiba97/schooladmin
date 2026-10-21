import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { School } from "lucide-react";

export default function SchoolSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">School Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School size={18} />
            School Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name</Label>
              <Input id="school-name" placeholder="e.g. Comboni School" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-logo">Logo URL</Label>
              <Input id="school-logo" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-website">Website</Label>
              <Input id="school-website" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-desc">Description</Label>
              <Textarea id="school-desc" rows={3} placeholder="Brief school description..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" placeholder="info@school.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" placeholder="+249..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-address">Address</Label>
              <Textarea id="contact-address" rows={2} placeholder="School address..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-country">Country Code</Label>
              <Input id="contact-country" placeholder="e.g. SD" />
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
