"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send } from "lucide-react";

type MessageLog = {
  id: string;
  channel: "SMS" | "EMAIL" | "IN_APP";
  recipient: string;
  subject: string;
  status: "SENT" | "FAILED" | "PENDING";
  sentAt: string;
};

const STUB_MESSAGES: MessageLog[] = [
  { id: "1", channel: "IN_APP", recipient: "All Parents", subject: "School closed tomorrow", status: "SENT", sentAt: "2026-10-10T08:00:00Z" },
  { id: "2", channel: "SMS", recipient: "Grade 10 Students", subject: "Exam schedule update", status: "SENT", sentAt: "2026-10-09T14:30:00Z" },
  { id: "3", channel: "EMAIL", recipient: "All Teachers", subject: "Staff meeting reminder", status: "FAILED", sentAt: "2026-10-09T09:15:00Z" },
  { id: "4", channel: "SMS", recipient: "Class 3A Parents", subject: "Field trip permission slip", status: "PENDING", sentAt: "2026-10-10T07:45:00Z" },
  { id: "5", channel: "EMAIL", recipient: "Ahmed Hassan", subject: "Fee payment reminder", status: "SENT", sentAt: "2026-10-08T16:20:00Z" },
];

export default function CommunicationPage() {
  const [activeTab, setActiveTab] = React.useState("history");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Communication</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history">Message History</TabsTrigger>
          <TabsTrigger value="delivery">Delivery Status</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare size={18} />
                Sent Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium">Channel</th>
                      <th className="pb-2 pr-4 font-medium">Recipient</th>
                      <th className="pb-2 pr-4 font-medium">Subject</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STUB_MESSAGES.map((msg) => (
                      <tr key={msg.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <Badge variant={msg.channel === "SMS" ? "default" : msg.channel === "EMAIL" ? "secondary" : "outline"}>
                            {msg.channel}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 font-medium">{msg.recipient}</td>
                        <td className="py-3 pr-4">{msg.subject}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={msg.status === "SENT" ? "default" : msg.status === "FAILED" ? "destructive" : "secondary"}>
                            {msg.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(msg.sentAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send size={18} />
                Delivery Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold">1</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold">1</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
