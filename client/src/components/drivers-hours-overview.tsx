import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Clock, AlertTriangle } from "lucide-react";

interface Driver {
  id: number;
  name: string;
  code: string;
  monthlyHoursTotal: string;
  monthlyHoursRemaining: string;
  status: string;
}

export default function DriversHoursOverview() {
  const { data: drivers, isLoading, error } = useQuery({
    queryKey: ["/api/drivers"],
    queryFn: async () => {
      const response = await fetch("/api/drivers");
      if (!response.ok) {
        throw new Error('Failed to fetch drivers');
      }
      return response.json();
    },
  });

  const getStatusColor = (remaining: number, total: number) => {
    const percentRemaining = (remaining / total) * 100;
    if (percentRemaining <= 10) return "destructive";
    if (percentRemaining <= 25) return "secondary";
    return "default";
  };

  const getStatusText = (remaining: number, total: number) => {
    const percentRemaining = (remaining / total) * 100;
    if (percentRemaining <= 10) return "Critical";
    if (percentRemaining <= 25) return "Low";
    return "Good";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <CardTitle>Driver Hours Overview</CardTitle>
          </div>
          <CardDescription>Loading driver hours...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !drivers) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <CardTitle>Driver Hours Overview</CardTitle>
          </div>
          <CardDescription>Current month remaining hours for all drivers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-muted-foreground py-8">
            <AlertTriangle className="w-4 h-4" />
            <span>Unable to load driver hours data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort drivers by remaining hours (lowest first to highlight critical drivers)
  const sortedDrivers = [...drivers].sort((a, b) => {
    const aRemaining = parseFloat(a.monthlyHoursRemaining);
    const bRemaining = parseFloat(b.monthlyHoursRemaining);
    return aRemaining - bRemaining;
  });

  const criticalCount = drivers.filter((d: Driver) => {
    const remaining = parseFloat(d.monthlyHoursRemaining);
    const total = parseFloat(d.monthlyHoursTotal);
    return (remaining / total) * 100 <= 10;
  }).length;

  const lowCount = drivers.filter((d: Driver) => {
    const remaining = parseFloat(d.monthlyHoursRemaining);
    const total = parseFloat(d.monthlyHoursTotal);
    const percent = (remaining / total) * 100;
    return percent > 10 && percent <= 25;
  }).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <CardTitle>Driver Hours Overview</CardTitle>
          </div>
          <div className="flex space-x-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {lowCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {lowCount} Low
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Current month remaining hours for all drivers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedDrivers.map((driver) => {
            const remaining = parseFloat(driver.monthlyHoursRemaining);
            const total = parseFloat(driver.monthlyHoursTotal);
            const used = total - remaining;
            const percentUsed = (used / total) * 100;
            const statusColor = getStatusColor(remaining, total);
            const statusText = getStatusText(remaining, total);

            return (
              <div 
                key={driver.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm truncate">
                        {driver.name}
                      </span>
                      <Badge variant={statusColor} className="text-xs">
                        {statusText}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{remaining.toFixed(1)}h left</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {used.toFixed(1)}h / {total.toFixed(1)}h used
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-16 bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        statusColor === "destructive" ? "bg-destructive" :
                        statusColor === "secondary" ? "bg-yellow-500" :
                        "bg-green-500"
                      }`}
                      style={{ 
                        width: `${Math.min(percentUsed, 100)}%` 
                      }}
                    />
                  </div>
                  <div className="text-right min-w-0">
                    <div className="font-semibold text-sm">
                      {remaining.toFixed(1)}h
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((remaining / total) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {sortedDrivers.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No drivers found
          </div>
        )}
      </CardContent>
    </Card>
  );
}