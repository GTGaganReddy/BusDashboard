import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  X, 
  Clock,
  ExternalLink 
} from "lucide-react";

interface SyncResult {
  name: string;
  status: string;
  message?: string;
  monthlyHoursTotal?: number;
  hoursRemaining?: number;
}

export default function SyncManager() {
  const [externalUrl, setExternalUrl] = useState("");
  const [syncData, setSyncData] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const { toast } = useToast();

  // Export current drivers data
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sync/drivers");
      if (!response.ok) {
        throw new Error('Failed to export driver data');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSyncData(JSON.stringify(data, null, 2));
      setLastSync(data.syncTimestamp);
      toast({
        title: "Data exported successfully",
        description: `Exported ${data.totalDrivers} drivers with current hours.`,
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Failed to export driver data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Import drivers data from external system
  const importMutation = useMutation({
    mutationFn: async (driversData: any) => {
      return await apiRequest("POST", "/api/sync/drivers", driversData);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setSyncResults(data.results || []);
      setLastSync(data.syncTimestamp);
      
      // Invalidate queries to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      
      const successCount = data.results?.filter((r: any) => r.status === "updated").length || 0;
      
      toast({
        title: "Sync completed",
        description: `Successfully synced ${successCount} drivers.`,
      });
    },
    onError: () => {
      toast({
        title: "Sync failed",
        description: "Failed to sync driver data. Please check the format and try again.",
        variant: "destructive",
      });
    },
  });

  // Sync from external URL
  const syncFromUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch data from external URL');
      }
      const data = await response.json();
      
      // Import the fetched data
      return await apiRequest("POST", "/api/sync/drivers", data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setSyncResults(data.results || []);
      setLastSync(data.syncTimestamp);
      
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      
      const successCount = data.results?.filter((r: any) => r.status === "updated").length || 0;
      
      toast({
        title: "External sync completed",
        description: `Successfully synced ${successCount} drivers from external system.`,
      });
    },
    onError: () => {
      toast({
        title: "External sync failed",
        description: "Failed to sync from external URL. Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  const handleImportData = () => {
    try {
      const parsedData = JSON.parse(syncData);
      importMutation.mutate(parsedData);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check the JSON format and try again.",
        variant: "destructive",
      });
    }
  };

  const handleSyncFromUrl = () => {
    if (!externalUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a valid URL to sync from.",
        variant: "destructive",
      });
      return;
    }
    syncFromUrlMutation.mutate(externalUrl);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(syncData);
    toast({
      title: "Copied to clipboard",
      description: "Driver data has been copied to clipboard.",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Sync className="w-5 h-5" />
          <CardTitle>Driver Hours Sync Manager</CardTitle>
        </div>
        <CardDescription>
          Synchronize driver hours data between this system and external tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Export Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <h3 className="font-medium">Export Current Data</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Export current driver hours data to share with other systems
          </p>
          <Button 
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="w-full"
          >
            {exportMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            Export Driver Data
          </Button>
          
          {syncData && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="exportData">Exported Data (JSON)</Label>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  Copy to Clipboard
                </Button>
              </div>
              <Textarea
                id="exportData"
                value={syncData}
                readOnly
                className="h-32 font-mono text-xs"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Import Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <h3 className="font-medium">Import Data</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Import driver hours data from another system
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="importData">JSON Data to Import</Label>
            <Textarea
              id="importData"
              placeholder={`{
  "drivers": [
    {
      "name": "Driver Name",
      "monthlyHoursTotal": 174,
      "hoursUsed": 25.5
    }
  ]
}`}
              value={syncData}
              onChange={(e) => setSyncData(e.target.value)}
              className="h-32 font-mono text-xs"
            />
          </div>
          
          <Button 
            onClick={handleImportData}
            disabled={importMutation.isPending || !syncData.trim()}
            className="w-full"
          >
            {importMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            Import Data
          </Button>
        </div>

        <Separator />

        {/* Sync from URL Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <ExternalLink className="w-4 h-4" />
            <h3 className="font-medium">Sync from External URL</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Sync directly from another Replit project's sync endpoint
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="externalUrl">External System URL</Label>
            <Input
              id="externalUrl"
              placeholder="https://your-other-project.replit.dev/api/sync/drivers"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use: https://your-project-name.replit.dev/api/sync/drivers
            </p>
          </div>
          
          <Button 
            onClick={handleSyncFromUrl}
            disabled={syncFromUrlMutation.isPending || !externalUrl.trim()}
            className="w-full"
          >
            {syncFromUrlMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            Sync from URL
          </Button>
        </div>

        {/* Last Sync & Results */}
        {(lastSync || syncResults.length > 0) && (
          <>
            <Separator />
            <div className="space-y-3">
              {lastSync && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Last sync: {new Date(lastSync).toLocaleString()}</span>
                </div>
              )}
              
              {syncResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Sync Results</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {syncResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 rounded bg-muted">
                        <span className="font-medium">{result.name}</span>
                        <div className="flex items-center space-x-2">
                          {result.status === "updated" ? (
                            <>
                              <Badge variant="default" className="text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Updated
                              </Badge>
                              {result.hoursRemaining !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  {result.hoursRemaining}h remaining
                                </span>
                              )}
                            </>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <X className="w-3 h-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* API Reference */}
        <Separator />
        <div className="space-y-2">
          <h4 className="font-medium">API Endpoints for Integration</h4>
          <div className="text-xs text-muted-foreground space-y-1 font-mono bg-muted p-3 rounded">
            <div>GET /api/sync/drivers - Export current driver data</div>
            <div>POST /api/sync/drivers - Import driver data</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}