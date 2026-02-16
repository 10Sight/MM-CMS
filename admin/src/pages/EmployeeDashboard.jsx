import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as XLSX from "xlsx";
import { 
  Download, 
  FileText, 
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  Activity,
  BarChart3,
  TrendingUp,
  User,
  Clock
} from "lucide-react";
import api from "@/utils/axios";
import Loader from "@/components/ui/Loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function EmployeeDashboard() {
  const { user: currentUser } = useAuth();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const auditsPerPage = 10;

  const getInitials = (name) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";
  };

  const normalizeAnswer = (value) => {
    const val = (value || "").toString().toLowerCase();
    if (val === "yes" || val === "pass") return "Pass";
    if (val === "no" || val === "fail") return "Fail";
    if (val === "na" || val === "not applicable") return "Not Applicable";
    return null;
  };

  const getStatusInfo = (audit) => {
    // Safety check for answers array
    if (!audit.answers || !Array.isArray(audit.answers)) {
      return {
        isCompleted: false,
        completedCount: 0,
        totalCount: 0,
        percentage: 0,
      };
    }

    let pass = 0;
    let fail = 0;
    let na = 0;

    audit.answers.forEach((a) => {
      const normalized = normalizeAnswer(a.answer);
      if (normalized === "Pass") pass += 1;
      else if (normalized === "Fail") fail += 1;
      else if (normalized === "Not Applicable") na += 1;
    });

    const totalCount = audit.answers.length;
    const considered = pass + fail; // ignore NA in percentage
    const isCompleted = totalCount > 0 && fail === 0;

    return {
      isCompleted,
      completedCount: pass,
      totalCount,
      percentage: considered > 0 ? Math.round((pass / considered) * 100) : 0,
      pass,
      fail,
      na,
    };
  };

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const res = await api.get(`/api/audits?auditor=${currentUser?._id}`);
        const fetchedAudits = res.data?.data?.audits || [];
        // Ensure fetchedAudits is an array before sorting
        if (Array.isArray(fetchedAudits)) {
          fetchedAudits.sort((a, b) => new Date(b.date) - new Date(a.date));
          setAudits(fetchedAudits);
        } else {
          console.warn('Fetched audits is not an array:', fetchedAudits);
          setAudits([]);
        }
      } catch (err) {
        console.error("Error fetching audits:", err);
        toast.error("Failed to load audits");
      } finally {
        setLoading(false);
      }
    };
    fetchAudits();
  }, [currentUser]);

  const downloadExcel = () => {
    if (audits.length === 0) {
      toast.info("No audits to download");
      return;
    }

    const data = audits.map((audit) => {
      const statusInfo = getStatusInfo(audit);
      return {
        Date: new Date(audit.date).toLocaleDateString(),
        Line: audit.line?.name || "N/A",
        Machine: audit.machine?.name || "N/A",
        Unit: audit.unit?.name || "N/A",
        LineLeader: audit.lineLeader || "N/A",
        ShiftIncharge: audit.shiftIncharge || "N/A",
        Status: statusInfo.isCompleted ? "Completed" : "Issues Found",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audits");
    XLSX.writeFile(workbook, `Audits_${currentUser?.fullName || "user"}.xlsx`);
  };

  if (loading) return <Loader />;

  // Statistics calculations
  const totalAudits = audits.length;
  const completedAudits = audits.filter((audit) => getStatusInfo(audit).isCompleted).length;
  const issuesFound = totalAudits - completedAudits;
  const thisMonthAudits = audits.filter(audit => {
    const auditDate = new Date(audit.date);
    const now = new Date();
    return auditDate.getMonth() === now.getMonth() && auditDate.getFullYear() === now.getFullYear();
  }).length;

  // Pagination logic
  const indexOfLastAudit = currentPage * auditsPerPage;
  const indexOfFirstAudit = indexOfLastAudit - auditsPerPage;
  const currentAudits = audits.slice(indexOfFirstAudit, indexOfLastAudit);
  const totalPages = Math.ceil(audits.length / auditsPerPage);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(currentUser?.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back, {currentUser?.fullName}</h1>
            <p className="text-muted-foreground">Here's your audit activity overview</p>
          </div>
        </div>
        <Button onClick={downloadExcel} disabled={audits.length === 0} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAudits}</div>
            <p className="text-xs text-muted-foreground">Audits completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedAudits}</div>
            <p className="text-xs text-muted-foreground">Without issues</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issuesFound}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthAudits}</div>
            <p className="text-xs text-muted-foreground">Audits completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="h-5 w-5" />
            Recent Audits
          </CardTitle>
          <CardDescription>
            Your audit history and performance tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No audits completed yet</p>
              <p className="text-sm text-muted-foreground mt-2">Your completed audits will appear here</p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
                <div className="rounded-md border min-w-[720px] mx-2 sm:mx-0">
                  <Table className="min-w-[720px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Line</TableHead>
                        <TableHead className="hidden md:table-cell whitespace-nowrap">Machine</TableHead>
                        <TableHead className="hidden md:table-cell whitespace-nowrap">Unit</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="hidden md:table-cell whitespace-nowrap">Score</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {currentAudits.map((audit) => {
                      const statusInfo = getStatusInfo(audit);
                      return (
                        <TableRow key={audit._id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(audit.date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap truncate max-w-[200px]">{audit.line?.name || "N/A"}</TableCell>
                          <TableCell className="hidden md:table-cell whitespace-nowrap truncate max-w-[200px]">{audit.machine?.name || "N/A"}</TableCell>
                          <TableCell className="hidden md:table-cell whitespace-nowrap truncate max-w-[200px]">{audit.unit?.name || "N/A"}</TableCell>
                          <TableCell>
                            {statusInfo.isCompleted ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 px-2.5 py-0.5 text-xs">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs px-2.5 py-0.5">
                                <XCircle className="mr-1 h-3 w-3" />
                                Issues Found
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {statusInfo.completedCount}/{statusInfo.totalCount}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {statusInfo.percentage}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAudit(audit);
                                setDialogOpen(true);
                              }}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-3 px-2 mt-4">
                  {/* Desktop layout */}
                  <div className="hidden sm:flex items-center justify-between">
                    <div className="flex items-center space-x-6 lg:space-x-8">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <span className="text-sm text-muted-foreground">{auditsPerPage}</span>
                      </div>
                      <div className="flex w-[120px] items-center justify-center text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center space-x-2">
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <span className="sr-only">Go to first page</span>
                        ««
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <span className="sr-only">Go to previous page</span>
                        ‹
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        <span className="sr-only">Go to next page</span>
                        ›
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                      >
                        <span className="sr-only">Go to last page</span>
                        »»
                      </Button>
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="sm:hidden flex flex-col items-center gap-2">
                    <div className="text-sm font-medium">Page {currentPage} of {totalPages}</div>
                    <div className="grid grid-cols-4 gap-2 w-full">
                      <Button
                        variant="outline"
                        className="h-9 w-full p-0"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        ««
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 w-full p-0"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        ‹
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 w-full p-0"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        ›
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 w-full p-0"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                      >
                        »»
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Audit Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedAudit && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Audit Details
                </DialogTitle>
                <DialogDescription>
                  Complete audit information and responses
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Audit Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Audit Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Date:</span>
                        <span>{new Date(selectedAudit.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Line:</span>
                        <Badge variant="outline">{selectedAudit.line?.name || "N/A"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Machine:</span>
                        <Badge variant="outline">{selectedAudit.machine?.name || "N/A"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Unit:</span>
                        <Badge variant="outline">{selectedAudit.unit?.name || "N/A"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Line Leader:</span>
                        <span>{selectedAudit.lineLeader || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Shift Incharge:</span>
                        <span>{selectedAudit.shiftIncharge || "N/A"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Responses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Audit Responses ({selectedAudit.answers?.length || 0} questions)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(selectedAudit.answers || []).map((answer, idx) => {
                        const normalized = normalizeAnswer(answer.answer);
                        return (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-medium mb-2">
                                {idx + 1}. {answer.question?.questionText || "N/A"}
                              </p>
                              <div className="flex items-center gap-2">
                                {normalized === "Pass" && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Pass
                                  </Badge>
                                )}
                                {normalized === "Fail" && (
                                  <Badge variant="destructive">
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Fail
                                  </Badge>
                                )}
                                {normalized === "Not Applicable" && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                    <Clock className="mr-1 h-3 w-3" />
                                    Not Applicable
                                  </Badge>
                                )}
                                {!normalized && (
                                  <Badge variant="outline">{answer.answer || "N/A"}</Badge>
                                )}
                              </div>
                              {(normalized === "Fail" || normalized === "Not Applicable") && answer.remark && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                                  <p className="text-sm">
                                    <span className="font-medium text-red-800">Remark:</span>
                                    <span className="text-red-700 ml-2">{answer.remark}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
