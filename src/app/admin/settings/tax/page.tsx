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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Percent, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function TaxSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [taxSettings, setTaxSettings] = useState({
    vatEnabled: true,
    vatRate: "13",
    serviceChargeEnabled: true,
    serviceChargeRate: "10",
    includeTaxInPrice: false,
  });

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Tax settings saved successfully");
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
          <Percent className="h-6 w-6" />
          Tax Settings
        </h1>
        <p className="text-muted-foreground">
          Configure VAT and service charge settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Configuration</CardTitle>
          <CardDescription>
            Configure VAT and service charge settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable VAT</Label>
              <p className="text-sm text-muted-foreground">
                Apply VAT to all orders
              </p>
            </div>
            <Switch
              checked={taxSettings.vatEnabled}
              onCheckedChange={(checked) =>
                setTaxSettings({ ...taxSettings, vatEnabled: checked })
              }
            />
          </div>

          {taxSettings.vatEnabled && (
            <div className="space-y-2">
              <Label htmlFor="vatRate">VAT Rate (%)</Label>
              <Input
                id="vatRate"
                type="number"
                value={taxSettings.vatRate}
                onChange={(e) =>
                  setTaxSettings({ ...taxSettings, vatRate: e.target.value })
                }
                className="w-32"
              />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Service Charge</Label>
              <p className="text-sm text-muted-foreground">
                Apply service charge to orders
              </p>
            </div>
            <Switch
              checked={taxSettings.serviceChargeEnabled}
              onCheckedChange={(checked) =>
                setTaxSettings({
                  ...taxSettings,
                  serviceChargeEnabled: checked,
                })
              }
            />
          </div>

          {taxSettings.serviceChargeEnabled && (
            <div className="space-y-2">
              <Label htmlFor="serviceChargeRate">Service Charge Rate (%)</Label>
              <Input
                id="serviceChargeRate"
                type="number"
                value={taxSettings.serviceChargeRate}
                onChange={(e) =>
                  setTaxSettings({
                    ...taxSettings,
                    serviceChargeRate: e.target.value,
                  })
                }
                className="w-32"
              />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Tax Inclusive Pricing</Label>
              <p className="text-sm text-muted-foreground">
                Menu prices already include tax
              </p>
            </div>
            <Switch
              checked={taxSettings.includeTaxInPrice}
              onCheckedChange={(checked) =>
                setTaxSettings({
                  ...taxSettings,
                  includeTaxInPrice: checked,
                })
              }
            />
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
