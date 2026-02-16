import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowLeft, UserPlus, Eye, EyeOff, Building2, Mail, Phone, User, Key, Shield } from "lucide-react";
import { useRegisterEmployeeMutation, useGetDepartmentsQuery, useGetUnitsQuery } from "@/store/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function AddEmployeePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [units, setUnits] = useState([]);

  const allowedRoles = useMemo(
    () => (user?.role === "superadmin" ? ["employee", "admin"] : ["employee"]),
    [user]
  );

  // NOTE: We rely mainly on backend validation; do light checks in onSubmit.
  const form = useForm({
    defaultValues: {
      fullName: "",
      emailId: "",
      department: "",
      employeeId: "",
      phoneNumber: "",
      password: "",
      role: user?.role === "admin" ? "employee" : "",
      unit: "",
    },
  });


  const selectedRole = form.watch("role");
  const selectedUnit = form.watch("unit");

  const departmentQueryParams = useMemo(() => {
    const params = { page: 1, limit: 1000 };
    // Filter departments by unit for admins
    if (user?.role === "admin" && user?.unit) {
      params.unit = user.unit._id || user.unit;
    } else if (user?.role === "superadmin" && selectedUnit) {
      // Filter departments by selected unit for superadmin
      params.unit = selectedUnit;
    }
    return params;
  }, [user, selectedUnit]);

  const { data: deptRes } = useGetDepartmentsQuery(departmentQueryParams);
  const { data: unitsRes } = useGetUnitsQuery();
  const [registerEmployee] = useRegisterEmployeeMutation();

  useEffect(() => {
    setDepartments(deptRes?.data?.departments || []);
  }, [deptRes]);

  useEffect(() => {
    setUnits(unitsRes?.data || []);
  }, [unitsRes]);

  const onSubmit = async (data) => {
    // Basic frontend validation; backend will enforce full business rules
    if (!data.fullName?.trim()) {
      toast.error("Full Name is required");
      return;
    }
    if (!data.emailId?.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!data.employeeId?.trim()) {
      toast.error("Employee ID is required");
      return;
    }
    if (!data.password?.trim()) {
      toast.error("Password is required");
      return;
    }

    const effectiveRole = user?.role === "admin" ? "employee" : data.role;

    if (user?.role === "superadmin" && !effectiveRole) {
      toast.error("Please select a role");
      return;
    }

    if (effectiveRole === "admin" && !data.unit) {
      toast.error("Please select a unit for the admin");
      return;
    }

    if (effectiveRole === "employee" && !data.department) {
      toast.error("Please select a department for the auditor");
      return;
    }

    // For admin users, ensure we don't send any stray department value
    if (effectiveRole === "admin") {
      data.department = undefined;
    }

    setLoading(true);
    try {
      let payload = { ...data, role: effectiveRole };

      if (user?.role === "admin") {
        // Admins can only create auditors (employees);
        // unit is derived from admin on backend
        delete payload.unit;
      }

      const res = await registerEmployee(payload).unwrap();
      toast.success(res?.message || "User registered successfully!");
      setTimeout(() =>
        navigate(user?.role === "superadmin" ? "/superadmin/users" : "/admin/employees"),
        800);
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Failed to register user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(user?.role === "superadmin" ? "/superadmin/users" : "/admin/employees")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New User</h1>
            <p className="text-muted-foreground">Create a new admin or auditor account in the system</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <UserPlus className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
          <CardDescription>
            Fill in the details below to create a new user account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Full Name */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter auditor's full name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Employee ID */}
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Auditor ID
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter unique auditor ID"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This will be used for login identification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="emailId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Number */}
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter 10-digit phone number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Department - required for auditors (employees), not for admins */}
                {(user?.role === "admin" || selectedRole === "employee") && (
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Department
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.length > 0 ? (
                              departments.map((department) => (
                                <SelectItem key={department._id} value={department._id}>
                                  {department.name}{department.description ? ` - ${department.description}` : ''}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem disabled value="no-departments">
                                No departments available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the department this auditor will belong to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Unit - only needed when superadmin is creating an admin */}
                {user?.role === "superadmin" && (
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Unit
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.length > 0 ? (
                              units.map((unit) => (
                                <SelectItem key={unit._id} value={unit._id}>
                                  {unit.name}{unit.description ? ` - ${unit.description}` : ''}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem disabled value="no-units">
                                No units available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the unit this admin will belong to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Role */}
                {user?.role === "superadmin" && (
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Role
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="employee">Auditor</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter secure password (min 6 characters)"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Password will be used for initial login. Auditor can change it later.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate(user?.role === "superadmin" ? "/superadmin/users" : "/admin/employees")
                  }
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  className="min-w-32"
                  onClick={form.handleSubmit(onSubmit)}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
