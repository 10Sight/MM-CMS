import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetDepartmentsQuery,
  useGetLinesQuery,
  useGetMachinesQuery,
  useCreateMachineMutation,
  useDeleteMachineMutation,
} from "@/store/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Factory, Cog, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function DepartmentLineMachinesPage() {
  const { id: departmentId, lineId } = useParams();
  const navigate = useNavigate();

  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 });
  const { data: linesRes } = useGetLinesQuery({ department: departmentId });
  const { data: machinesRes } = useGetMachinesQuery({ department: departmentId, line: lineId });

  const [machineName, setMachineName] = useState("");
  const [machineDescription, setMachineDescription] = useState("");
  const [createMachine] = useCreateMachineMutation();
  const [deleteMachine] = useDeleteMachineMutation();

  // Local loading states to prevent double submissions
  const [creatingMachine, setCreatingMachine] = useState(false);
  const [deletingMachineId, setDeletingMachineId] = useState(null);

  const department = useMemo(() => {
    return (deptRes?.data?.departments || []).find((d) => d._id === departmentId);
  }, [deptRes, departmentId]);

  const line = useMemo(() => {
    const list = Array.isArray(linesRes?.data) ? linesRes.data : [];
    return list.find((l) => l._id === lineId);
  }, [linesRes, lineId]);

  const machines = useMemo(() => {
    return Array.isArray(machinesRes?.data) ? machinesRes.data : [];
  }, [machinesRes]);

  const handleCreateMachine = async () => {
    const name = machineName.trim();
    if (!name) {
      toast.error("Please enter a machine name");
      return;
    }
    try {
      setCreatingMachine(true);
      await createMachine({
        name,
        description: machineDescription.trim(),
        department: departmentId,
        line: lineId,
      }).unwrap();
      toast.success("Machine created successfully");
      setMachineName("");
      setMachineDescription("");
    } catch (err) {
      console.error("Failed to create machine", err);
      toast.error(err?.data?.message || err?.message || "Failed to create machine");
    } finally {
      setCreatingMachine(false);
    }
  };

  const handleDeleteMachine = async (machineId) => {
    try {
      setDeletingMachineId(machineId);
      await deleteMachine(machineId).unwrap();
    } catch (err) {
      console.error("Failed to delete machine", err);
    } finally {
      setDeletingMachineId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/departments/${departmentId}`)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Department
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {department?.name || "Department"}
              <span className="text-muted-foreground">/</span>
              <Factory className="h-4 w-4 text-muted-foreground" />
              <span className="text-base font-medium">{line?.name || "Line"}</span>
            </h1>
            <p className="text-muted-foreground">
              Create and manage machines for this line in the department.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="h-5 w-5" />
            Machines on this line
          </CardTitle>
          <CardDescription>
            Machines created here will be linked to both the department and the selected line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              placeholder="Machine name (e.g., Press 1)"
              value={machineName}
              onChange={(e) => setMachineName(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={machineDescription}
              onChange={(e) => setMachineDescription(e.target.value)}
              rows={1}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreateMachine} disabled={creatingMachine}>
              {creatingMachine ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Adding...
                </span>
              ) : (
                "Add Machine"
              )}
            </Button>
          </div>
          <div className="space-y-2">
            {machines.length ? (
              machines.map((machine) => (
                <div
                  key={machine._id}
                  className="flex items-center justify-between border rounded-md px-3 py-2"
                >
                  <div>
                    <div className="font-medium">{machine.name}</div>
                    {machine.description && (
                      <div className="text-xs text-muted-foreground">{machine.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={machine.isActive ? "default" : "secondary"}>
                      {machine.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMachine(machine._id)}
                      disabled={deletingMachineId === machine._id}
                    >
                      {deletingMachineId === machine._id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <span>✕</span>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No machines defined for this line yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}