import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetEmployeeByIdQuery, useUpdateEmployeeByIdMutation, useGetDepartmentsQuery } from "@/store/api";
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
    employeeId: "",
  });
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: empRes, isLoading: empLoading } = useGetEmployeeByIdQuery(id, { skip: !id });
  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 });
  const [updateEmployeeMutation] = useUpdateEmployeeByIdMutation();
  useEffect(() => {
    setLoading(empLoading);
    if (empRes?.data?.employee) {
      const e = empRes.data.employee;
      setEmployee({
        fullName: e.fullName || "",
        emailId: e.emailId || "",
        phoneNumber: e.phoneNumber || "",
        role: e.role || "",
        employeeId: e.employeeId || "",
      });
      setDepartmentId(e.department?._id || e.department || "");
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

            {/* Role */}
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={employee.role} onValueChange={(v) => setEmployee((prev) => ({ ...prev, role: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employee ID */}
            <div className="space-y-1">
              <Label>Auditor ID</Label>
              <Input name="employeeId" value={employee.employeeId} disabled />
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
