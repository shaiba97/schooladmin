"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Mail, HardDrive, Cloud } from "lucide-react";

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: typeof MessageSquare;
  configured: boolean;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
};

const INTEGRATIONS: Integration[] = [
  {
    id: "sms",
    name: "SMS Gateway",
    description: "Send SMS notifications to parents and staff",
    icon: MessageSquare,
    configured: false,
    fields: [
      { key: "provider", label: "Provider", placeholder: "e.g. Twilio, Vonage" },
      { key: "api_key", label: "API Key", placeholder: "Enter API key", secret: true },
      { key: "api_secret", label: "API Secret", placeholder: "Enter API secret", secret: true },
      { key: "sender_id", label: "Sender ID", placeholder: "e.g. SCHOOL" },
    ],
  },
  {
    id: "email",
    name: "Email Provider",
    description: "Send email notifications and reports",
    icon: Mail,
    configured: true,
    fields: [
      { key: "provider", label: "Provider", placeholder: "e.g. SendGrid, SMTP" },
      { key: "api_key", label: "API Key", placeholder: "Enter API key", secret: true },
      { key: "from_email", label: "From Email", placeholder: "e.g. noreply@school.com" },
    ],
  },
  {
    id: "storage",
    name: "File Storage",
    description: "Store documents, receipts, and uploaded files",
    icon: HardDrive,
    configured: false,
    fields: [
      { key: "provider", label: "Provider", placeholder: "e.g. S3, GCS, Azure" },
      { key: "bucket", label: "Bucket Name", placeholder: "e.g. school-documents" },
      { key: "access_key", label: "Access Key", placeholder: "Enter access key", secret: true },
      { key: "secret_key", label: "Secret Key", placeholder: "Enter secret key", secret: true },
    ],
  },
  {
    id: "external",
    name: "External Services",
    description: "Third-party integrations and webhooks",
    icon: Cloud,
    configured: false,
    fields: [
      { key: "webhook_url", label: "Webhook URL", placeholder: "https://..." },
      { key: "auth_token", label: "Auth Token", placeholder: "Enter auth token", secret: true },
    ],
  },
];

export default function IntegrationsPage() {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);

  async function save(id: string) {
    setSaving(id);
    setTimeout(() => setSaving(null), 1500);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          const isOpen = expanded === integration.id;
          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{integration.description}</p>
                    </div>
                  </div>
                  <Badge variant={integration.configured ? "default" : "secondary"}>
                    {integration.configured ? "Configured" : "Not configured"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded(isOpen ? null : integration.id)}
                >
                  {isOpen ? "Close" : "Configure"}
                </Button>

                {isOpen && (
                  <div className="mt-4 space-y-3">
                    {integration.fields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label htmlFor={`${integration.id}-${field.key}`}>{field.label}</Label>
                        <Input
                          id={`${integration.id}-${field.key}`}
                          type={field.secret ? "password" : "text"}
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                    <Button
                      size="sm"
                      onClick={() => void save(integration.id)}
                      disabled={saving === integration.id}
                    >
                      {saving === integration.id ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
