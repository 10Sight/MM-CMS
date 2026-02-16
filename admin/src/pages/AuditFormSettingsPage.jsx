import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings2, ClipboardList, Info, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/utils/axios";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useGetDepartmentsQuery, useGetUnitsQuery } from "@/store/api";

export default function AuditFormSettingsPage() {
  const { user: currentUser, activeUnitId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [formTitle, setFormTitle] = useState("Part and Quality Audit Performance");

  const [lineLabel, setLineLabel] = useState("Line");
  const [linePlaceholder, setLinePlaceholder] = useState("Select Line");
  const [lineEnabled, setLineEnabled] = useState(true);

  const [machineLabel, setMachineLabel] = useState("Machine");
  const [machinePlaceholder, setMachinePlaceholder] = useState("Select Machine");
  const [machineEnabled, setMachineEnabled] = useState(true);

  const [selectedDepartment, setSelectedDepartment] = useState("");

  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1000, includeInactive: false });
  const departments = deptRes?.data?.departments || [];
  const { data: unitsRes } = useGetUnitsQuery();

  const userUnitId = currentUser?.unit?._id || currentUser?.unit || "";
  const role = currentUser?.role;
  const effectiveUnitId = role === 'superadmin'
    ? (activeUnitId || undefined)
    : (userUnitId || undefined);

  const filteredDepartments = useMemo(() => {
    if (effectiveUnitId) {
      return departments.filter((dept) => {
        const deptUnitId = typeof dept.unit === "object" ? dept.unit?._id : dept.unit;
        return deptUnitId && String(deptUnitId) === String(effectiveUnitId);
      });
    }
    return departments;
  }, [departments, effectiveUnitId]);

  // Persist selected department per admin in localStorage so it doesn't jump after refresh
  useEffect(() => {
    if (typeof window === "undefined") return;
    const STORAGE_KEY = "auditFormSettings.selectedDepartment";
    const stored = window.localStorage.getItem(STORAGE_KEY);

    // If we already have a department in state, don't override it here
    if (!selectedDepartment) {
      if (stored && filteredDepartments.some((d) => d._id === stored)) {
        setSelectedDepartment(stored);
      } else if (!stored && filteredDepartments.length > 0) {
        setSelectedDepartment(filteredDepartments[0]._id);
      }
    }
  }, [filteredDepartments, selectedDepartment]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const STORAGE_KEY = "auditFormSettings.selectedDepartment";
    if (selectedDepartment) {
      window.localStorage.setItem(STORAGE_KEY, selectedDepartment);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        if (!selectedDepartment) {
          // Reset to defaults when nothing is selected
          setFormTitle("Part and Quality Audit Performance");
          setLineLabel("Line");
          setLinePlaceholder("Select Line");
          setLineEnabled(true);
          setMachineLabel("Machine");
          setMachinePlaceholder("Select Machine");
          setMachineEnabled(true);
          setLastUpdated(null);
          return;
        }

        const res = await api.get("/api/audits/form-settings", {
          params: {
            department: selectedDepartment,
          },
        });
        const setting = res?.data?.data;
        if (!setting) {
          // No custom setting yet for this department/unit – show defaults
          setFormTitle("Part and Quality Audit Performance");
          setLineLabel("Line");
          setLinePlaceholder("Select Line");
          setLineEnabled(true);
          setMachineLabel("Machine");
          setMachinePlaceholder("Select Machine");
          setMachineEnabled(true);
          setLastUpdated(null);
          return;
        }

        setFormTitle(setting.formTitle || "Part and Quality Audit Performance");

        const lf = setting.lineField || {};
        setLineLabel(lf.label || "Line");
        setLinePlaceholder(lf.placeholder || "Select Line");
        setLineEnabled(lf.enabled !== false);

        const mf = setting.machineField || {};
        setMachineLabel(mf.label || "Machine");
        setMachinePlaceholder(mf.placeholder || "Select Machine");
        setMachineEnabled(mf.enabled !== false);

        const updatedAt = setting.updatedAt || setting.createdAt;
        if (updatedAt) {
          setLastUpdated(new Date(updatedAt));
        } else {
          setLastUpdated(null);
        }
      } catch (error) {
        // Silently ignore if settings not configured yet
        console.error("Failed to load audit form settings", error);
      }
    };

    fetchSettings();
  }, [selectedDepartment, userUnitId]);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      toast.error("Form title is required");
      return;
    }

    if (!selectedDepartment) {
      toast.error("Please select a department");
      return;
    }

    if (!lineEnabled && !machineEnabled) {
      toast.error("At least one of Line or Machine fields must be enabled");
      return;
    }

    setLoading(true);
    try {
      const res = await api.put("/api/audits/form-settings", {
        formTitle,
        lineField: {
          label: lineLabel,
          placeholder: linePlaceholder,
          enabled: lineEnabled,
        },
        machineField: {
          label: machineLabel,
          placeholder: machinePlaceholder,
          enabled: machineEnabled,
        },
        department: selectedDepartment,
        // unit is optional and only stored for reference now
        unit: effectiveUnitId,
      });

      const setting = res?.data?.data;
      if (setting) {
        const updatedAt = setting.updatedAt || setting.createdAt;
        if (updatedAt) {
          setLastUpdated(new Date(updatedAt));
        }
      }

      toast.success("Audit form settings updated");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update form settings";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const unitScopeLabel = useMemo(() => {
    if (role === 'superadmin') {
      if (!effectiveUnitId) return 'All Units';
      const units = unitsRes?.data || [];
      const selected = units.find((u) => String(u._id) === String(effectiveUnitId));
      return selected?.name || `Unit (${effectiveUnitId})`;
    }
    const nameFromUser = currentUser?.unit?.name;
    if (nameFromUser) return nameFromUser;
    if (userUnitId) return `Unit (${userUnitId})`;
    return 'Your unit';
  }, [role, effectiveUnitId, currentUser, userUnitId, unitsRes]);

  // Basic access guard (routes are already protected for admin role)
  if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Info className="mb-4 h-12 w-12 text-destructive" />
            <p className="text-lg font-medium text-destructive">Access Denied</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Inspection Form
              </span>
              <span className="block leading-tight">Employee inspection form layout</span>
            </span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Configure the title and Line/Machine fields shown on the employee inspection page.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current unit scope: <span className="font-medium text-foreground">{unitScopeLabel}</span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground md:items-end">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-[11px]">
            <Badge variant="outline" className="flex items-center gap-1 border-none px-0 text-[11px] font-medium">
              <ClipboardList className="h-3 w-3 text-primary" />
              Form layout active
            </Badge>
          </div>
          {lastUpdated && (
            <p className="text-[11px]">
              Last updated: <span className="font-medium text-foreground">{lastUpdated.toLocaleString()}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        {/* Main settings card */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-1 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <ClipboardList className="h-4 w-4 text-primary" />
              </span>
              <span>Form configuration</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Changes apply immediately to the employee inspection page.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-6" onSubmit={handleSave}>
              {/* Department selection */}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDepartments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Settings apply only to this department {userUnitId ? "in your unit" : ""}.
                </p>
              </div>

              {/* Form title */}
              <div className="space-y-2">
                <Label htmlFor="form-title">Form title</Label>
                <Input
                  id="form-title"
                  placeholder="e.g. Part and Quality Audit Performance"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This text appears as the main heading on the employee inspection page.
                </p>
              </div>

              <Separator className="my-4" />

              {/* Line configuration */}
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Line field</p>
                    <p className="text-xs text-muted-foreground">
                      Controls the label and placeholder for the Line selector. You can also hide this field.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Show field</span>
                    <Switch
                      checked={lineEnabled}
                      onCheckedChange={(val) => setLineEnabled(val)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={lineLabel}
                      onChange={(e) => setLineLabel(e.target.value)}
                      placeholder="Line"
                      className="h-8 text-sm"
                      disabled={!lineEnabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Placeholder</Label>
                    <Input
                      value={linePlaceholder}
                      onChange={(e) => setLinePlaceholder(e.target.value)}
                      placeholder="Select Line"
                      className="h-8 text-sm"
                      disabled={!lineEnabled}
                    />
                  </div>
                </div>
              </div>

              {/* Machine configuration */}
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Machine field</p>
                    <p className="text-xs text-muted-foreground">
                      Controls the label and placeholder for the Machine selector. You can also hide this field.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Show field</span>
                    <Switch
                      checked={machineEnabled}
                      onCheckedChange={(val) => setMachineEnabled(val)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={machineLabel}
                      onChange={(e) => setMachineLabel(e.target.value)}
                      placeholder="Machine"
                      className="h-8 text-sm"
                      disabled={!machineEnabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Placeholder</Label>
                    <Input
                      value={machinePlaceholder}
                      onChange={(e) => setMachinePlaceholder(e.target.value)}
                      placeholder="Select Machine"
                      className="h-8 text-sm"
                      disabled={!machineEnabled}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  These settings only affect the employee inspection form. Other audit views remain unchanged.
                </p>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? (
                    "Saving..."
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Save settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Helper / info card */}
        <Card className="bg-muted/40 border-border/70 shadow-sm lg:sticky lg:top-20">
          <CardHeader className="space-y-1 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                <Info className="h-4 w-4 text-primary" />
              </span>
              <span>How this works</span>
            </CardTitle>
            <CardDescription className="text-xs">
              These settings control the form shown on <span className="font-mono">/employee/inspections</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs text-muted-foreground">
            <ul className="list-disc space-y-1 pl-4">
              <li>
                The <span className="font-mono">Form title</span> updates the heading at the top of the employee inspection page.
              </li>
              <li>
                Line and Machine can be renamed (for example, to "Cell" or "Workstation") without changing data structure.
              </li>
              <li>
                At least one of Line or Machine must remain enabled so audits can be grouped correctly.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
