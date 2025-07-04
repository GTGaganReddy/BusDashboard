import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, TestTube, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface SyncStatus {
  configured: boolean;
  lastSync: string | null;
}

interface SyncResult {
  message: string;
  success: boolean;
  updatedCount: number;
  updates: Array<{
    driverName: string;
    currentHours: number;
    newRemainingHours: number;
  }>;
}

export default function ORToolsSyncConfig() {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const { toast } = useToast();

  // Get sync status
  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/or-tools/status"],
    queryFn: async () => {
      const response = await fetch("/api/or-tools/status");
      if (!response.ok) throw new Error('Failed to fetch sync status');
      return response.json();
    },
  });

  // Configure OR tools sync
  const configureMutation = useMutation({
    mutationFn: async (config: { baseUrl: string; apiKey?: string; authHeader?: string }) => {
      return await apiRequest("POST", "/api/or-tools/configure", config);
    },
    onSuccess: () => {
      toast({
        title: "OR Tools sync configured",
        description: "Successfully configured connection to OR Tools system.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/or-tools/status"] });
    },
    onError: (error) => {
      toast({
        title: "Configuration failed",
        description: "Failed to configure OR Tools sync. Please check your settings.",
        variant: "destructive",
      });
    },
  });

  // Test connection
  const testMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/or-tools/test", {});
    },
    onSuccess: () => {
      toast({
        title: "Connection successful",
        description: "Successfully connected to OR Tools system.",
      });
    },
    onError: () => {
      toast({
        title: "Connection failed",
        description: "Could not connect to OR Tools system. Check configuration.",
        variant: "destructive",
      });
    },
  });

  // Manual sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/or-tools/sync", { method: "POST" });
      if (!response.ok) throw new Error('Sync failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync completed",
        description: `Successfully updated ${data.updatedCount} drivers in OR Tools.`,
      });
    },
    onError: () => {
      toast({
        title: "Sync failed",
        description: "Manual sync to OR Tools failed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfigure = () => {
    if (!baseUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter the OR Tools API base URL.",
        variant: "destructive",
      });
      return;
    }

    configureMutation.mutate({
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim() || undefined,
      authHeader: authHeader.trim() || undefined,
    });
  };

  const handleTest = () => {
    if (!syncStatus?.configured) {
      toast({
        title: "Not configured",
        description: "Please configure OR Tools sync first.",
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate();
  };

  const handleSync = () => {
    if (!syncStatus?.configured) {
      toast({
        title: "Not configured",
        description: "Please configure OR Tools sync first.",
        variant: "destructive",
      });
      return;
    }
    syncMutation.mutate();
  };

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>OR Tools Synchronization</span>
          </CardTitle>
          <CardDescription>Loading sync status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <CardTitle>OR Tools Synchronization</CardTitle>
          </div>
          <Badge variant={syncStatus?.configured ? "default" : "secondary"}>
            {syncStatus?.configured ? (
              <><CheckCircle className="w-3 h-3 mr-1" />Configured</>
            ) : (
              <><XCircle className="w-3 h-3 mr-1" />Not Configured</>
            )}
          </Badge>
        </div>
        <CardDescription>
          Automatically sync driver hours to your OR Tools application when assignments change
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Connection Settings</h4>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="baseUrl">OR Tools API Base URL *</Label>
              <Input
                id="baseUrl"
                placeholder="https://your-or-tools-app.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={configureMutation.isPending}
              />
            </div>
            
            <div>
              <Label htmlFor="apiKey">API Key (optional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={configureMutation.isPending}
              />
            </div>
            
            <div>
              <Label htmlFor="authHeader">Authorization Header (optional)</Label>
              <Input
                id="authHeader"
                placeholder="Bearer your-token"
                value={authHeader}
                onChange={(e) => setAuthHeader(e.target.value)}
                disabled={configureMutation.isPending}
              />
            </div>
          </div>

          <Button
            onClick={handleConfigure}
            disabled={configureMutation.isPending}
            className="w-full"
          >
            {configureMutation.isPending ? "Configuring..." : "Save Configuration"}
          </Button>
        </div>

        <Separator />

        {/* Testing and Manual Sync Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Operations</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!syncStatus?.configured || testMutation.isPending}
              className="flex items-center space-x-2"
            >
              <TestTube className="w-4 h-4" />
              <span>{testMutation.isPending ? "Testing..." : "Test Connection"}</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={!syncStatus?.configured || syncMutation.isPending}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{syncMutation.isPending ? "Syncing..." : "Manual Sync"}</span>
            </Button>
          </div>
        </div>

        {/* Status Information */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>
              Automatic sync triggers when new assignments are created
            </span>
          </div>
          {syncStatus?.lastSync && (
            <div>
              Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
            </div>
          )}
        </div>

        {/* API Endpoints Info */}
        <div className="p-3 bg-muted rounded-lg">
          <h5 className="text-sm font-medium mb-2">OR Tools API Endpoints Used:</h5>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>GET /drivers - Fetch current driver hours</div>
            <div>PUT /drivers/&lt;name&gt; - Update individual driver hours</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}