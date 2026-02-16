import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetEmployeeByIdQuery,
  useGetDepartmentsQuery,
  useGetEmployeesQuery,
  useGetAuditsQuery,
  useGetLinesQuery,
  useGetMachinesQuery,
} from "@/store/api";
import Loader from "@/components/ui/Loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Users, Building2 } from "lucide-react";

function getAnswersSummary(audit) {
  if (!Array.isArray(audit.answers)) {
    return { yes: 0, no: 0, na: 0, total: 0, considered: 0, percentage: 0, result: "No data" };
  }

  const yes = audit.answers.filter((a) => a.answer === "Yes" || a.answer === "Pass").length;
  const no = audit.answers.filter((a) => a.answer === "No" || a.answer === "Fail").length;
  const na = audit.answers.filter((a) => a.answer === "NA" || a.answer === "Not Applicable").length;
  const total = audit.answers.length;
  const considered = yes + no;
  const percentage = considered > 0 ? Math.round((yes / considered) * 100) : 0;

  let result = "Not Applicable";
  if (no > 0) result = "Fail";
  else if (yes > 0) result = "Pass";
  else if (na > 0) result = "Not Applicable";
  else if (total === 0) result = "No data";

  return { yes, no, na, total, considered, percentage, result };
}

export default function SuperAdminAdminDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: empRes,
    isLoading: empLoading,
    error: empError,
  } = useGetEmployeeByIdQuery(id, { skip: !id });

  const employee = empRes?.data?.employee || null;
  const unitId = employee?.unit?._id || employee?.unit || null;

  const { data: deptRes, isLoading: deptLoading } = useGetDepartmentsQuery(
    { page: 1, limit: 1000, includeInactive: true },
    { skip: !unitId }
  );

  const { data: employeesRes, isLoading: employeesLoading } = useGetEmployeesQuery(
    unitId ? { page: 1, limit: 1000, unit: unitId } : undefined,
    { skip: !unitId }
  );

  const { data: auditsRes, isLoading: auditsLoading } = useGetAuditsQuery(
    id ? { page: 1, limit: 200, auditor: id } : undefined,
    { skip: !id }
  );

  const allDepartments = deptRes?.data?.departments || [];
  const unitDepartments = useMemo(() => {
    if (!unitId) return [];
    return allDepartments.filter((d) => {
      const dUnitId = d.unit?._id || d.unit || null;
      return dUnitId && String(dUnitId) === String(unitId);
    });
  }, [allDepartments, unitId]);

  const unitEmployees = employeesRes?.data?.employees || [];
  const adminAudits = auditsRes?.data?.audits || [];

  // UI filter state
  const [selectedDeptForLines, setSelectedDeptForLines] = useState("all");
  const [selectedDeptForMachines, setSelectedDeptForMachines] = useState("all");
  const [selectedLineForMachines, setSelectedLineForMachines] = useState("all");

  // Lines & machines for departments in this admin's unit
  const { data: linesRes, isLoading: linesLoading } = useGetLinesQuery({}, { skip: !unitId });
  const { data: machinesRes, isLoading: machinesLoading } = useGetMachinesQuery({}, { skip: !unitId });

  const unitLines = useMemo(() => {
    if (!unitId) return [];
    const rawLines = Array.isArray(linesRes?.data) ? linesRes.data : [];
    if (!unitDepartments.length) return [];
    const deptIds = new Set(unitDepartments.map((d) => d._id));
    return rawLines.filter((line) => {
      const dept = line.department;
      const deptId = dept && typeof dept === "object" ? dept._id : dept;
      return deptId && deptIds.has(String(deptId));
    });
  }, [linesRes, unitDepartments, unitId]);

  const unitMachines = useMemo(() => {
    if (!unitId) return [];
    const rawMachines = Array.isArray(machinesRes?.data) ? machinesRes.data : [];
    if (!unitDepartments.length) return [];
    const deptIds = new Set(unitDepartments.map((d) => d._id));
    return rawMachines.filter((machine) => {
      const dept = machine.department;
      const deptId = dept && typeof dept === "object" ? dept._id : dept;
      return deptId && deptIds.has(String(deptId));
    });
  }, [machinesRes, unitDepartments, unitId]);

  // Derived lists with UI filters applied
  const filteredLines = useMemo(() => {
    if (selectedDeptForLines === "all") return unitLines;
    return unitLines.filter((line) => {
      const dep = line.department;
      const depId = dep && typeof dep === "object" ? dep._id : dep;
      return depId && String(depId) === String(selectedDeptForLines);
    });
  }, [unitLines, selectedDeptForLines]);

  const filteredMachines = useMemo(() => {
    return unitMachines.filter((machine) => {
      const dep = machine.department;
      const depId = dep && typeof dep === "object" ? dep._id : dep;
      const ln = machine.line;
      const lineId = ln && typeof ln === "object" ? ln._id : ln;

      if (selectedDeptForMachines !== "all" && (!depId || String(depId) !== String(selectedDeptForMachines))) {
        return false;
      }
      if (selectedLineForMachines !== "all" && (!lineId || String(lineId) !== String(selectedLineForMachines))) {
        return false;
      }
      return true;
    });
  }, [unitMachines, selectedDeptForMachines, selectedLineForMachines]);

  // Pre-compute counts for summary columns
  const linesByDepartmentCount = useMemo(() => {
    const map = new Map();
    unitLines.forEach((line) => {
      const dept = line.department;
      const deptId = dept && typeof dept === "object" ? dept._id : dept;
      if (!deptId) return;
      const key = String(deptId);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [unitLines]);

  const machinesByLineCount = useMemo(() => {
    const map = new Map();
    unitMachines.forEach((machine) => {
      const line = machine.line;
      const lineId = line && typeof line === "object" ? line._id : line;
      if (!lineId) return;
      const key = String(lineId);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [unitMachines]);

  if (empLoading) return <Loader />;
  if (empError)
    return (
      <div className="p-6 text-center text-red-500">
        {empError?.data?.message || empError?.message || "Failed to load admin"}
      </div>
    );
  if (!employee)
    return <div className="p-6 text-center text-muted-foreground">Admin not found</div>;

  const initials = (employee.fullName || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        onClick={() => navigate("/superadmin/users")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Button>

      {/* Admin basic info */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src="" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{employee.fullName}</CardTitle>
              <CardDescription>{employee.emailId}</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Badge variant="secondary" className="capitalize">
              {employee.role}
            </Badge>
            {employee.unit && (
              <Badge variant="outline" className="capitalize flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {typeof employee.unit === "object"
                  ? employee.unit?.name || "N/A"
                  : employee.unit || "N/A"}
              </Badge>
            )}
            {employee.department && (
              <Badge variant="outline" className="capitalize">
                {typeof employee.department === "object"
                  ? employee.department?.name || "N/A"
                  : employee.department || "N/A"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1 text-sm">
              <div className="text-xs text-muted-foreground">Admin ID</div>
              <div className="font-medium">{employee.employeeId}</div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="text-xs text-muted-foreground">Phone</div>
              <div className="font-medium">{employee.phoneNumber || "N/A"}</div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="text-xs text-muted-foreground">Joined</div>
              <div className="font-medium">
                {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit and departments */}
      <Card className="shadow-sm border border-slate-200/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Unit & Departments</CardTitle>
                <CardDescription>
                  All departments under this admin's unit.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!unitId && (
            <p className="text-sm text-muted-foreground">
              This admin is not associated with any unit.
            </p>
          )}
          {unitId && deptLoading && <Loader />}
          {unitId && !deptLoading && !unitDepartments.length && (
            <p className="text-sm text-muted-foreground">
              No departments found for this unit.
            </p>
          )}
          {unitId && !deptLoading && unitDepartments.length > 0 && (
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead>Auditors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitDepartments.map((dept) => (
                    <TableRow key={dept._id} className="hover:bg-slate-50/80">
                      <TableCell>{dept.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {dept.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dept.isActive ? "default" : "secondary"}>
                          {dept.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {linesByDepartmentCount.get(String(dept._id)) || 0}
                      </TableCell>
                      <TableCell>{dept.employeeCount ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employees in this unit */}
      <Card className="shadow-sm border border-slate-200/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Employees in this Unit</CardTitle>
                <CardDescription>
                  All employees whose unit matches this admin's unit.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {unitId && employeesLoading && <Loader />}
          {unitId && !employeesLoading && !unitEmployees.length && (
            <p className="text-sm text-muted-foreground">
              No employees found under this unit.
            </p>
          )}
          {!unitId && (
            <p className="text-sm text-muted-foreground">
              Employees cannot be determined because this admin has no unit assigned.
            </p>
          )}
          {unitId && !employeesLoading && unitEmployees.length > 0 && (
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitEmployees.map((emp) => (
                    <TableRow
                      key={emp._id}
                      className="hover:bg-slate-50/80 cursor-pointer"
                      onClick={() =>
                        emp.role === "employee"
                          ? navigate(`/superadmin/users/employee/${emp._id}`)
                          : navigate(`/superadmin/users/admin/${emp._id}`)
                      }
                    >
                      <TableCell>{emp.fullName}</TableCell>
                      <TableCell>{emp.employeeId}</TableCell>
                      <TableCell className="capitalize">{emp.role}</TableCell>
                      <TableCell>
                        {typeof emp.department === "object"
                          ? emp.department?.name || "N/A"
                          : emp.department || "N/A"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{emp.emailId}</div>
                        <div className="text-muted-foreground">{emp.phoneNumber}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lines in this admin's unit */}
      <Card className="shadow-sm border border-slate-200/70">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Lines in this Unit's Departments</CardTitle>
                <CardDescription>
                  All lines belonging to departments under this admin's unit.
                </CardDescription>
              </div>
            </div>
            {unitId && (
              <div className="w-full sm:w-64">
                <Select
                  value={selectedDeptForLines}
                  onValueChange={(val) => setSelectedDeptForLines(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {unitDepartments.map((dept) => (
                      <SelectItem key={dept._id} value={String(dept._id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {unitId && linesLoading && <Loader />}
          {unitId && !linesLoading && !unitLines.length && (
            <p className="text-sm text-muted-foreground">
              No lines found for departments in this unit.
            </p>
          )}
          {!unitId && (
            <p className="text-sm text-muted-foreground">
              Lines cannot be determined because this admin has no unit assigned.
            </p>
          )}
          {unitId && !linesLoading && filteredLines.length > 0 && (
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLines.map((line) => (
                    <TableRow key={line._id} className="hover:bg-slate-50/80">
                      <TableCell>{line.name}</TableCell>
                      <TableCell>
                        {(() => {
                          const dep = line.department;
                          const depId = dep && typeof dep === "object" ? dep._id : dep;
                          const found = unitDepartments.find((d) => String(d._id) === String(depId));
                          return found?.name || "N/A";
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={line.isActive ? "default" : "secondary"}>
                          {line.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {machinesByLineCount.get(
                          String(
                            (line._id || (typeof line === "object" ? line._id : line)) ?? ""
                          )
                        ) || 0}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {line.description || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Machines in this admin's unit */}
      <Card className="shadow-sm border border-slate-200/70">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Machines in this Unit's Departments</CardTitle>
                <CardDescription>
                  All machines belonging to departments under this admin's unit.
                </CardDescription>
              </div>
            </div>
            {unitId && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="sm:w-56">
                  <Select
                    value={selectedDeptForMachines}
                    onValueChange={(val) => {
                      setSelectedDeptForMachines(val);
                      setSelectedLineForMachines("all");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {unitDepartments.map((dept) => (
                        <SelectItem key={dept._id} value={String(dept._id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:w-56">
                  <Select
                    value={selectedLineForMachines}
                    onValueChange={(val) => setSelectedLineForMachines(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by line" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Lines</SelectItem>
                      {unitLines
                        .filter((line) => {
                          if (selectedDeptForMachines === "all") return true;
                          const dep = line.department;
                          const depId = dep && typeof dep === "object" ? dep._id : dep;
                          return depId && String(depId) === String(selectedDeptForMachines);
                        })
                        .map((line) => (
                          <SelectItem key={line._id} value={String(line._id)}>
                            {line.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {unitId && machinesLoading && <Loader />}
          {unitId && !machinesLoading && !unitMachines.length && (
            <p className="text-sm text-muted-foreground">
              No machines found for departments in this unit.
            </p>
          )}
          {!unitId && (
            <p className="text-sm text-muted-foreground">
              Machines cannot be determined because this admin has no unit assigned.
            </p>
          )}
          {unitId && !machinesLoading && filteredMachines.length > 0 && (
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMachines.map((machine) => (
                    <TableRow key={machine._id} className="hover:bg-slate-50/80">
                      <TableCell>{machine.name}</TableCell>
                      <TableCell>
                        {(() => {
                          const dep = machine.department;
                          const depId = dep && typeof dep === "object" ? dep._id : dep;
                          const found = unitDepartments.find((d) => String(d._id) === String(depId));
                          return found?.name || "N/A";
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const ln = machine.line;
                          const lineId = ln && typeof ln === "object" ? ln._id : ln;
                          const found = unitLines.find((l) => String(l._id) === String(lineId));
                          return found?.name || "N/A";
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={machine.isActive ? "default" : "secondary"}>
                          {machine.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {machine.description || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audits performed by this admin */}
      <Card className="shadow-sm border border-slate-200/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Audits Performed by this Admin</CardTitle>
              <CardDescription>All audits where this admin is the auditor.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {auditsLoading ? (
            <Loader />
          ) : !adminAudits.length ? (
            <p className="text-sm text-muted-foreground">
              No audits found for this admin.
            </p>
          ) : (
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminAudits.map((audit) => {
                    const { considered, percentage, result } = getAnswersSummary(audit);

                    let resultClasses = "bg-slate-100 text-slate-800 border-slate-200";
                    if (result === "Pass") {
                      resultClasses = "bg-emerald-50 text-emerald-800 border-emerald-200";
                    } else if (result === "Fail") {
                      resultClasses = "bg-red-50 text-red-800 border-red-200";
                    } else if (result === "Not Applicable") {
                      resultClasses = "bg-amber-50 text-amber-800 border-amber-200";
                    }

                    return (
                      <TableRow key={audit._id} className="hover:bg-slate-50/80">
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {audit.date ? new Date(audit.date).toLocaleDateString() : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {audit.unit?.name || "N/A"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {audit.department?.name || "N/A"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {audit.line?.name || "N/A"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {audit.machine?.name || "N/A"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{audit.shift || "N/A"}</TableCell>
                        <TableCell className="text-center">
                          {considered > 0 ? (
                            <span className="text-sm font-medium">{percentage}%</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-0.5 border ${resultClasses}`}
                          >
                            {result}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
    
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => navigate(`/superadmin/audits/${audit._id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
