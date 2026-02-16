import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useGetAuditByIdQuery } from "@/store/api";
import Loader from "@/components/ui/Loader";
import api from "@/utils/axios";

export default function EmployeeAuditResult() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { auditId } = useParams();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);

  // Admin-configurable form settings (title + line/machine fields)
  const [formSettings, setFormSettings] = useState({
    formTitle: "Part and Quality Audit Performance",
    lineField: { label: "Line", placeholder: "Select Line", enabled: true },
    machineField: { label: "Machine", placeholder: "Select Machine", enabled: true },
  });

  const { data: auditRes, isLoading: auditLoading } = useGetAuditByIdQuery(auditId, { skip: !auditId });
  useEffect(() => {
    setLoading(auditLoading);
    setAudit(auditRes?.data);
  }, [auditRes, auditLoading]);

  // Load dynamic form settings for the audit's department so labels/visibility match the current form
  useEffect(() => {
    if (!audit) return;

    let isMounted = true;
    const departmentId = audit.department?._id || audit.department || "";

    const fetchFormSettings = async () => {
      try {
        const res = await api.get("/api/audits/form-settings", {
          params: {
            ...(departmentId ? { department: departmentId } : {}),
          },
        });
        const setting = res?.data?.data;
        if (!setting || !isMounted) return;

        setFormSettings({
          formTitle: setting.formTitle || "Part and Quality Audit Performance",
          lineField: {
            label: setting.lineField?.label || "Line",
            placeholder: setting.lineField?.placeholder || "Select Line",
            enabled: setting.lineField?.enabled !== false,
          },
          machineField: {
            label: setting.machineField?.label || "Machine",
            placeholder: setting.machineField?.placeholder || "Select Machine",
            enabled: setting.machineField?.enabled !== false,
          },
        });
      } catch (error) {
        // Silently ignore if not configured yet
        console.error("Failed to load audit form settings for result view", error);
      }
    };

    fetchFormSettings();

    return () => {
      isMounted = false;
    };
  }, [audit]);

  const normalizeAnswer = (value) => {
    const val = (value || "").toString().toLowerCase();
    if (val === "yes" || val === "pass") return "Pass";
    if (val === "no" || val === "fail") return "Fail";
    if (val === "na" || val === "not applicable") return "Not Applicable";
    return value || "";
  };

  const lineFieldEnabled = formSettings?.lineField?.enabled !== false;
  const machineFieldEnabled = formSettings?.machineField?.enabled !== false;
  const lineLabel = formSettings?.lineField?.label || "Line";
  const machineLabel = formSettings?.machineField?.label || "Machine";

  if (loading) return <Loader />;
  if (!audit) return <div className="p-6 text-gray-700 text-center">No audit found.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto text-gray-900">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center sm:text-left">
        {formSettings.formTitle || "Audit Result"}
      </h1>

      {/* Audit Metadata */}
      <div className="bg-gray-100 p-4 sm:p-6 rounded-lg space-y-2 sm:space-y-3 border border-gray-300 shadow-sm">
        <div><strong>Date:</strong> {new Date(audit.date).toLocaleDateString()}</div>
        <div><strong>Department:</strong> {audit.department?.name || audit.department || "N/A"}</div>
        {lineFieldEnabled && (
          <div><strong>{lineLabel}:</strong> {audit.line?.name || audit.line || "N/A"}</div>
        )}
        {machineFieldEnabled && (
          <div><strong>{machineLabel}:</strong> {audit.machine?.name || audit.machine || "N/A"}</div>
        )}
        <div><strong>Unit:</strong> {audit.unit?.name || audit.unit || "N/A"}</div>
        <div><strong>Shift:</strong> {audit.shift || "N/A"}</div>
        {lineFieldEnabled && (
          <div><strong>{lineLabel} Rating:</strong> {audit.lineRating != null ? `${audit.lineRating}/10` : "N/A"}</div>
        )}
        {machineFieldEnabled && (
          <div><strong>{machineLabel} Rating:</strong> {audit.machineRating != null ? `${audit.machineRating}/10` : "N/A"}</div>
        )}
        <div><strong>Unit Rating:</strong> {audit.unitRating != null ? `${audit.unitRating}/10` : "N/A"}</div>
        <div><strong>Line Leader:</strong> {audit.lineLeader}</div>
        <div><strong>Shift Incharge:</strong> {audit.shiftIncharge}</div>
        <div><strong>Auditor:</strong> {audit.auditor?.fullName || "Unknown"}</div>
      </div>

      {/* Questions & Answers */}
      <h2 className="text-xl sm:text-2xl font-semibold mt-6 mb-2">
        Questions and Answers
      </h2>
      <div className="space-y-4">
        {audit.answers?.length > 0 ? (
          audit.answers.map((ans, idx) => {
            const normalized = normalizeAnswer(ans.answer);
            const isFail = normalized === "Fail";
            const isNa = normalized === "Not Applicable";

            let cardClasses = "border-gray-300";
            if (isFail) cardClasses = "border-red-400 bg-red-50";
            else if (isNa) cardClasses = "border-amber-300 bg-amber-50";

            return (
              <div
                key={idx}
                className={`bg-white p-4 sm:p-6 rounded-lg border shadow-sm ${cardClasses}`}
              >
                <p className="font-medium mb-1 text-sm sm:text-base">
                  {idx + 1}. {ans.question?.questionText || ans.question}
                </p>
                <p className="text-sm sm:text-base">
                  <strong>Answer:</strong>{" "}
                  {normalized === "Pass" && (
                    <span className="text-green-600 font-semibold">Pass</span>
                  )}
                  {normalized === "Fail" && (
                    <span className="text-red-600 font-semibold">Fail</span>
                  )}
                  {normalized === "Not Applicable" && (
                    <span className="text-amber-600 font-semibold">Not Applicable</span>
                  )}
                  {!normalized && (
                    <span className="text-gray-700 font-semibold">{ans.answer || "N/A"}</span>
                  )}
                </p>
                {(normalized === "Fail" || normalized === "Not Applicable") && ans.remark && (
                  <p className="text-sm sm:text-base text-gray-700">
                    <strong>Remark:</strong> {ans.remark}
                  </p>
                )}
                {ans.photos && ans.photos.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-sm mb-1">Photos:</p>
                    <div className="flex gap-2 flex-wrap">
                      {ans.photos.map((photo, photoIdx) => (
                        <img
                          key={photoIdx}
                          src={photo.url}
                          alt={`Photo ${photoIdx + 1}`}
                          className="w-16 h-16 rounded border object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-sm sm:text-base">
            No questions found for this audit.
          </p>
        )}
      </div>

      {/* Back Button */}
      <div className="mt-6 flex justify-center sm:justify-start">
        <button
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition text-sm sm:text-base"
          onClick={() => navigate("/employee/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
