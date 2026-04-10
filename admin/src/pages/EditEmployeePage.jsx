import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetEmployeeByIdQuery, useUpdateEmployeeByIdMutation, useGetDepartmentsQuery, useGetUnitsQuery } from "@/store/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Loader from "@/components/ui/Loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EditEmployeePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState({
    fullName: "",
    emailId: "",
    phoneNumber: "",
    role: "",
    designation: "none",
    isAdminPower: false,
    unit: "",
    category: "non-critical",
    employeeId: "",
  });
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: empRes, isLoading: empLoading } = useGetEmployeeByIdQuery(id, { skip: !id });
  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 });
  const { data: unitsRes } = useGetUnitsQuery();
  const [updateEmployeeMutation] = useUpdateEmployeeByIdMutation();

  const designations = [
    { label: "None", value: "none" },
    { label: "Plant Head", value: "plant head" },
    { label: "HOD", value: "hod" },
    { label: "Shift Incharge", value: "shift incharge" },
    { label: "Team Leader", value: "team leader" },
  ];

  useEffect(() => {
    setLoading(empLoading);
    if (empRes?.data?.employee) {
      const e = empRes.data.employee;
      setEmployee({
        fullName: e.fullName || "",
        emailId: e.emailId || "",
        phoneNumber: e.phoneNumber || "",
        role: e.role || "",
        designation: e.designation || "none",
        isAdminPower: !!e.isAdminPower,
        unit: typeof e.unit === 'object' ? e.unit?._id || "" : e.unit || "",
        category: e.category || "non-critical",
        employeeId: e.employeeId || "",
      });

      // Handle department being an array
      let actualDeptId = "";
      if (Array.isArray(e.department)) {
        const firstDept = e.department[0];
        actualDeptId = typeof firstDept === "object" ? firstDept?._id || "" : firstDept || "";
      } else if (e.department) {
        actualDeptId = typeof e.department === "object" ? e.department?._id || "" : e.department || "";
      }
      setDepartmentId(actualDeptId);
    }
  }, [empRes, empLoading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmployee((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateEmployeeMutation({ id, ...employee, department: departmentId }).unwrap();
      alert("Auditor updated successfully!");
      navigate(`/admin/employee/${id}`);
    } catch (err) {
      alert(err?.data?.message || err?.message || "Failed to update auditor");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className="text-red-500 p-6 text-center">{error}</div>;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit Auditor</CardTitle>
          <CardDescription>Update profile information and access level.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input
                name="fullName"
                value={employee.fullName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                name="emailId"
                value={employee.emailId}
                onChange={handleChange}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label>Phone Number</Label>
              <Input
                name="phoneNumber"
                value={employee.phoneNumber}
                onChange={handleChange}
              />
            </div>

            {/* Department */}
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {(deptRes?.data?.departments || []).map((d) => (
                    <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Designation */}
            <div className="space-y-1">
              <Label>Designation</Label>
              <Select value={employee.designation || "none"} onValueChange={(v) => setEmployee((prev) => ({ ...prev, designation: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Designation" />
                </SelectTrigger>
                <SelectContent>
                  {designations.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admin Power Toggle */}
            {employee.designation !== "none" && (
              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="isAdminPower"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={employee.isAdminPower}
                  onChange={(e) => setEmployee(prev => ({ ...prev, isAdminPower: e.target.checked }))}
                />
                <Label htmlFor="isAdminPower" className="cursor-pointer">Give Admin Power</Label>
              </div>
            )}

            {/* Category Selection */}
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={employee.category || "non-critical"} onValueChange={(v) => setEmployee((prev) => ({ ...prev, category: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="non-critical">Non-Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role */}
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={employee.role || ""} onValueChange={(v) => setEmployee((prev) => ({ ...prev, role: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Unit - only for admins or plant heads */}
            {(employee.role === "admin" || employee.designation === "plant head") && (
              <div className="space-y-1">
                <Label>Unit</Label>
                <Select value={employee.unit || ""} onValueChange={(v) => setEmployee((prev) => ({ ...prev, unit: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {(unitsRes?.data || []).map((u) => (
                      <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Employee ID */}
            <div className="space-y-1">
              <Label>Auditor ID</Label>
              <Input name="employeeId" value={employee.employeeId || ""} disabled />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
