import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetAllUsersQuery, useDeleteEmployeeByIdMutation } from "@/store/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import Loader from "@/components/ui/Loader";
import { toast } from "sonner";

export default function SuperAdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('all');
  const limit = 20;
  const navigate = useNavigate();

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);
  useEffect(() => { setPage(1); }, [debounced]);

  const { data, isLoading, refetch } = useGetAllUsersQuery({ page, limit, search: debounced, role: role === 'all' ? undefined : role });
  const [delUser, { isLoading: deleting }] = useDeleteEmployeeByIdMutation();

  const users = data?.data?.users || [];
  const total = data?.data?.total || 0;

  const getInitials = (name) => (name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?");

  const handleUserClick = (user) => {
    if (!user || !user._id) return;
    if (user.role === "employee") {
      navigate(`/superadmin/users/employee/${user._id}`);
    } else if (user.role === "admin") {
      navigate(`/superadmin/users/admin/${user._id}`);
    }
  };

  const onDelete = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await delUser(id).unwrap();
      toast.success("Deleted successfully");
      refetch();
    } catch (e) {
      toast.error(e?.data?.message || e?.message || "Failed to delete");
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage admins and employees</p>
        </div>
        <Button onClick={() => navigate("/superadmin/add-user")}> <Plus className="h-4 w-4 mr-2"/> Add User</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>Search and manage all users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="w-full sm:w-56">
              <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="superadmin">SuperAdmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow
                    key={u._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleUserClick(u)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback>{getInitials(u.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{u.fullName}</div>
                          <div className="text-xs text-muted-foreground">{u.employeeId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{typeof u.department === 'object' ? (u.department?.name || 'N/A') : (u.department || 'N/A')}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'superadmin' ? 'outline' : 'default'}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{u.emailId}</div>
                        <div className="text-muted-foreground">{u.phoneNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleting || u.role === 'superadmin'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(u._id, u.fullName);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!users.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 sm:px-0 pt-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <span className="text-sm text-muted-foreground">{limit}</span>
              </div>
              <div className="flex w-[120px] items-center justify-center text-sm font-medium">
                Page {page} of {Math.max(1, Math.ceil(total / limit))}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4 -ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(Math.max(1, Math.ceil(total / limit)))}
                  disabled={page >= Math.ceil(total / limit)}
                >
                  <ChevronRight className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4 -ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
