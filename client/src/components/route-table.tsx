import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Plus, 
  Edit, 
  Eye, 
  Trash2, 
  UserPlus,
  UserCheck,
  Route,
  User,
  UserX,
  ArrowUpDown
} from "lucide-react";
import type { RouteAssignmentView } from "@shared/schema";

interface RouteTableProps {
  assignments: RouteAssignmentView[];
  isLoading: boolean;
  selectedDate: Date;
  onRefresh: () => void;
}

export default function RouteTable({ 
  assignments, 
  isLoading, 
  selectedDate, 
  onRefresh 
}: RouteTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredAssignments = assignments.filter(assignment => 
    assignment.routeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.routeDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (assignment.driverName && assignment.driverName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aValue = a[sortColumn as keyof RouteAssignmentView];
    let bValue = b[sortColumn as keyof RouteAssignmentView];
    
    if (aValue === null) aValue = "";
    if (bValue === null) bValue = "";
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === "asc" ? comparison : -comparison;
    }
    
    return 0;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: string, hoursRemaining: string | null) => {
    if (status === "unassigned") {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          <UserX className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
    
    if (status === "critical" || (hoursRemaining && parseFloat(hoursRemaining) < 10)) {
      return (
        <Badge variant="destructive" className="bg-destructive/10 text-destructive">
          <div className="w-2 h-2 bg-destructive rounded-full mr-1" />
          Critical
        </Badge>
      );
    }
    
    if (hoursRemaining && parseFloat(hoursRemaining) < 30) {
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
          <div className="w-2 h-2 bg-warning rounded-full mr-1" />
          Low Hours
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success">
        <div className="w-2 h-2 bg-success rounded-full mr-1" />
        Assigned
      </Badge>
    );
  };

  const getHoursDisplay = (hoursRemaining: string | null, status: string) => {
    if (!hoursRemaining) {
      return <span className="text-muted-foreground">--</span>;
    }
    
    const hours = parseFloat(hoursRemaining);
    let className = "text-success";
    let badge = "hrs";
    
    if (hours < 10) {
      className = "text-destructive";
      badge = "critical";
    } else if (hours < 30) {
      className = "text-warning";
      badge = "low";
    }
    
    return (
      <div className="flex items-center">
        <div className={`text-sm font-medium ${className}`}>
          {hours.toFixed(1)}
        </div>
        <div className={`ml-2 px-2 py-1 bg-current/10 text-xs rounded-full ${className}`}>
          {badge}
        </div>
      </div>
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "short", 
      day: "numeric" 
    });
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="border-b border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-medium text-secondary">
              Route Assignments - {formatDate(selectedDate)}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {assignments.length} routes scheduled, {assignments.filter(a => a.driverId).length} drivers assigned
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search routes or drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Assignment
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead 
                  className="cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("routeNumber")}
                >
                  <div className="flex items-center">
                    Route Number
                    <ArrowUpDown className="w-4 h-4 ml-2 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("driverName")}
                >
                  <div className="flex items-center">
                    Driver Name
                    <ArrowUpDown className="w-4 h-4 ml-2 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("hoursRemaining")}
                >
                  <div className="flex items-center">
                    Hours Remaining
                    <ArrowUpDown className="w-4 h-4 ml-2 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("routeHours")}
                >
                  <div className="flex items-center">
                    Route Hours
                    <ArrowUpDown className="w-4 h-4 ml-2 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssignments.map((assignment, index) => (
                <TableRow 
                  key={assignment.id} 
                  className={`hover:bg-muted/50 transition-colors ${
                    index % 2 === 1 ? "bg-muted/20" : ""
                  }`}
                >
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <Route className="text-primary w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-secondary">
                          {assignment.routeNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {assignment.routeDescription}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        assignment.driverId 
                          ? assignment.hoursRemaining && parseFloat(assignment.hoursRemaining) < 10
                            ? "bg-destructive/10"
                            : assignment.hoursRemaining && parseFloat(assignment.hoursRemaining) < 30
                            ? "bg-warning/10"
                            : "bg-success/10"
                          : "bg-muted"
                      }`}>
                        {assignment.driverId ? (
                          <User className={`w-4 h-4 ${
                            assignment.hoursRemaining && parseFloat(assignment.hoursRemaining) < 10
                              ? "text-destructive"
                              : assignment.hoursRemaining && parseFloat(assignment.hoursRemaining) < 30
                              ? "text-warning"
                              : "text-success"
                          }`} />
                        ) : (
                          <UserX className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${
                          assignment.driverId ? "text-secondary" : "text-muted-foreground"
                        }`}>
                          {assignment.driverName || "Unassigned"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {assignment.driverCode || "--"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getHoursDisplay(assignment.hoursRemaining, assignment.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-secondary">
                      {assignment.routeHours} hrs
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(assignment.status, assignment.hoursRemaining)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {assignment.driverId ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary/80"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary/80"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {sortedAssignments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No assignments found for this date.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
