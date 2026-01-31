"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Building,
  Receipt,
  Percent,
  Printer,
  DollarSign,
  Loader2,
  Save,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);

  // Restaurant Settings
  const [restaurantSettings, setRestaurantSettings] = useState({
    name: "My Restaurant",
    address: "Kathmandu, Nepal",
    phone: "01-4123456",
    email: "info@restaurant.com",
    panNumber: "123456789",
    logo: "",
  });

  // Tax Settings
  const [taxSettings, setTaxSettings] = useState({
    vatEnabled: true,
    vatRate: "13",
    serviceChargeEnabled: true,
    serviceChargeRate: "10",
    includeTaxInPrice: false,
  });

  // Receipt Settings
  const [receiptSettings, setReceiptSettings] = useState({
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showPan: true,
    footerText: "Thank you for dining with us!",
    paperWidth: "80",
  });

  // Currency Settings
  const [currencySettings, setCurrencySettings] = useState({
    currency: "NPR",
    currencySymbol: "Rs.",
    decimalPlaces: "2",
    thousandSeparator: ",",
  });

  // Financial Year
  const [financialYear, setFinancialYear] = useState({
    startMonth: "7",
    currentYear: "2081/82",
    isClosed: false,
  });

  const handleSaveSettings = async (section: string) => {
    setIsLoading(true);
    try {
      // This will call Convex mutation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`${section} settings saved successfully`);
    } catch (error) {
      toast.error(`Failed to save ${section} settings`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your restaurant system settings
        </p>
      </div>

      <Tabs defaultValue="restaurant" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="restaurant" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Restaurant
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Tax
          </TabsTrigger>
          <TabsTrigger value="receipt" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Receipt
          </TabsTrigger>
          <TabsTrigger value="currency" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Currency
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Financial Year
          </TabsTrigger>
        </TabsList>

        {/* Restaurant Settings */}
        <TabsContent value="restaurant">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>
                Basic details about your restaurant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurantName">Restaurant Name</Label>
                  <Input
                    id="restaurantName"
                    value={restaurantSettings.name}
                    onChange={(e) =>
                      setRestaurantSettings({
                        ...restaurantSettings,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantPhone">Phone</Label>
                  <Input
                    id="restaurantPhone"
                    value={restaurantSettings.phone}
                    onChange={(e) =>
                      setRestaurantSettings({
                        ...restaurantSettings,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurantAddress">Address</Label>
                <Input
                  id="restaurantAddress"
                  value={restaurantSettings.address}
                  onChange={(e) =>
                    setRestaurantSettings({
                      ...restaurantSettings,
                      address: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurantEmail">Email</Label>
                  <Input
                    id="restaurantEmail"
                    type="email"
                    value={restaurantSettings.email}
                    onChange={(e) =>
                      setRestaurantSettings({
                        ...restaurantSettings,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantPan">PAN Number</Label>
                  <Input
                    id="restaurantPan"
                    value={restaurantSettings.panNumber}
                    onChange={(e) =>
                      setRestaurantSettings({
                        ...restaurantSettings,
                        panNumber: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <Button
                onClick={() => handleSaveSettings("Restaurant")}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Settings */}
        <TabsContent value="tax">
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

              <Button
                onClick={() => handleSaveSettings("Tax")}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipt Settings */}
        <TabsContent value="receipt">
          <Card>
            <CardHeader>
              <CardTitle>Receipt Settings</CardTitle>
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

              <Button
                onClick={() => handleSaveSettings("Receipt")}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currency Settings */}
        <TabsContent value="currency">
          <Card>
            <CardHeader>
              <CardTitle>Currency Settings</CardTitle>
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

              <Button
                onClick={() => handleSaveSettings("Currency")}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Year Settings */}
        <TabsContent value="financial">
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

              <Button
                onClick={() => handleSaveSettings("Financial Year")}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
