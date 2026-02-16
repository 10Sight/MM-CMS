import React, { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  Grid3X3,
  Edit3,
  GripVertical,
} from "lucide-react";
import { useGetUnitsQuery, useCreateUnitMutation, useUpdateUnitMutation, useDeleteUnitMutation, useReorderUnitsMutation } from "@/store/api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
import OptimizedLoader from "@/components/ui/OptimizedLoader";
import { useAuth, getRoleBasedRedirect } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

export default function UnitsPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <OptimizedLoader />;

  if (!user || user.role !== "superadmin") {
    const redirectTo = getRoleBasedRedirect(user?.role);
    return <Navigate to={redirectTo} replace />;
  }

  const [units, setUnits] = useState([]);
  const [unitName, setUnitName] = useState("");
  const [unitDescription, setUnitDescription] = useState("");
  const [editingUnit, setEditingUnit] = useState(null);

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: unitsRes } = useGetUnitsQuery();
  const [createUnitMutation] = useCreateUnitMutation();
  const [updateUnitMutation] = useUpdateUnitMutation();
  const [deleteUnitMutation] = useDeleteUnitMutation();
  const [reorderUnitsMutation] = useReorderUnitsMutation();

  useEffect(() => {
    setUnits(unitsRes?.data || []);
  }, [unitsRes]);

  const createUnit = async () => {
    if (!unitName.trim()) {
      toast.error("Please enter a unit name");
      return;
    }
    setLoading(true);
    try {
      await createUnitMutation({ name: unitName.trim(), description: unitDescription.trim() }).unwrap();
      toast.success("Unit created successfully");
      setUnitName("");
      setUnitDescription("");
      setOpenCreateDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to create unit");
    } finally {
      setLoading(false);
    }
  };

  const updateUnit = async () => {
    if (!editingUnit || !unitName.trim()) {
      toast.error("Please enter a unit name");
      return;
    }
    setLoading(true);
    try {
      await updateUnitMutation({ id: editingUnit._id, name: unitName.trim(), description: unitDescription.trim() }).unwrap();
      toast.success("Unit updated successfully");
      setUnitName("");
      setUnitDescription("");
      setEditingUnit(null);
      setOpenEditDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to update unit");
    } finally {
      setLoading(false);
    }
  };

  const deleteUnit = async (unit) => {
    setLoading(true);
    try {
      await deleteUnitMutation(unit._id).unwrap();
      toast.success("Unit deleted successfully");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to delete unit");
    } finally {
      setLoading(false);
    }
  };

  const openEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitName(unit.name);
    setUnitDescription(unit.description || "");
    setOpenEditDialog(true);
  };

  const resetCreateForm = () => {
    setUnitName("");
    setUnitDescription("");
    setOpenCreateDialog(false);
  };

  const resetEditForm = () => {
    setUnitName("");
    setUnitDescription("");
    setEditingUnit(null);
    setOpenEditDialog(false);
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(units);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Optimistically update UI
    setUnits(items);

    try {
      const unitIds = items.map((unit) => unit._id);
      await reorderUnitsMutation({ unitIds }).unwrap();
      toast.success("Units reordered successfully");
    } catch (err) {
      toast.error("Failed to save new order");
    }
  };

  const renderUnitsList = () => {
    if (!units.length) {
      return (
        <div className="text-center py-12">
          <Grid3X3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg mb-4">No units defined yet</p>
          <Button onClick={() => setOpenCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Unit
          </Button>
        </div>
      );
    }

    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="units">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {units.map((unit, index) => (
                <Draggable key={unit._id} draggableId={unit._id} index={index}>
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`group transition-all duration-200 ${
                        snapshot.isDragging ? "shadow-lg rotate-2" : "hover:shadow-md"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                          </div>

                          {/* Unit Icon */}
                          <div className="p-2 rounded-full bg-primary/10">
                            <Grid3X3 className="h-5 w-5 text-primary" />
                          </div>

                          {/* Unit Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg">{unit.name}</h3>
                              <Badge variant={unit.isActive ? "default" : "secondary"}>
                                {unit.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            {unit.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {unit.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Order: {unit.order || index + 1} • Created {new Date(unit.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditUnit(unit)}
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
                                  <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the unit "{unit.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteUnit(unit)}
                                  >
                                    Delete Unit
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units</h1>
          <p className="text-muted-foreground">Manage production units or sub-categories</p>
        </div>
        <Button onClick={() => setOpenCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Unit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{units.length}</div>
            <p className="text-xs text-muted-foreground">
              {units.filter(u => u.isActive).length} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Units List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Units
          </CardTitle>
          <CardDescription>
            Manage your production units or logical sub-categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderUnitsList()}
        </CardContent>
      </Card>

      {/* Create Unit Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Unit</DialogTitle>
            <DialogDescription>
              Add a new unit to your system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Unit Name</Label>
              <Input
                id="name"
                placeholder="e.g., Workstation A, Module 1"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createUnit()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the unit..."
                value={unitDescription}
                onChange={(e) => setUnitDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCreateForm}>
              Cancel
            </Button>
            <Button onClick={createUnit} disabled={loading}>
              {loading ? "Creating..." : "Create Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>
              Update unit information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Unit Name</Label>
              <Input
                id="editName"
                placeholder="Unit name"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && updateUnit()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                placeholder="Brief description..."
                value={unitDescription}
                onChange={(e) => setUnitDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetEditForm}>
              Cancel
            </Button>
            <Button onClick={updateUnit} disabled={loading}>
              {loading ? "Updating..." : "Update Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
