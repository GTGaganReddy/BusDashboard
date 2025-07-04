import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Route, Users, Clock, AlertTriangle } from "lucide-react";

interface SummaryCardsProps {
  stats: {
    totalRoutes: number;
    activeDrivers: number;
    totalHours: number;
    criticalDrivers: number;
  } | undefined;
  isLoading: boolean;
}

export default function SummaryCards({ stats, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="ml-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Routes",
      value: stats?.totalRoutes || 0,
      icon: Route,
      className: "bg-primary/10 text-primary",
    },
    {
      title: "Active Drivers",
      value: stats?.activeDrivers || 0,
      icon: Users,
      className: "bg-success/10 text-success",
    },
    {
      title: "Total Hours",
      value: stats?.totalHours || 0,
      icon: Clock,
      className: "bg-warning/10 text-warning",
    },
    {
      title: "Critical Hours",
      value: stats?.criticalDrivers || 0,
      icon: AlertTriangle,
      className: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.className}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-semibold text-secondary">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
