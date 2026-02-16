import React, { useEffect, useState } from "react";
import { 
  Trash2, 
  Plus, 
  Factory, 
  Edit3, 
  GripVertical,
  AlertTriangle
} from "lucide-react"; 
import { useGetLinesQuery, useCreateLineMutation, useUpdateLineMutation, useDeleteLineMutation, useReorderLinesMutation } from "@/store/api";
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
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function LinesPage() {
  const [lines, setLines] = useState([]);
  const [lineName, setLineName] = useState("");
  const [lineDescription, setLineDescription] = useState("");
  const [editingLine, setEditingLine] = useState(null);

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: linesRes } = useGetLinesQuery();
  const [createLineMutation, { isLoading: creating }] = useCreateLineMutation();
  const [updateLineMutation, { isLoading: updating }] = useUpdateLineMutation();
  const [deleteLineMutation, { isLoading: deleting }] = useDeleteLineMutation();
  const [reorderLinesMutation, { isLoading: reordering }] = useReorderLinesMutation();

  useEffect(() => {
    setLines(linesRes?.data || []);
  }, [linesRes]);

  const createLine = async () => {
    if (!lineName.trim()) {
      toast.error("Please enter a line name");
      return;
    }
    setLoading(true);
    try {
      await createLineMutation({ name: lineName.trim(), description: lineDescription.trim() }).unwrap();
      toast.success("Line created successfully");
      setLineName("");
      setLineDescription("");
      setOpenCreateDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to create line");
    } finally {
      setLoading(false);
    }
  };

  const updateLine = async () => {
    if (!editingLine || !lineName.trim()) {
      toast.error("Please enter a line name");
      return;
    }
    setLoading(true);
    try {
      await updateLineMutation({ id: editingLine._id, name: lineName.trim(), description: lineDescription.trim() }).unwrap();
      toast.success("Line updated successfully");
      setLineName("");
      setLineDescription("");
      setEditingLine(null);
      setOpenEditDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to update line");
    } finally {
      setLoading(false);
    }
  };

  const deleteLine = async (line) => {
    setLoading(true);
    try {
      await deleteLineMutation(line._id).unwrap();
      toast.success("Line deleted successfully");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to delete line");
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(lines);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Optimistically update UI
    setLines(items);

    try {
      // Send new order to backend
      const lineIds = items.map(line => line._id);
      await reorderLinesMutation({ lineIds }).unwrap();
      toast.success("Lines reordered successfully");
    } catch (err) {
      toast.error("Failed to save new order");
    }
  };

  const openEditLine = (line) => {
    setEditingLine(line);
    setLineName(line.name);
    setLineDescription(line.description || "");
    setOpenEditDialog(true);
  };

  const resetCreateForm = () => {
    setLineName("");
    setLineDescription("");
    setOpenCreateDialog(false);
  };

  const resetEditForm = () => {
    setLineName("");
    setLineDescription("");
    setEditingLine(null);
    setOpenEditDialog(false);
  };

  const renderLinesList = () => {
    if (!lines.length) {
      return (
        <div className="text-center py-12">
          <Factory className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg mb-4">No production lines created yet</p>
          <Button onClick={() => setOpenCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Line
          </Button>
        </div>
      );
    }

    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="lines">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {lines.map((line, index) => (
                <Draggable key={line._id} draggableId={line._id} index={index}>
                  {(provided, snapshot) => (
                    <Card 
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`group transition-all duration-200 ${
                        snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
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

                          {/* Line Icon */}
                          <div className="p-2 rounded-full bg-primary/10">
                            <Factory className="h-5 w-5 text-primary" />
                          </div>

                          {/* Line Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg">{line.name}</h3>
                              <Badge variant={line.isActive ? "default" : "secondary"}>
                                {line.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            {line.description && (
                              <p className="text-sm text-muted-foreground mt-1">{line.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Order: {line.order || index + 1} • Created {new Date(line.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEditLine(line)}
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
                                  <AlertDialogTitle>Delete Line</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the production line "{line.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteLine(line)}
                                  >
                                    Delete Line
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
          <h1 className="text-3xl font-bold tracking-tight">Production Lines</h1>
          <p className="text-muted-foreground">Manage production lines and their order</p>
        </div>
        <Button onClick={() => setOpenCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Production Line
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lines</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lines.length}</div>
            <p className="text-xs text-muted-foreground">
              {lines.filter(l => l.isActive).length} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lines List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Production Lines
          </CardTitle>
          <CardDescription>
            Drag and drop to reorder lines. Click edit to modify line details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderLinesList()}
        </CardContent>
      </Card>

      {/* Create Line Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Production Line</DialogTitle>
            <DialogDescription>
              Add a new production line to your system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Line Name</Label>
              <Input
                id="name"
                placeholder="e.g., Assembly Line A, Packaging Line 1"
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createLine()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the production line..."
                value={lineDescription}
                onChange={(e) => setLineDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCreateForm}>
              Cancel
            </Button>
            <Button onClick={createLine} disabled={loading}>
              {loading ? "Creating..." : "Create Line"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Line Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Production Line</DialogTitle>
            <DialogDescription>
              Update production line information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Line Name</Label>
              <Input
                id="editName"
                placeholder="Production line name"
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && updateLine()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                placeholder="Brief description..."
                value={lineDescription}
                onChange={(e) => setLineDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetEditForm}>
              Cancel
            </Button>
            <Button onClick={updateLine} disabled={loading}>
              {loading ? "Updating..." : "Update Line"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
