import React, { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Plus,
  Building2,
  Edit3,
  Settings,
  Users,
  AlertTriangle,
  UserCheck,
  BarChart3,
  Grid3X3,
} from "lucide-react";
import {
  useGetDepartmentsQuery,
  useGetAllUsersQuery,
  useGetDepartmentStatsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useAssignEmployeeToDepartmentMutation,
  useGetUnitsQuery,
} from "@/store/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function DepartmentPage() {
  const navigate = useNavigate();
  const { user, activeUnitId } = useAuth();
  const isSuperadmin = user?.role === "superadmin";

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [units, setUnits] = useState([]);

  const [departmentName, setDepartmentName] = useState("");
  const [departmentDescription, setDepartmentDescription] = useState("");
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedTransferDepartment, setSelectedTransferDepartment] = useState("");
  const [includeAssigned, setIncludeAssigned] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  const [loading, setLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const departmentQueryParams = useMemo(() => {
    const params = { page: 1, limit: 1000 };
    if (isSuperadmin && activeUnitId) {
      params.unit = activeUnitId;
    } else if (!isSuperadmin && user?.unit) {
      // For admins, explicitly pass their unit if available, though backend also enforces it
      params.unit = user.unit?._id || user.unit;
    }
    return params;
  }, [isSuperadmin, activeUnitId, user]);

  const { data: deptRes } = useGetDepartmentsQuery(departmentQueryParams);
  const { data: usersRes } = useGetAllUsersQuery({ page: 1, limit: 1000 });
  const { data: statsRes } = useGetDepartmentStatsQuery(
    isSuperadmin && activeUnitId ? { unit: activeUnitId } : {}
  );
  const { data: unitsRes } = useGetUnitsQuery(undefined, { skip: !isSuperadmin });
  const [createDepartmentMutation] = useCreateDepartmentMutation();
  const [updateDepartmentMutation] = useUpdateDepartmentMutation();
  const [deleteDepartmentMutation] = useDeleteDepartmentMutation();
  const [assignEmployeeMutation] = useAssignEmployeeToDepartmentMutation();

  useEffect(() => {
    setDepartments(deptRes?.data?.departments || []);
    setEmployees(Array.isArray(usersRes?.data?.users) ? usersRes.data.users : []);
    setStats(statsRes?.data || {});

    if (isSuperadmin) {
      setUnits(Array.isArray(unitsRes?.data) ? unitsRes.data : []);
    } else {
      setUnits([]);
    }
  }, [deptRes, usersRes, statsRes, unitsRes, isSuperadmin]);

  const statusSummary = useMemo(() => {
    const total = stats.summary?.totalDepartments || 0;
    const active = stats.summary?.activeDepartments || 0;

    if (!total) {
      return {
        label: 'No data',
        colorClass: 'text-muted-foreground',
        description: 'No departments configured yet',
      };
    }

    const ratio = active / total;
    if (ratio >= 0.9) {
      return {
        label: 'Healthy',
        colorClass: 'text-green-600',
        description: `${active} of ${total} departments active`,
      };
    }

    if (ratio >= 0.6) {
      return {
        label: 'Attention',
        colorClass: 'text-amber-600',
        description: `${active} of ${total} departments active`,
      };
    }

    return {
      label: 'Critical',
      colorClass: 'text-red-600',
      description: `Only ${active} of ${total} departments active`,
    };
  }, [stats]);

  const { unassignedEmployees, assignedEmployees } = useMemo(() => {
    const onlyEmployees = (employees || []).filter((u) => (u.role?.toLowerCase?.() || "") === "employee");
    return {
      unassignedEmployees: onlyEmployees.filter((u) => !u.department),
      assignedEmployees: onlyEmployees.filter((u) => !!u.department),
    };
  }, [employees]);

  const unitScopeLabel = useMemo(() => {
    if (isSuperadmin) {
      if (!activeUnitId) return 'All Units';
      const selected = units.find((u) => String(u._id) === String(activeUnitId));
      return selected?.name || `Unit (${activeUnitId})`;
    }
    const nameFromUser = user?.unit?.name;
    const userUnitId = user?.unit?._id || user?.unit || '';
    if (nameFromUser) return nameFromUser;
    if (userUnitId) return `Unit (${userUnitId})`;
    return 'Your unit';
  }, [isSuperadmin, activeUnitId, user, units]);

  // CRUD Operations
  const createDepartment = async () => {
    const trimmedName = departmentName.trim();
    const trimmedDescription = departmentDescription.trim();

    if (!trimmedName) {
      toast.error("Please enter a department name");
      return;
    }

    if (isSuperadmin && !selectedUnitId) {
      toast.error("Please select a unit");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: trimmedName,
        description: trimmedDescription,
      };

      if (isSuperadmin) {
        payload.unit = selectedUnitId;
      }

      await createDepartmentMutation(payload).unwrap();
      toast.success("Department created successfully");
      setDepartmentName("");
      setDepartmentDescription("");
      setSelectedUnitId("");
      setOpenCreateDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  const updateDepartment = async () => {
    if (!editingDepartment || !departmentName.trim()) {
      toast.error("Please enter a department name");
      return;
    }
    setLoading(true);
    try {
      await updateDepartmentMutation({ id: editingDepartment._id, name: departmentName.trim(), description: departmentDescription.trim() }).unwrap();
      toast.success("Department updated successfully");
      setDepartmentName("");
      setDepartmentDescription("");
      setEditingDepartment(null);
      setOpenEditDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to update department");
    } finally {
      setLoading(false);
    }
  };

  const deleteDepartment = async (department) => {
    setLoading(true);
    try {
      const payload = {};
      if (selectedTransferDepartment) {
        payload.transferToDepartmentId = selectedTransferDepartment;
      }
      await deleteDepartmentMutation({ id: department._id, payload }).unwrap();
      toast.success("Department deleted successfully");
      setOpenDeleteDialog(false);
      setDepartmentToDelete(null);
      setSelectedTransferDepartment("");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to delete department");
    } finally {
      setLoading(false);
    }
  };

  const assignEmployeeToDepartment = async () => {
    if (!selectedEmployee || !selectedDepartment) {
      toast.error("Please select both employee and department");
      return;
    }
    setAssignLoading(true);
    try {
      await assignEmployeeMutation({ employeeId: selectedEmployee, departmentId: selectedDepartment }).unwrap();
      toast.success("Employee assigned successfully");
      setSelectedEmployee("");
      setSelectedDepartment("");
      setOpenAssignDialog(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to assign employee");
    } finally {
      setAssignLoading(false);
    }
  };

  const openEditDepartment = (department) => {
    setEditingDepartment(department);
    setDepartmentName(department.name);
    setDepartmentDescription(department.description || "");
    setOpenEditDialog(true);
  };

  const openDeleteConfirm = (department) => {
    setDepartmentToDelete(department);
    setOpenDeleteDialog(true);
  };

  const resetCreateForm = () => {
    setDepartmentName("");
    setDepartmentDescription("");
    setSelectedUnitId("");
    setOpenCreateDialog(false);
  };

  const resetEditForm = () => {
    setDepartmentName("");
    setDepartmentDescription("");
    setEditingDepartment(null);
    setOpenEditDialog(false);
  };

  const renderDepartmentList = () => {
    if (!departments.length) {
      return (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg mb-4">No departments created yet</p>
          <Button onClick={() => setOpenCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Department
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => (
          <Card
            key={department._id}
            className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/admin/departments/${department._id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate(`/admin/departments/${department._id}`)
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/departments/${department._id}`); }}
                    title="View members"
                    aria-label="View members"
                  >
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Members</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); openEditDepartment(department); }}
                    title="Edit department"
                    aria-label="Edit department"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); openDeleteConfirm(department); }}
                    className="text-destructive hover:text-destructive"
                    title="Delete department"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{department.name}</h3>
                {department.description && (
                  <p className="text-sm text-muted-foreground">{department.description}</p>
                )}

                {department.unit && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Grid3X3 className="h-4 w-4" />
                    <span>
                      {typeof department.unit === "string"
                        ? department.unit
                        : department.unit?.name || "N/A"}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{department.employeeCount || 0}</span>
                    <span className="text-sm text-muted-foreground">auditors</span>
                  </div>

                  <Badge variant={department.isActive ? "default" : "secondary"}>
                    {department.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground pt-2">
                  Created {new Date(department.createdAt).toLocaleDateString()}
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
          <h1 className="text-3xl font-bold tracking-tight">Department Management</h1>
          <p className="text-muted-foreground">Create and manage company departments, assign auditors</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current unit scope: <span className="font-medium text-foreground">{unitScopeLabel}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setOpenAssignDialog(true)} variant="outline">
            <UserCheck className="mr-2 h-4 w-4" />
            Assign Auditor
          </Button>
          <Button onClick={() => setOpenCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary?.totalDepartments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.summary?.activeDepartments || 0} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Auditors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary?.employeeRoleCount ?? stats.summary?.totalEmployees ?? 0}</div>
            <p className="text-xs text-muted-foreground">Auditors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Department</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.summary?.totalDepartments > 0
                ? Math.round((stats.summary?.totalEmployees || 0) / stats.summary.totalDepartments)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Auditors per dept</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statusSummary.colorClass}`}>
              {statusSummary.label}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statusSummary.description}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Departments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Departments
          </CardTitle>
          <CardDescription>
            Manage your organization's departments and their assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderDepartmentList()}
        </CardContent>
      </Card>

      {/* Create Department Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
            <DialogDescription>
              Add a new department to your organization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                placeholder="e.g., Human Resources, Production, IT"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createDepartment()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the department's role..."
                value={departmentDescription}
                onChange={(e) => setDepartmentDescription(e.target.value)}
                rows={3}
              />
            </div>

            {isSuperadmin && (
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={selectedUnitId}
                  onValueChange={setSelectedUnitId}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit._id} value={unit._id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCreateForm}>
              Cancel
            </Button>
            <Button onClick={createDepartment} disabled={loading}>
              {loading ? "Creating..." : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Department Name</Label>
              <Input
                id="editName"
                placeholder="Department name"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && updateDepartment()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                placeholder="Brief description..."
                value={departmentDescription}
                onChange={(e) => setDepartmentDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetEditForm}>
              Cancel
            </Button>
            <Button onClick={updateDepartment} disabled={loading}>
              {loading ? "Updating..." : "Update Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Employee Dialog */}
      <Dialog open={openAssignDialog} onOpenChange={setOpenAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Auditor to Department</DialogTitle>
            <DialogDescription>
              Unassigned auditors are shown by default. Enable the option below to reassign auditors already in a department.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Include already-assigned</p>
                <p className="text-xs text-muted-foreground">Allows reassigning auditors who already belong to a department</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground select-none">
                <Checkbox
                  checked={includeAssigned}
                  onCheckedChange={(v) => setIncludeAssigned(Boolean(v))}
                  aria-label="Include already-assigned employees"
                />
                Include assigned
              </label>
            </div>

            <div className="grid gap-2">
              <Label>Select Auditor</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an auditor" />
                </SelectTrigger>
                <SelectContent>
                  {(includeAssigned ? unassignedEmployees.concat(assignedEmployees) : unassignedEmployees).map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.fullName} ({employee.employeeId})
                      {employee.department && (
                        <span className="text-muted-foreground ml-2">– {employee.department?.name || "Assigned"}</span>
                      )}
                    </SelectItem>
                  ))}
                  {(!unassignedEmployees.length && !includeAssigned) && (
                    <SelectItem value="__none__" disabled>
                      All auditors are already assigned to a department
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Select Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department._id} value={department._id}>
                      {department.name} ({department.employeeCount || 0} auditors)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={assignEmployeeToDepartment} disabled={assignLoading}>
              {assignLoading ? "Assigning..." : includeAssigned ? "Assign / Reassign" : "Assign Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to delete the department "{departmentToDelete?.name}"?
                </p>
                {departmentToDelete?.employeeCount > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="font-medium text-yellow-800">
                        This department has {departmentToDelete.employeeCount} auditor(s)
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label>Transfer auditors to:</Label>
                      <Select value={selectedTransferDepartment} onValueChange={setSelectedTransferDepartment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department to transfer auditors" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments
                            .filter(dept => dept._id !== departmentToDelete?._id)
                            .map((department) => (
                              <SelectItem key={department._id} value={department._id}>
                                {department.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDepartment(departmentToDelete)}
              disabled={departmentToDelete?.employeeCount > 0 && !selectedTransferDepartment}
            >
              {loading ? "Deleting..." : "Delete Department"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
