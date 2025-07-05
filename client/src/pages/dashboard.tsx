import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import WeeklyNavigation from "@/components/weekly-navigation";
import RouteTable from "@/components/route-table";
import SummaryCards from "@/components/summary-cards";
import MonthlyHoursTracker from "@/components/monthly-hours-tracker";

import DriversHoursOverview from "@/components/drivers-hours-overview";
import ORToolsOptimizer from "@/components/ortools-optimizer";
import type { RouteAssignmentView } from "@shared/schema";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday;
  });

  // Get start and end of week
  const getWeekRange = (startDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(startDate);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const { start: weekStart, end: weekEnd } = getWeekRange(selectedWeek);

  const { 
    data: assignments, 
    isLoading: assignmentsLoading, 
    refetch: refetchAssignments 
  } = useQuery({
    queryKey: ["/api/assignments", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      });
      const response = await fetch(`/api/assignments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json() as Promise<RouteAssignmentView[]>;
    },
  });

  const { 
    data: stats, 
    isLoading: statsLoading,
    refetch: refetchStats 
  } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(selectedWeek.getDate() + (direction === "next" ? 7 : -7));
    setSelectedWeek(newWeek);
  };

  const handleRefresh = () => {
    refetchAssignments();
    refetchStats();
  };

  const formatWeekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const startStr = start.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    });
    const endStr = end.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
    
    return `${startStr} - ${endStr}`;
  };

  // Filter assignments for selected day
  const dayAssignments = assignments?.filter(assignment => {
    const assignmentDate = new Date(assignment.assignedDate);
    return assignmentDate.toDateString() === selectedDate.toDateString();
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-secondary">
                Driver Route Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Admin User</span>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="text-primary-foreground text-sm" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Weekly Navigation */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-medium text-secondary">
                  Weekly Route Assignments
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage driver assignments and monitor hours remaining
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateWeek("prev")}
                  className="p-2"
                >
                  ←
                </Button>
                
                <div className="flex items-center space-x-2 bg-muted rounded-lg px-3 py-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-secondary">
                    {formatWeekRange(selectedWeek)}
                  </span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateWeek("next")}
                  className="p-2"
                >
                  →
                </Button>
                
                <Button
                  onClick={handleRefresh}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Date Navigation */}
        <WeeklyNavigation 
          selectedWeek={selectedWeek}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        {/* Route Table */}
        <RouteTable
          assignments={dayAssignments}
          isLoading={assignmentsLoading}
          selectedDate={selectedDate}
          onRefresh={refetchAssignments}
        />

        {/* Summary Cards */}
        <SummaryCards stats={stats} isLoading={statsLoading} />

        {/* Driver Hours Overview */}
        <DriversHoursOverview selectedDate={selectedDate} />

        {/* OR Tools Optimizer */}
        <ORToolsOptimizer />

        {/* Monthly Hours Tracking */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-medium text-secondary">
                  Monthly Hours Tracking
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track and manage driver monthly hours allocation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments && assignments.length > 0 ? (
                // Get unique driver names from assignments
                Array.from(new Set(assignments.map(a => a.driverName).filter((name): name is string => name !== null)))
                  .map(driverName => (
                    <MonthlyHoursTracker 
                      key={driverName} 
                      driverName={driverName!} 
                    />
                  ))
              ) : (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  No drivers found. Add some assignments to track monthly hours.
                </div>
              )}
            </div>
          </CardContent>
        </Card>


      </main>
    </div>
  );
}
