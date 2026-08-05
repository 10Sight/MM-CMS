import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Mail, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import api from "@/utils/axios";
import { toast } from "sonner";
import { useGetDepartmentsQuery, useGetUnitsQuery } from "@/store/api";
import { useAuth } from "../context/AuthContext";
import { FAILURE_ALERT_DESIGNATIONS } from "@/constants/designations";

// Shared row editor for per-department To/CC overrides, used by both the standard
// routing tab and the failure routing tab against their own independent state.
function DepartmentRecipientRows({ departments, value, onChange, toPlaceholder, ccPlaceholder }) {
  if (departments.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No departments found. Create departments first to enable per-department routing.
      </p>
    );
  }

  return departments.map((dept) => {
    const config = value[dept._id] || { to: "", cc: "" };
    return (
      <div
        key={dept._id}
        className="space-y-2 rounded-lg border bg-background/40 p-3 text-xs shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      >
        <p className="font-semibold text-foreground">{dept.name}</p>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[11px]">To</Label>
            <Input
              placeholder={toPlaceholder}
              value={config.to}
              onChange={(e) => onChange(dept._id, "to", e.target.value)}
              className="h-8 text-[11px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">CC</Label>
            <Input
              placeholder={ccPlaceholder}
              value={config.cc}
              onChange={(e) => onChange(dept._id, "cc", e.target.value)}
              className="h-8 text-[11px]"
            />
          </div>
        </div>
      </div>
    );
  });
}

export default function AuditEmailSettingsPage() {
  const { user: currentUser, activeUnitId } = useAuth();

  const [toEmails, setToEmails] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [departmentEmailSettings, setDepartmentEmailSettings] = useState({});

  // Failure routing state
  const [failureDesignations, setFailureDesignations] = useState([]);
  const [failureToEmails, setFailureToEmails] = useState("");
  const [failureCcEmails, setFailureCcEmails] = useState("");
  const [failureDeptEmailSettings, setFailureDeptEmailSettings] = useState({});

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

  const handleDeptEmailChange = (departmentId, field, value) => {
    setDepartmentEmailSettings((prev) => ({
      ...prev,
      [departmentId]: {
        to: prev[departmentId]?.to || "",
        cc: prev[departmentId]?.cc || "",
        [field]: value,
      },
    }));
  };

  const handleFailureDeptEmailChange = (departmentId, field, value) => {
    setFailureDeptEmailSettings((prev) => ({
      ...prev,
      [departmentId]: {
        to: prev[departmentId]?.to || "",
        cc: prev[departmentId]?.cc || "",
        [field]: value,
      },
    }));
  };

  const toggleFailureDesignation = (value) => {
    setFailureDesignations((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/api/audits/email-settings");
        const setting = res?.data?.data;
        if (setting) {
          setToEmails(setting.to || "");
          setCcEmails(setting.cc || "");

          // Map per-department recipients into local state for quick editing
          if (Array.isArray(setting.departmentRecipients)) {
            const map = {};
            setting.departmentRecipients.forEach((item) => {
              const dept = item.department;
              const deptId = dept?._id || dept;
              if (!deptId) return;
              map[deptId] = {
                to: item.to || "",
                cc: item.cc || "",
              };
            });
            setDepartmentEmailSettings(map);
          }

          const failureRouting = setting.failureRouting;
          if (failureRouting) {
            setFailureDesignations(Array.isArray(failureRouting.designations) ? failureRouting.designations : []);
            setFailureToEmails(failureRouting.to || "");
            setFailureCcEmails(failureRouting.cc || "");

            if (Array.isArray(failureRouting.departmentRecipients)) {
              const map = {};
              failureRouting.departmentRecipients.forEach((item) => {
                const dept = item.department;
                const deptId = dept?._id || dept;
                if (!deptId) return;
                map[deptId] = {
                  to: item.to || "",
                  cc: item.cc || "",
                };
              });
              setFailureDeptEmailSettings(map);
            }
          }

          const updatedAt = setting.updatedAt || setting.createdAt;
          if (updatedAt) {
            setLastUpdated(new Date(updatedAt));
          }
        }
      } catch (error) {
        // Silently ignore if not configured yet
        console.error("Failed to load audit email settings", error);
      }
    };

    fetchSettings();
  }, []);

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!toEmails.trim()) {
      toast.error("Please enter at least one primary email address");
      return;
    }

    setLoading(true);
    try {
      const departmentRecipients = Object.entries(departmentEmailSettings || {})
        .map(([departmentId, config]) => ({
          department: departmentId,
          to: config?.to || "",
          cc: config?.cc || "",
        }))
        .filter((item) => item.to.trim());

      const failureDepartmentRecipients = Object.entries(failureDeptEmailSettings || {})
        .map(([departmentId, config]) => ({
          department: departmentId,
          to: config?.to || "",
          cc: config?.cc || "",
        }))
        .filter((item) => item.to.trim());

      const res = await api.put("/api/audits/email-settings", {
        to: toEmails,
        cc: ccEmails,
        departmentRecipients,
        failureRouting: {
          designations: failureDesignations,
          to: failureToEmails,
          cc: failureCcEmails,
          departmentRecipients: failureDepartmentRecipients,
        },
      });
      const setting = res?.data?.data;
      if (setting) {
        const updatedAt = setting.updatedAt || setting.createdAt;
        if (updatedAt) {
          setLastUpdated(new Date(updatedAt));
        }
      }
      toast.success("Audit email settings updated");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update email settings";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Notifications
              </span>
              <span className="block leading-tight">Audit email routing</span>
            </span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Define where completed audit inspection reports are delivered, and who is automatically
            alerted when an audit fails.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current unit scope: <span className="font-medium text-foreground">{unitScopeLabel}</span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground md:items-end">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-[11px]">
            <Badge variant="outline" className="flex items-center gap-1 border-none px-0 text-[11px] font-medium">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Global routing active
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
          <CardContent className="pt-6">
            <form className="space-y-6" onSubmit={handleSave}>
              <Tabs defaultValue="standard" className="w-full">
                <TabsList>
                  <TabsTrigger value="standard">Standard Routing</TabsTrigger>
                  <TabsTrigger value="failure">Failure Routing</TabsTrigger>
                </TabsList>

                <TabsContent value="standard" className="space-y-6 pt-6">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">Recipients</p>
                      <p className="text-xs text-muted-foreground">
                        Used when employees click "Share via Email" on a completed audit. Use commas to
                        separate multiple recipients.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="to-emails">To (required)</Label>
                    <Input
                      id="to-emails"
                      placeholder="e.g. quality.head@example.com, plant.manager@example.com"
                      value={toEmails}
                      onChange={(e) => setToEmails(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Primary recipients for audit reports. You can add multiple addresses separated by commas.
                    </p>

                    {toEmails.trim() && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {toEmails
                          .split(",")
                          .map((e) => e.trim())
                          .filter(Boolean)
                          .map((email) => (
                            <Badge key={email} variant="secondary" className="text-[11px]">
                              {email}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cc-emails">CC (optional)</Label>
                    <Input
                      id="cc-emails"
                      placeholder="e.g. supervisor1@example.com, supervisor2@example.com"
                      value={ccEmails}
                      onChange={(e) => setCcEmails(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Additional recipients to be copied on every shared audit report.
                    </p>

                    {ccEmails.trim() && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {ccEmails
                          .split(",")
                          .map((e) => e.trim())
                          .filter(Boolean)
                          .map((email) => (
                            <Badge key={email} variant="outline" className="text-[11px]">
                              {email}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Per-department overrides */}
                  <div className="mt-8 space-y-4 rounded-xl border bg-muted/40 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Per-department routing (optional)</p>
                      <p className="text-xs text-muted-foreground">
                        Override the global recipients for specific departments. If left empty, the global To/CC are used.
                      </p>
                    </div>

                    <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                      <DepartmentRecipientRows
                        departments={filteredDepartments}
                        value={departmentEmailSettings}
                        onChange={handleDeptEmailChange}
                        toPlaceholder="Dept-specific To emails (comma separated)"
                        ccPlaceholder="Dept-specific CC emails (optional)"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="failure" className="space-y-6 pt-6">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">Automatic failure alerts</p>
                      <p className="text-xs text-muted-foreground">
                        Sent automatically whenever an audit is submitted with a failing ("No"/"Fail") answer.
                        No photos are attached; emails link back to the dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Notify by designation</p>
                      <p className="text-xs text-muted-foreground">
                        Plant Head is scoped to the failed audit's unit; HOD, Shift Incharge and Team Leader are
                        scoped to the failed audit's department.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {FAILURE_ALERT_DESIGNATIONS.map((d) => (
                        <label key={d.value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={failureDesignations.includes(d.value)}
                            onCheckedChange={() => toggleFailureDesignation(d.value)}
                            aria-label={d.label}
                          />
                          {d.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="failure-to-emails">Fallback To (optional)</Label>
                    <Input
                      id="failure-to-emails"
                      placeholder="Used only when no designation/department match is found"
                      value={failureToEmails}
                      onChange={(e) => setFailureToEmails(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="failure-cc-emails">Fallback CC (optional)</Label>
                    <Input
                      id="failure-cc-emails"
                      placeholder="Always copied on every failure alert, regardless of routing"
                      value={failureCcEmails}
                      onChange={(e) => setFailureCcEmails(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* Per-department overrides for failure alerts */}
                  <div className="mt-8 space-y-4 rounded-xl border bg-muted/40 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Per-department failure overrides (optional)</p>
                      <p className="text-xs text-muted-foreground">
                        Replaces designation-based routing for that department. Independent of the standard
                        routing overrides above.
                      </p>
                    </div>

                    <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                      <DepartmentRecipientRows
                        departments={filteredDepartments}
                        value={failureDeptEmailSettings}
                        onChange={handleFailureDeptEmailChange}
                        toPlaceholder="Dept-specific failure To emails (comma separated)"
                        ccPlaceholder="Dept-specific failure CC emails (optional)"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator className="my-4" />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Changes apply immediately for all future audit shares and failure alerts.
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
              Standard routing controls manual report shares; failure routing controls automatic
              failure-alert emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs text-muted-foreground">
            <ul className="list-disc space-y-1 pl-4">
              <li>
                Auditors do <span className="font-semibold">not</span> choose emails manually; reports and alerts
                always go to these configured addresses.
              </li>
              <li>
                For failure alerts, a department override always takes priority over designation-based routing.
              </li>
              <li>
                Repeated failures on the same machine/line trigger a distinct, higher-priority escalation email.
              </li>
            </ul>
            <Separator />
            <div className="space-y-1">
              <p className="mb-1 text-xs font-medium text-foreground">Example configuration</p>
              <p className="break-all rounded border bg-background px-2 py-1 font-mono text-[11px]">
                To: quality.head@company.com, plant.manager@company.com
                <br />
                CC: supervisor.line1@company.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
