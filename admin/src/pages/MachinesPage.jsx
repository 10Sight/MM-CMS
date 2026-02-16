import React, { useEffect, useState } from "react";
import { 
  Trash2, 
  Plus, 
  Cog, 
  Edit3, 
  AlertTriangle
} from "lucide-react"; 
import { useGetMachinesQuery, useCreateMachineMutation, useUpdateMachineMutation, useDeleteMachineMutation } from "@/store/api";
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

export default function MachinesPage() {
  const [machines, setMachines] = useState([]);
  const [machineName, setMachineName] = useState("");
  const [machineDescription, setMachineDescription] = useState("");
  const [editingMachine, setEditingMachine] = useState(null);

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: machinesRes } = useGetMachinesQuery();
  const [createMachineMutation] = useCreateMachineMutation();
  const [updateMachineMutation] = useUpdateMachineMutation();
  const [deleteMachineMutation] = useDeleteMachineMutation();

  useEffect(() => {
    setMachines(machinesRes?.data || []);
  }, [machinesRes]);

  const createMachine = async () => {
    if (!machineName.trim()) {
      toast.error("Please enter a machine name");
      return;
    }
    setLoading(true);
    try {
      await createMachineMutation({ name: machineName.trim(), description: machineDescription.trim() }).unwrap();
      toast.success("Machine created successfully");
      setMachineName("");
      setMachineDescription("");
      setOpenCreateDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to create machine");
    } finally {
      setLoading(false);
    }
  };

  const updateMachine = async () => {
    if (!editingMachine || !machineName.trim()) {
      toast.error("Please enter a machine name");
      return;
    }
    setLoading(true);
    try {
      await updateMachineMutation({ id: editingMachine._id, name: machineName.trim(), description: machineDescription.trim() }).unwrap();
      toast.success("Machine updated successfully");
      setMachineName("");
      setMachineDescription("");
      setEditingMachine(null);
      setOpenEditDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to update machine");
    } finally {
      setLoading(false);
    }
  };

  const deleteMachine = async (machine) => {
    setLoading(true);
    try {
      await deleteMachineMutation(machine._id).unwrap();
      toast.success("Machine deleted successfully");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to delete machine");
    } finally {
      setLoading(false);
    }
  };

  const openEditMachine = (machine) => {
    setEditingMachine(machine);
    setMachineName(machine.name);
    setMachineDescription(machine.description || "");
    setOpenEditDialog(true);
  };

  const resetCreateForm = () => {
    setMachineName("");
    setMachineDescription("");
    setOpenCreateDialog(false);
  };

  const resetEditForm = () => {
    setMachineName("");
    setMachineDescription("");
    setEditingMachine(null);
    setOpenEditDialog(false);
  };

  const renderMachinesList = () => {
    if (!machines.length) {
      return (
        <div className="text-center py-12">
          <Cog className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg mb-4">No machines registered yet</p>
          <Button onClick={() => setOpenCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Register First Machine
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {machines.map((machine) => (
          <Card key={machine._id} className="group hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Cog className="h-6 w-6 text-primary" />
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openEditMachine(machine)}
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
                        <AlertDialogTitle>Delete Machine</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the machine "{machine.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteMachine(machine)}
                        >
                          Delete Machine
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{machine.name}</h3>
                {machine.description && (
                  <p className="text-sm text-muted-foreground">{machine.description}</p>
                )}
                
                <div className="flex items-center justify-between pt-4">
                  <Badge variant={machine.isActive ? "default" : "secondary"}>
                    {machine.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground pt-2">
                  Created {new Date(machine.createdAt).toLocaleDateString()}
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
          <h1 className="text-3xl font-bold tracking-tight">Machines</h1>
          <p className="text-muted-foreground">Manage production machines and equipment</p>
        </div>
        <Button onClick={() => setOpenCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Machine
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Machines</CardTitle>
            <Cog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machines.length}</div>
            <p className="text-xs text-muted-foreground">
              {machines.filter(m => m.isActive).length} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Machines List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="h-5 w-5" />
            Machines
          </CardTitle>
          <CardDescription>
            Manage your production machines and equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderMachinesList()}
        </CardContent>
      </Card>

      {/* Create Machine Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Machine</DialogTitle>
            <DialogDescription>
              Add a new machine to your production system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Machine Name</Label>
              <Input
                id="name"
                placeholder="e.g., CNC Machine, Injection Molding Unit"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createMachine()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the machine..."
                value={machineDescription}
                onChange={(e) => setMachineDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCreateForm}>
              Cancel
            </Button>
            <Button onClick={createMachine} disabled={loading}>
              {loading ? "Creating..." : "Register Machine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Machine Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Machine</DialogTitle>
            <DialogDescription>
              Update machine information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Machine Name</Label>
              <Input
                id="editName"
                placeholder="Machine name"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && updateMachine()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                placeholder="Brief description..."
                value={machineDescription}
                onChange={(e) => setMachineDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetEditForm}>
              Cancel
            </Button>
            <Button onClick={updateMachine} disabled={loading}>
              {loading ? "Updating..." : "Update Machine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
