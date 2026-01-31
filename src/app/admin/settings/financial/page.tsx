"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function FinancialYearSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [financialYear, setFinancialYear] = useState({
    startMonth: "7",
    currentYear: "2081/82",
    isClosed: false,
  });

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Financial year settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Financial Year Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your financial year settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Year</CardTitle>
          <CardDescription>
            Manage your financial year settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startMonth">Financial Year Starts</Label>
              <Select
                value={financialYear.startMonth}
                onValueChange={(value) =>
                  setFinancialYear({ ...financialYear, startMonth: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Baisakh (Mid-April)</SelectItem>
                  <SelectItem value="4">Shrawan (Mid-July)</SelectItem>
                  <SelectItem value="7">Kartik (Mid-October)</SelectItem>
                  <SelectItem value="10">Magh (Mid-January)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentYear">Current Financial Year</Label>
              <Input
                id="currentYear"
                value={financialYear.currentYear}
                onChange={(e) =>
                  setFinancialYear({
                    ...financialYear,
                    currentYear: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Current Year</span>
              <span className="font-medium">{financialYear.currentYear}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span
                className={`font-medium ${
                  financialYear.isClosed ? "text-red-600" : "text-green-600"
                }`}
              >
                {financialYear.isClosed ? "Closed" : "Active"}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Year End Actions</h4>
            <p className="text-sm text-muted-foreground">
              Closing the financial year will:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Lock all transactions for the current year</li>
              <li>Generate year-end reports</li>
              <li>Carry forward balances to the new year</li>
            </ul>

            <Button variant="destructive" disabled>
              Close Financial Year
            </Button>
          </div>

          <Button onClick={handleSaveSettings} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
