import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, User, Calendar, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MonthlyHoursData {
  totalHours: number;
  hoursUsed: number;
  hoursRemaining: number;
}

interface MonthlyHoursTrackerProps {
  driverName: string;
}

export default function MonthlyHoursTracker({ driverName }: MonthlyHoursTrackerProps) {
  const [newTotalHours, setNewTotalHours] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const { data: monthlyData, isLoading, error } = useQuery({
    queryKey: ["/api/drivers", driverName, "monthly-hours", currentYear, currentMonth],
    queryFn: async () => {
      const response = await fetch(`/api/drivers/${encodeURIComponent(driverName)}/monthly-hours?year=${currentYear}&month=${currentMonth}`);
      if (!response.ok) {
        throw new Error('Failed to fetch monthly hours');
      }
      return response.json();
    },
    enabled: !!driverName,
  });

  const updateHoursMutation = useMutation({
    mutationFn: async (totalHours: number) => {
      return await apiRequest("PUT", `/api/drivers/${encodeURIComponent(driverName)}/monthly-hours`, {
        totalHours: totalHours.toString()
      });
    },
    onSuccess: () => {
      toast({
        title: "Monthly hours updated",
        description: "Driver's monthly hours have been successfully updated.",
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/drivers", driverName, "monthly-hours"] 
      });
      setDialogOpen(false);
      setNewTotalHours("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update monthly hours. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateHours = () => {
    const hours = parseFloat(newTotalHours);
    if (!isNaN(hours) && hours > 0) {
      updateHoursMutation.mutate(hours);
    }
  };

  const getStatusColor = (hoursRemaining: number, totalHours: number) => {
    const percentRemaining = (hoursRemaining / totalHours) * 100;
    if (percentRemaining <= 10) return "destructive";
    if (percentRemaining <= 25) return "secondary";
    return "default";
  };

  const getStatusText = (hoursRemaining: number, totalHours: number) => {
    const percentRemaining = (hoursRemaining / totalHours) * 100;
    if (percentRemaining <= 10) return "Critical";
    if (percentRemaining <= 25) return "Low";
    return "Good";
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !monthlyData) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <CardTitle className="text-sm">{driverName}</CardTitle>
          </div>
          <CardDescription>Monthly Hours Tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Unable to load monthly hours data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' });
  const statusColor = getStatusColor(monthlyData.hoursRemaining, monthlyData.totalHours);
  const statusText = getStatusText(monthlyData.hoursRemaining, monthlyData.totalHours);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <CardTitle className="text-sm">{driverName}</CardTitle>
          </div>
          <Badge variant={statusColor}>
            {statusText}
          </Badge>
        </div>
        <CardDescription className="flex items-center space-x-1">
          <Calendar className="w-4 h-4" />
          <span>{monthName} {currentYear}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Hours Used</span>
            </div>
            <span className="font-semibold">{monthlyData.hoursUsed.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Hours Remaining</span>
            </div>
            <span className="font-semibold">{monthlyData.hoursRemaining.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Monthly Total</span>
            <span className="text-sm">{monthlyData.totalHours.toFixed(1)}</span>
          </div>

          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                statusColor === "destructive" ? "bg-destructive" :
                statusColor === "secondary" ? "bg-yellow-500" :
                "bg-green-500"
              }`}
              style={{ 
                width: `${Math.min((monthlyData.hoursUsed / monthlyData.totalHours) * 100, 100)}%` 
              }}
            />
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                Update Monthly Hours
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Monthly Hours for {driverName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="totalHours">Total Monthly Hours</Label>
                  <Input
                    id="totalHours"
                    type="number"
                    placeholder="160"
                    value={newTotalHours}
                    onChange={(e) => setNewTotalHours(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleUpdateHours}
                    disabled={updateHoursMutation.isPending}
                    className="flex-1"
                  >
                    {updateHoursMutation.isPending ? "Updating..." : "Update"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}