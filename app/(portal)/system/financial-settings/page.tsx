import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard } from "lucide-react";

export default function FinancialSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Financial Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={18} />
            Currency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="currency">Default Currency</Label>
            <Input id="currency" placeholder="e.g. USD, SDG" />
            <p className="text-xs text-muted-foreground">
              All monetary values use this currency unless overridden per invoice.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["CASH", "BANK_TRANSFER", "CARD", "MOBILE_MONEY", "ONLINE", "OTHER"].map((method) => (
              <div key={method} className="flex items-center gap-3">
                <Checkbox id={`method-${method}`} defaultChecked={method === "CASH" || method === "BANK_TRANSFER"} />
                <Label htmlFor={`method-${method}`} className="font-normal">
                  {method.replace(/_/g, " ")}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt-prefix">Receipt Number Prefix</Label>
              <Input id="receipt-prefix" placeholder="e.g. RCP-" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-next">Next Receipt Number</Label>
              <Input id="receipt-next" type="number" placeholder="e.g. 1001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-footer">Receipt Footer Text</Label>
              <Input id="receipt-footer" placeholder="e.g. Thank you for your payment" />
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
