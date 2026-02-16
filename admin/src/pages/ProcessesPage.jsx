import React, { useEffect, useState } from "react";
import { 
  Trash2, 
  Plus, 
  Settings, 
  Edit3, 
  AlertTriangle
} from "lucide-react"; 
import { useGetProcessesQuery, useCreateProcessMutation, useUpdateProcessMutation, useDeleteProcessMutation } from "@/store/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ProcessesPage() {
  const [processes, setProcesses] = useState([]);
  const [processName, setProcessName] = useState("");
  const [processDescription, setProcessDescription] = useState("");
  const [editingProcess, setEditingProcess] = useState(null);

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: processesRes } = useGetProcessesQuery();
  const [createProcessMutation] = useCreateProcessMutation();
  const [updateProcessMutation] = useUpdateProcessMutation();
  const [deleteProcessMutation] = useDeleteProcessMutation();

  useEffect(() => {
    setProcesses(processesRes?.data || []);
  }, [processesRes]);

  const createProcess = async () => {
    if (!processName.trim()) {
      toast.error("Please enter a process name");
      return;
    }
    setLoading(true);
    try {
      await createProcessMutation({ name: processName.trim(), description: processDescription.trim() }).unwrap();
      toast.success("Process created successfully");
      setProcessName("");
      setProcessDescription("");
      setOpenCreateDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to create process");
    } finally {
      setLoading(false);
    }
  };

  const updateProcess = async () => {
    if (!editingProcess || !processName.trim()) {
      toast.error("Please enter a process name");
      return;
    }
    setLoading(true);
    try {
      await updateProcessMutation({ id: editingProcess._id, name: processName.trim(), description: processDescription.trim() }).unwrap();
      toast.success("Process updated successfully");
      setProcessName("");
      setProcessDescription("");
      setEditingProcess(null);
      setOpenEditDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to update process");
    } finally {
      setLoading(false);
    }
  };

  const deleteProcess = async (process) => {
    setLoading(true);
    try {
      await deleteProcessMutation(process._id).unwrap();
      toast.success("Process deleted successfully");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to delete process");
    } finally {
      setLoading(false);
    }
  };

  const openEditProcess = (process) => {
    setEditingProcess(process);
    setProcessName(process.name);
    setProcessDescription(process.description || "");
    setOpenEditDialog(true);
  };

  const resetCreateForm = () => {
    setProcessName("");
    setProcessDescription("");
    setOpenCreateDialog(false);
  };

  const resetEditForm = () => {
    setProcessName("");
    setProcessDescription("");
    setEditingProcess(null);
    setOpenEditDialog(false);
  };

  const renderProcessesList = () => {
    if (!processes.length) {
      return (
        <div className="text-center py-12">
          <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg mb-4">No processes defined yet</p>
          <Button onClick={() => setOpenCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Define First Process
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {processes.map((process) => (
          <Card key={process._id} className="group hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openEditProcess(process)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Process</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the process "{process.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteProcess(process)}
                        >
                          Delete Process
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{process.name}</h3>
                {process.description && (
                  <p className="text-sm text-muted-foreground">{process.description}</p>
                )}
                
                <div className="flex items-center justify-between pt-4">
                  <Badge variant={process.isActive ? "default" : "secondary"}>
                    {process.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground pt-2">
                  Created {new Date(process.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Processes</h1>
          <p className="text-muted-foreground">Manage production processes and workflows</p>
        </div>
        <Button onClick={() => setOpenCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Process
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processes.length}</div>
            <p className="text-xs text-muted-foreground">
              {processes.filter(p => p.isActive).length} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Processes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Processes
          </CardTitle>
          <CardDescription>
            Manage your production processes and workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderProcessesList()}
        </CardContent>
      </Card>

      {/* Create Process Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Define New Process</DialogTitle>
            <DialogDescription>
              Add a new process to your production system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Process Name</Label>
              <Input
                id="name"
                placeholder="e.g., Quality Inspection, Assembly, Testing"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createProcess()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the process..."
                value={processDescription}
                onChange={(e) => setProcessDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCreateForm}>
              Cancel
            </Button>
            <Button onClick={createProcess} disabled={loading}>
              {loading ? "Creating..." : "Define Process"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Process Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Process</DialogTitle>
            <DialogDescription>
              Update process information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Process Name</Label>
              <Input
                id="editName"
                placeholder="Process name"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && updateProcess()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                placeholder="Brief description..."
                value={processDescription}
                onChange={(e) => setProcessDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetEditForm}>
              Cancel
            </Button>
            <Button onClick={updateProcess} disabled={loading}>
              {loading ? "Updating..." : "Update Process"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
