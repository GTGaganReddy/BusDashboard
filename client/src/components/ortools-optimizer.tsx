import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarDays, Settings, Play, CheckCircle, AlertTriangle, Users, Route } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ORToolsResult {
  status: 'optimal' | 'infeasible' | 'error';
  assignments?: Array<{
    driver_name: string;
    route_name: string;
    route_hours: number;
  }>;
  driver_status?: Array<{
    name: string;
    assigned_route: string | null;
    assigned_hours: number;
    remaining_hours: number;
  }>;
  unassigned_routes?: string[];
  statistics?: {
    total_routes: number;
    routes_assigned: number;
    routes_unassigned: number;
    total_hours_assigned: number;
    drivers_working: number;
    drivers_available: number;
  };
  objective_value?: number;
  message?: string;
}

export default function ORToolsOptimizer() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastSolution, setLastSolution] = useState<ORToolsResult | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current drivers for preview
  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ["/api/ortools/drivers"],
    queryFn: async () => {
      const response = await fetch("/api/ortools/drivers");
      if (!response.ok) throw new Error('Failed to fetch drivers');
      return response.json();
    },
  });

  // Fetch current routes for preview
  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ["/api/ortools/routes"],
    queryFn: async () => {
      const response = await fetch("/api/ortools/routes");
      if (!response.ok) throw new Error('Failed to fetch routes');
      return response.json();
    },
  });

  // Solve optimal assignment
  const solveMutation = useMutation({
    mutationFn: async (): Promise<ORToolsResult> => {
      const response = await fetch("/api/ortools/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error('Failed to solve assignment');
      return response.json();
    },
    onSuccess: (result: ORToolsResult) => {
      setLastSolution(result);
      if (result.status === 'optimal') {
        toast({
          title: "Optimization Complete",
          description: `Found optimal solution with ${result.assignments?.length || 0} assignments`,
        });
      } else {
        toast({
          title: "Optimization Failed",
          description: result.message || "No feasible solution found",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Optimization Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Apply solution to database
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!lastSolution) throw new Error("No solution to apply");
      
      const response = await fetch("/api/ortools/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solution: lastSolution,
          assignedDate: selectedDate
        }),
      });
      if (!response.ok) throw new Error('Failed to apply solution');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Solution Applied",
        description: `Assignments created for ${selectedDate}`,
      });
      
      // Refresh assignments and drivers data
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      setLastSolution(null);
    },
    onError: (error) => {
      toast({
        title: "Apply Failed",
        description: error instanceof Error ? error.message : "Failed to apply solution",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'default';
      case 'infeasible': return 'destructive';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <CardTitle>OR Tools Optimizer</CardTitle>
          </div>
          {lastSolution && (
            <Badge variant={getStatusColor(lastSolution.status)}>
              {lastSolution.status}
            </Badge>
          )}
        </div>
        <CardDescription>
          Optimize driver assignments using advanced algorithms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selection */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <label htmlFor="date" className="text-sm font-medium">
              Assignment Date:
            </label>
          </div>
          <input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-input rounded-md text-sm"
          />
        </div>

        {/* Current Data Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <Users className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-sm font-medium">Available Drivers</div>
              {driversLoading ? (
                <Skeleton className="h-4 w-12" />
              ) : (
                <div className="text-xs text-muted-foreground">
                  {drivers?.filter((d: any) => d.available_hours > 0).length || 0} with available hours
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <Route className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-sm font-medium">Available Routes</div>
              {routesLoading ? (
                <Skeleton className="h-4 w-12" />
              ) : (
                <div className="text-xs text-muted-foreground">
                  {routes?.length || 0} routes to assign
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            onClick={() => solveMutation.mutate()}
            disabled={solveMutation.isPending || driversLoading || routesLoading}
            className="flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>
              {solveMutation.isPending ? "Optimizing..." : "Optimize Assignments"}
            </span>
          </Button>
          
          {lastSolution && lastSolution.status === 'optimal' && (
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {applyMutation.isPending ? "Applying..." : "Apply Solution"}
              </span>
            </Button>
          )}
        </div>

        {/* Solution Results */}
        {lastSolution && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium">Optimization Results</h4>
            
            {lastSolution.status === 'optimal' && lastSolution.statistics && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Routes Assigned:</span>
                  <span className="ml-2 font-medium">
                    {lastSolution.statistics.routes_assigned}/{lastSolution.statistics.total_routes}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Hours:</span>
                  <span className="ml-2 font-medium">
                    {lastSolution.statistics.total_hours_assigned}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Drivers Working:</span>
                  <span className="ml-2 font-medium">
                    {lastSolution.statistics.drivers_working}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Efficiency:</span>
                  <span className="ml-2 font-medium">
                    {Math.round((lastSolution.statistics.routes_assigned / lastSolution.statistics.total_routes) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Assignments List */}
            {lastSolution.assignments && lastSolution.assignments.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Proposed Assignments:</h5>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {lastSolution.assignments.map((assignment, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                      <span className="font-medium">{assignment.driver_name}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{assignment.route_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {assignment.route_hours}h
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unassigned Routes */}
            {lastSolution.unassigned_routes && lastSolution.unassigned_routes.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {lastSolution.unassigned_routes.length} route(s) could not be assigned: {lastSolution.unassigned_routes.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {/* Error/Infeasible Messages */}
            {(lastSolution.status === 'error' || lastSolution.status === 'infeasible') && lastSolution.message && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {lastSolution.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}