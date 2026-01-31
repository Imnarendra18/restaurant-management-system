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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function CurrencySettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [currencySettings, setCurrencySettings] = useState({
    currency: "NPR",
    currencySymbol: "Rs.",
    decimalPlaces: "2",
    thousandSeparator: ",",
  });

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Currency settings saved successfully");
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
          <DollarSign className="h-6 w-6" />
          Currency Settings
        </h1>
        <p className="text-muted-foreground">
          Configure currency display format
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Currency Configuration</CardTitle>
          <CardDescription>
            Configure currency display format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={currencySettings.currency}
                onValueChange={(value) =>
                  setCurrencySettings({ ...currencySettings, currency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NPR">Nepali Rupee (NPR)</SelectItem>
                  <SelectItem value="INR">Indian Rupee (INR)</SelectItem>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Input
                id="currencySymbol"
                value={currencySettings.currencySymbol}
                onChange={(e) =>
                  setCurrencySettings({
                    ...currencySettings,
                    currencySymbol: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="decimalPlaces">Decimal Places</Label>
              <Select
                value={currencySettings.decimalPlaces}
                onValueChange={(value) =>
                  setCurrencySettings({
                    ...currencySettings,
                    decimalPlaces: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thousandSeparator">Thousand Separator</Label>
              <Select
                value={currencySettings.thousandSeparator}
                onValueChange={(value) =>
                  setCurrencySettings({
                    ...currencySettings,
                    thousandSeparator: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value=".">Period (.)</SelectItem>
                  <SelectItem value=" ">Space</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Preview</p>
            <p className="text-2xl font-bold">
              {currencySettings.currencySymbol} 1{currencySettings.thousandSeparator}234
              {currencySettings.decimalPlaces === "2" ? ".56" : ""}
            </p>
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
