import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  FileText,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Calendar,
  MinusCircle,
} from "lucide-react";
import { useGetAuditByIdQuery, useUpdateAuditMutation } from "@/store/api";
import Loader from "@/components/ui/Loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function AdminAuditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [updateAudit] = useUpdateAuditMutation();

  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    line: "",
    machine: "",
    process: "",
    unit: "",
    lineLeader: "",
    shift: "",
    shiftIncharge: "",
    answers: [],
  });

  const { data: auditRes, isLoading: auditLoading } = useGetAuditByIdQuery(id, { skip: !id });

  useEffect(() => {
    setLoading(auditLoading);
    const auditData = auditRes?.data;
    if (auditData) {
      setAudit(auditData);
      setFormData({
        line: auditData?.line?._id || "",
        machine: auditData?.machine?._id || "",
        process: auditData?.process?._id || "",
        unit: auditData?.unit?._id || "",
        lineLeader: auditData?.lineLeader || "",
        shift: auditData?.shift || "",
        shiftIncharge: auditData?.shiftIncharge || "",
        answers: Array.isArray(auditData?.answers)
          ? auditData.answers.map((a) => ({
            question: a?.question?._id || "",
            questionText: a?.question?.questionText || "",
            answer: a?.answer || "",
            remark: a?.remark || "",
          }))
          : [],
      });
    }
  }, [auditRes, auditLoading]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAnswerChange = (idx, field, value) => {
    setFormData((prev) => {
      const newAnswers = [...prev.answers];
      newAnswers[idx][field] = value;
      return { ...prev, answers: newAnswers };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await updateAudit({ id, ...formData }).unwrap();
      toast.success("Audit updated successfully");
      navigate(-1);
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || err?.message || "Failed to update audit");
    } finally {
      setSubmitting(false);
    }
  };


  if (loading)
    return <Loader />;
  if (!audit)
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Audit not found</p>
            <p className="text-sm text-muted-foreground mt-2">The requested audit could not be loaded</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto scroll-smooth">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Audit</h1>
            <p className="text-muted-foreground">Modify audit responses and details</p>
          </div>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Audit #{audit?.auditor?.fullName}
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Audit Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Audit Information
              </CardTitle>
              <CardDescription>
                Basic audit details and metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Date:</span>
                <span>{audit.date ? new Date(audit.date).toLocaleDateString() : "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Line:</span>
                <Badge variant="outline">{audit.line?.name || "N/A"}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Machine:</span>
                <Badge variant="outline">{audit.machine?.name || "N/A"}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Unit:</span>
                <Badge variant="outline">{audit.unit?.name || "N/A"}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Auditor:</span>
                <span>{audit.auditor?.fullName || "N/A"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personnel Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personnel Information
                </CardTitle>
                <CardDescription>
                  Update personnel details for this audit
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="lineLeader">Line Leader</Label>
                  <Input
                    id="lineLeader"
                    name="lineLeader"
                    value={formData.lineLeader}
                    onChange={handleChange}
                    placeholder="Enter line leader name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift">Shift</Label>
                  <Select
                    value={formData.shift}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, shift: value }))
                    }
                  >
                    <SelectTrigger id="shift">
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Shift 1">Shift 1</SelectItem>
                      <SelectItem value="Shift 2">Shift 2</SelectItem>
                      <SelectItem value="Shift 3">Shift 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shiftIncharge">Shift Incharge</Label>
                  <Input
                    id="shiftIncharge"
                    name="shiftIncharge"
                    value={formData.shiftIncharge}
                    onChange={handleChange}
                    placeholder="Enter shift incharge name"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Audit Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Audit Questions ({formData.answers.length})
                </CardTitle>
                <CardDescription>
                  Review and update responses to audit questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {formData.answers.map((ans, idx) => (
                    <Card key={idx} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <p className="font-medium text-foreground">
                              {ans.questionText}
                            </p>

                            <div className="space-y-2">
                              <Label>Response</Label>
                              <Select
                                value={ans.answer}
                                onValueChange={(value) =>
                                  handleAnswerChange(idx, "answer", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pass">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      Pass
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Fail">
                                    <div className="flex items-center gap-2">
                                      <XCircle className="h-4 w-4 text-red-500" />
                                      Fail
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="NA">
                                    <div className="flex items-center gap-2">
                                      <MinusCircle className="h-4 w-4 text-amber-500" />
                                      Not Applicable
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {(ans.answer === "No" || ans.answer === "Fail" || ans.answer === "NA") && (
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  Remark
                                </Label>
                                <Textarea
                                  placeholder="Please provide details about the issue..."
                                  value={ans.remark}
                                  onChange={(e) =>
                                    handleAnswerChange(idx, "remark", e.target.value)
                                  }
                                  className="min-h-[80px]"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Audit
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
