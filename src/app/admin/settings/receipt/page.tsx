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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Receipt, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function ReceiptSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [receiptSettings, setReceiptSettings] = useState({
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showPan: true,
    footerText: "Thank you for dining with us!",
    paperWidth: "80",
  });

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Receipt settings saved successfully");
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
          <Receipt className="h-6 w-6" />
          Receipt Settings
        </h1>
        <p className="text-muted-foreground">
          Configure how receipts are printed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receipt Configuration</CardTitle>
          <CardDescription>
            Configure how receipts are printed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="paperWidth">Paper Width (mm)</Label>
            <Select
              value={receiptSettings.paperWidth}
              onValueChange={(value) =>
                setReceiptSettings({ ...receiptSettings, paperWidth: value })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58">58mm</SelectItem>
                <SelectItem value="80">80mm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Show on Receipt</h4>

            <div className="flex items-center justify-between">
              <Label>Show Logo</Label>
              <Switch
                checked={receiptSettings.showLogo}
                onCheckedChange={(checked) =>
                  setReceiptSettings({ ...receiptSettings, showLogo: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Address</Label>
              <Switch
                checked={receiptSettings.showAddress}
                onCheckedChange={(checked) =>
                  setReceiptSettings({
                    ...receiptSettings,
                    showAddress: checked,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Phone</Label>
              <Switch
                checked={receiptSettings.showPhone}
                onCheckedChange={(checked) =>
                  setReceiptSettings({ ...receiptSettings, showPhone: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show PAN Number</Label>
              <Switch
                checked={receiptSettings.showPan}
                onCheckedChange={(checked) =>
                  setReceiptSettings({ ...receiptSettings, showPan: checked })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="footerText">Footer Text</Label>
            <Input
              id="footerText"
              value={receiptSettings.footerText}
              onChange={(e) =>
                setReceiptSettings({
                  ...receiptSettings,
                  footerText: e.target.value,
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
