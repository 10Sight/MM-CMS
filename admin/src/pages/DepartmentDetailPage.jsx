import React, { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  useGetAllUsersQuery,
  useGetDepartmentsQuery,
  useUpdateDepartmentMutation,
  useGetLinesQuery,
  useCreateLineMutation,
  useDeleteLineMutation,
  useRemoveEmployeeFromDepartmentMutation,
} from "@/store/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Users, Building2, ChevronLeft, Factory, Plus, Minus, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

export default function DepartmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 })
  const { data: usersRes } = useGetAllUsersQuery({ page: 1, limit: 1000 })

  const [updateDepartment] = useUpdateDepartmentMutation()
  const [removeEmployeeMutation] = useRemoveEmployeeFromDepartmentMutation()

  // Local loading states to prevent double submissions
  const [savingLeaders, setSavingLeaders] = useState(false)
  const [creatingLine, setCreatingLine] = useState(false)
  const [deletingLineId, setDeletingLineId] = useState(null)

  // Remove Auditor states
  const [employeeToRemove, setEmployeeToRemove] = useState(null)
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false)
  const [removingLoading, setRemovingLoading] = useState(false)

  // Local state for department-scoped lines
  const [lineName, setLineName] = useState("")
  const [lineDescription, setLineDescription] = useState("")

  // Local staff configuration at department level (no dependency on shift values)
  const [staffByShift, setStaffByShift] = useState([
    {
      lineLeaders: [""],
      shiftIncharges: [""],
    },
  ])

  const { data: linesRes } = useGetLinesQuery({ department: id })
  const [createLine] = useCreateLineMutation()
  const [deleteLine] = useDeleteLineMutation()

  const department = useMemo(() => {
    return (deptRes?.data?.departments || []).find((d) => d._id === id)
  }, [deptRes, id])

  // Sync local staffByShift state from department when loaded (department-level only)
  React.useEffect(() => {
    if (!department) return
    const existing = Array.isArray(department.staffByShift)
      ? department.staffByShift
      : []

    if (!existing.length) {
      setStaffByShift([
        {
          lineLeaders: [""],
          shiftIncharges: [""],
        },
      ])
      return
    }

    const first = existing[0] || {}
    const lineLeaders = Array.isArray(first.lineLeaders)
      ? first.lineLeaders
      : first.lineLeader
        ? [first.lineLeader]
        : [""]
    const shiftIncharges = Array.isArray(first.shiftIncharges)
      ? first.shiftIncharges
      : first.shiftIncharge
        ? [first.shiftIncharge]
        : [""]

    setStaffByShift([
      {
        lineLeaders: lineLeaders.length ? lineLeaders : [""],
        shiftIncharges: shiftIncharges.length ? shiftIncharges : [""],
      },
    ])
  }, [department])

  const lines = useMemo(() => {
    return Array.isArray(linesRes?.data) ? linesRes.data : []
  }, [linesRes])

  const employees = useMemo(() => {
    const list = Array.isArray(usersRes?.data?.users) ? usersRes.data.users : []
    return list
      .filter((u) => (u.role?.toLowerCase?.() || "") === "employee")
      .filter((u) => {
        if (!u.department) return false

        // Handle array of departments (strings or objects)
        if (Array.isArray(u.department)) {
          return u.department.some(dept => {
            const deptId = typeof dept === 'object' && dept !== null ? dept._id : dept;
            return deptId === id;
          });
        }

        // Handle single department (legacy)
        if (typeof u.department === "string") return u.department === id
        return u.department?._id === id
      })
  }, [usersRes, id])

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?"

  const handleCreateLine = async () => {
    const name = lineName.trim()
    if (!name) {
      toast.error("Please enter a line name")
      return
    }
    try {
      setCreatingLine(true)
      await createLine({ name, description: lineDescription.trim(), department: id }).unwrap()
      toast.success("Line created successfully")
      setLineName("")
      setLineDescription("")
    } catch (err) {
      console.error("Failed to create line", err)
      toast.error(err?.data?.message || err?.message || "Failed to create line")
    } finally {
      setCreatingLine(false)
    }
  }

  const handleDeleteLine = async (lineId) => {
    try {
      setDeletingLineId(lineId)
      await deleteLine(lineId).unwrap()
    } catch (err) {
      console.error("Failed to delete line", err)
    } finally {
      setDeletingLineId(null)
    }
  }

  const handleStaffNameChange = (rowIndex, kind, nameIndex, value) => {
    setStaffByShift((prev) => {
      const next = [...prev]
      const row = { ...next[rowIndex] }
      const key = kind === "line" ? "lineLeaders" : "shiftIncharges"
      const arr = [...(row[key] || [""])]
      arr[nameIndex] = value
      row[key] = arr
      next[rowIndex] = row
      return next
    })
  }

  const handleAddName = (rowIndex, kind) => {
    setStaffByShift((prev) => {
      const next = [...prev]
      const row = { ...next[rowIndex] }
      const key = kind === "line" ? "lineLeaders" : "shiftIncharges"
      const arr = [...(row[key] || [])]
      arr.push("")
      row[key] = arr
      next[rowIndex] = row
      return next
    })
  }

  const handleRemoveName = (rowIndex, kind, nameIndex) => {
    setStaffByShift((prev) => {
      const next = [...prev]
      const row = { ...next[rowIndex] }
      const key = kind === "line" ? "lineLeaders" : "shiftIncharges"
      let arr = [...(row[key] || [])]
      if (arr.length <= 1) {
        arr = [""]
      } else {
        arr.splice(nameIndex, 1)
      }
      row[key] = arr
      next[rowIndex] = row
      return next
    })
  }

  const handleSaveStaffByShift = async () => {
    if (!department?._id) return
    try {
      setSavingLeaders(true)
      const payload = staffByShift
        .map((item) => ({
          lineLeaders: (item.lineLeaders || []).map((s) => s.trim()).filter(Boolean),
          shiftIncharges: (item.shiftIncharges || []).map((s) => s.trim()).filter(Boolean),
        }))
        .filter((item) => item.lineLeaders.length || item.shiftIncharges.length)
      await updateDepartment({ id: department._id, staffByShift: payload }).unwrap()
      toast.success("Leaders updated for this department")
    } catch (err) {
      console.error("Failed to update leaders", err)
      toast.error(err?.data?.message || err?.message || "Failed to update leaders")
    } finally {
      setSavingLeaders(false)
    }
  }

  // Remove Auditor Logic
  const initiateRemoveEmployee = (employee) => {
    setEmployeeToRemove(employee)
    setOpenRemoveDialog(true)
  }

  const handleRemoveEmployee = async () => {
    if (!employeeToRemove) return

    setRemovingLoading(true)
    try {
      await removeEmployeeMutation({
        employeeId: employeeToRemove._id,
        departmentId: id
      }).unwrap()

      toast.success(`Removed ${employeeToRemove.fullName} from department`)
      setOpenRemoveDialog(false)
      setEmployeeToRemove(null)
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to remove employee")
    } finally {
      setRemovingLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header / Overview */}
      <Card className="border border-border/60 bg-gradient-to-r from-background via-background/95 to-muted/60 shadow-sm rounded-xl">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="shrink-0 border-border/70 hover:bg-muted/80"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <span>{department?.name || "Department"}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage lines and team members for this department.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="secondary" className="flex items-center gap-1 rounded-full px-3 py-1">
              <Factory className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{lines.length} lines</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 rounded-full px-3 py-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{employees.length} members</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Leaders Section (department-wide) */}
      <Card className="border border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Line Leaders & Shift Incharge (department level)
          </CardTitle>
          <CardDescription>
            Configure default names for this department (applies to all shifts when filling audits).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {staffByShift.map((row, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-lg border border-dashed border-border/70 bg-muted/40 p-3 sm:p-4"
              >
                <div className="mb-1 flex items-center justify-between text-sm font-medium">
                  <span>Department</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Line Leaders
                    </div>
                    {row.lineLeaders?.map((name, nameIdx) => (
                      <div key={nameIdx} className="flex items-center gap-2">
                        <Input
                          placeholder="Line Leader name"
                          value={name}
                          onChange={(e) => handleStaffNameChange(idx, "line", nameIdx, e.target.value)}
                          className="h-9"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveName(idx, "line", nameIdx)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleAddName(idx, "line")}
                    >
                      <Plus className="h-3 w-3" />
                      Add Line Leader
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Shift Incharges
                    </div>
                    {row.shiftIncharges?.map((name, nameIdx) => (
                      <div key={nameIdx} className="flex items-center gap-2">
                        <Input
                          placeholder="Shift Incharge name"
                          value={name}
                          onChange={(e) => handleStaffNameChange(idx, "shift", nameIdx, e.target.value)}
                          className="h-9"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveName(idx, "shift", nameIdx)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleAddName(idx, "shift")}
                    >
                      <Plus className="h-3 w-3" />
                      Add Shift Incharge
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveStaffByShift} disabled={savingLeaders}>
              {savingLeaders ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </span>
              ) : (
                "Save leaders"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lines Section */}
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Lines in this department
          </CardTitle>
          <CardDescription>
            Create and manage production lines. Click a line to manage its machines on the next screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)] lg:items-start lg:gap-6">
          <div className="space-y-3 rounded-lg border bg-muted/40 p-3 sm:p-4">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Line name (e.g., Assembly Line)"
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={lineDescription}
                onChange={(e) => setLineDescription(e.target.value)}
                rows={1}
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCreateLine} disabled={creatingLine}>
                {creatingLine ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Adding...
                  </span>
                ) : (
                  "Add Line"
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2 lg:mt-0">
            {lines.length ? (
              <div className="divide-y rounded-md border bg-card">
                {lines.map((line) => (
                  <div
                    key={line._id}
                    role="button"
                    tabIndex={0}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-muted/60 sm:px-4 sm:py-3 cursor-pointer"
                    onClick={() => navigate(`/admin/departments/${id}/lines/${line._id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/admin/departments/${id}/lines/${line._id}`);
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium">{line.name}</div>
                      {line.description && (
                        <div className="text-xs text-muted-foreground">{line.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={line.isActive ? "default" : "secondary"}>
                        {line.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteLine(line._id)
                        }}
                        aria-label="Delete line"
                        disabled={deletingLineId === line._id}
                      >
                        {deletingLineId === line._id ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No lines defined for this department yet. Start by creating the first one above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employees Section */}
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Members
          </CardTitle>
          <CardDescription>List of employees assigned to this department</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <div className="border-t bg-card/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map((emp, index) => (
                    <TableRow key={emp._id} className={index % 2 === 0 ? "bg-background/40" : "bg-background/10"}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="" />
                            <AvatarFallback className="text-xs">
                              {getInitials(emp.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{emp.fullName}</div>
                            <div className="text-sm text-muted-foreground">ID: {emp.employeeId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{emp.emailId}</div>
                          <div className="text-muted-foreground">{emp.phoneNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{emp.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(emp.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => initiateRemoveEmployee(emp)}
                          title="Remove from this department"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No employees in this department</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={openRemoveDialog} onOpenChange={setOpenRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Auditor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{employeeToRemove?.fullName}</strong> from this department?
              <br className="mb-2" />
              They will remain in other departments they are assigned to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveEmployee}
              disabled={removingLoading}
            >
              {removingLoading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
