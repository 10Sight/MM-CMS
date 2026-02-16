import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetEmployeeByIdQuery, useGetAuditsQuery } from "@/store/api";
import Loader from "@/components/ui/Loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar } from "lucide-react";

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

export default function SuperAdminEmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: empRes,
    isLoading: empLoading,
    error: empError,
  } = useGetEmployeeByIdQuery(id, { skip: !id });

  const {
    data: auditsRes,
    isLoading: auditsLoading,
  } = useGetAuditsQuery({ auditor: id, page: 1, limit: 200 }, { skip: !id });

  const employee = empRes?.data?.employee || null;
  const audits = auditsRes?.data?.audits || [];

  if (empLoading) return <Loader />;
  if (empError)
    return (
      <div className="p-6 text-center text-red-500">
        {empError?.data?.message || empError?.message || "Failed to load employee"}
      </div>
    );
  if (!employee)
    return <div className="p-6 text-center text-muted-foreground">Employee not found</div>;

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
            {employee.department && (
              <Badge variant="outline" className="capitalize">
                {typeof employee.department === "object"
                  ? employee.department?.name || "N/A"
                  : employee.department || "N/A"}
              </Badge>
            )}
            {employee.unit && (
              <Badge variant="outline" className="capitalize">
                {typeof employee.unit === "object"
                  ? employee.unit?.name || "N/A"
                  : employee.unit || "N/A"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 text-sm">
              <div className="text-xs text-muted-foreground">Employee ID</div>
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

      <Card className="shadow-sm border border-slate-200/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Audits Performed by this Employee</CardTitle>
              <CardDescription>All audits where this user is the auditor.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {auditsLoading ? (
            <Loader />
          ) : !audits.length ? (
            <p className="text-sm text-muted-foreground">No audits found for this employee.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[880px]">
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
                  {audits.map((audit) => {
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
