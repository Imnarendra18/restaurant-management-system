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
import { Building, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function RestaurantSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [restaurantSettings, setRestaurantSettings] = useState({
    name: "My Restaurant",
    address: "Kathmandu, Nepal",
    phone: "01-4123456",
    email: "info@restaurant.com",
    panNumber: "123456789",
    logo: "",
  });

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Restaurant settings saved successfully");
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
          <Building className="h-6 w-6" />
          Restaurant Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your restaurant information
        </p>
      </div>

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
