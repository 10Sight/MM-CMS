import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiImage, FiEye, FiX } from "react-icons/fi";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useGetAuditByIdQuery } from "@/store/api";
import Loader from "@/components/ui/Loader";
import api from "@/utils/axios";

export default function AuditDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Admin-configurable form settings (title + line/machine fields)
  const [formSettings, setFormSettings] = useState({
    formTitle: "Part and Quality Audit Performance",
    lineField: { label: "Line", placeholder: "Select Line", enabled: true },
    machineField: { label: "Machine", placeholder: "Select Machine", enabled: true },
  });

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setShowImageModal(false);
  };

  const { data: auditRes, isLoading: auditLoading } = useGetAuditByIdQuery(id, { skip: !id });
  useEffect(() => {
    setLoading(auditLoading);
    setAudit(auditRes?.data || null);
  }, [auditRes, auditLoading]);

  // Load dynamic form settings for this audit's department to drive labels/visibility
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
        console.error("Failed to load audit form settings for admin detail", error);
      }
    };

    fetchFormSettings();

    return () => {
      isMounted = false;
    };
  }, [audit]);

  const lineFieldEnabled = formSettings?.lineField?.enabled !== false;
  const machineFieldEnabled = formSettings?.machineField?.enabled !== false;
  const lineLabel = formSettings?.lineField?.label || "Line";
  const machineLabel = formSettings?.machineField?.label || "Machine";

  if (loading)
    return (
      <Loader />
    );
  if (!audit)
    return (
      <div className="p-6 text-gray-700 text-center">Audit not found.</div>
    );

  const answers = Array.isArray(audit.answers) ? audit.answers : [];
  const yesCount = answers.filter((a) => a.answer === "Yes" || a.answer === "Pass").length;
  const noCount = answers.filter((a) => a.answer === "No" || a.answer === "Fail").length;
  const naCount = answers.filter((a) => a.answer === "NA" || a.answer === "Not Applicable").length;
  const totalQuestions = answers.length;
  const consideredQuestions = yesCount + noCount; // exclude NA from percentage
  const passPercentage = consideredQuestions > 0 ? Math.round((yesCount / consideredQuestions) * 100) : 0;

  let overallStatus = "Not Applicable";
  let statusColor = "bg-gray-100 text-gray-800 border-gray-200";
  if (noCount > 0) {
    overallStatus = "Fail Audit";
    statusColor = "bg-red-50 text-red-800 border-red-200";
  } else if (yesCount > 0) {
    overallStatus = "Audit Pass";
    statusColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
  } else if (naCount > 0) {
    overallStatus = "Not Applicable";
    statusColor = "bg-amber-50 text-amber-800 border-amber-200";
  }

  const chartData = [
    { name: "Pass", value: yesCount },
    { name: "Fail", value: noCount },
    { name: "Not Applicable", value: naCount },
  ].filter((item) => item.value > 0);

  const chartColors = ["#22c55e", "#ef4444", "#f97316"]; // green, red, orange

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto text-gray-800">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Audit Details</h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md text-sm"
        >
          ← Back
        </button>
      </div>

      {/* Audit Metadata */}
      <div className="bg-gray-100 p-4 rounded-lg shadow-md border border-gray-300 mb-4 text-sm sm:text-base">
        <h2 className="text-lg font-semibold mb-2">
          {lineFieldEnabled && (
            <span>
              {lineLabel}: {audit.line?.name || "N/A"}
            </span>
          )}
          {lineFieldEnabled && machineFieldEnabled && " - "}
          {machineFieldEnabled && (
            <span>
              {machineLabel}: {audit.machine?.name || "N/A"}
            </span>
          )}
          {" "}
          ({audit.date ? new Date(audit.date).toLocaleDateString() : "N/A"})
        </h2>
        <p className="text-gray-600 mb-1">
          Department: {audit.department?.name || "N/A"} | Unit: {audit.unit?.name || "N/A"} | Shift: {audit.shift || "N/A"} | Auditor:{" "}
          {audit.auditor?.fullName || "N/A"} | Shift Incharge:{" "}
          {audit.shiftIncharge || "N/A"} | Line Leader: {audit.lineLeader || "N/A"}
        </p>
        <p className="text-gray-600 mb-1">
          {lineFieldEnabled && (
            <span>
              {lineLabel} Rating: {audit.lineRating != null ? `${audit.lineRating}/10` : "N/A"}
            </span>
          )}
          {lineFieldEnabled && machineFieldEnabled && " | "}
          {machineFieldEnabled && (
            <span>
              {machineLabel} Rating: {audit.machineRating != null ? `${audit.machineRating}/10` : "N/A"}
            </span>
          )}
        </p>
        <p className="text-gray-600 mb-1">
          Unit Rating: {audit.unitRating != null ? `${audit.unitRating}/10` : "N/A"}
        </p>
        <p className="text-gray-600">
          Created by: {audit.createdBy?.fullName || "N/A"}
        </p>
      </div>

      {/* Audit Summary */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* Overall status & percentage */}
        <div className={`md:col-span-1 border rounded-xl p-4 shadow-sm ${statusColor}`}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-500">
            Overall Result
          </p>
          <p className="text-xl font-bold mb-3">{overallStatus}</p>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-600">Pass percentage</span>
              <span className="text-2xl font-semibold">
                {consideredQuestions > 0 ? `${passPercentage}%` : "N/A"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${consideredQuestions > 0 ? passPercentage : 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Based on {consideredQuestions} Pass/Fail questions
              {naCount ? `, ${naCount} Not Applicable` : ""}.
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="md:col-span-2 border rounded-xl p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Question Breakdown
              </p>
              <p className="text-sm text-gray-600">
                Total Questions: <span className="font-medium">{totalQuestions}</span>
              </p>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                    paddingAngle={4}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No data available for chart.</p>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">
            <div className="flex flex-col">
              <span className="font-medium">Total Pass Questions</span>
              <span>{yesCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Total Fail Questions</span>
              <span>{noCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Total Not Applicable Questions</span>
              <span>{naCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Questions & Answers */}
      <div className="space-y-3">
        {/* Table for desktop */}
        {audit.answers?.length > 0 && (
          <div className="hidden sm:block overflow-x-auto">
            <table className="table-auto w-full border border-gray-300 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-200 text-gray-700">
                  <th className="px-4 py-2 border border-gray-300">#</th>
                  <th className="px-4 py-2 border border-gray-300">Question</th>
                  <th className="px-4 py-2 border border-gray-300">Answer</th>
                  <th className="px-4 py-2 border border-gray-300">Remark</th>
                  <th className="px-4 py-2 border border-gray-300">Photos</th>
                </tr>
              </thead>
              <tbody>
                {audit.answers.map((ans, idx) => (
                  <tr
                    key={ans._id}
                    className={`${
                      ans.answer === "No" ? "bg-red-100" : "bg-white"
                    } hover:bg-gray-50 transition`}
                  >
                    <td className="px-4 py-2 border border-gray-300 text-center">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2 border border-gray-300">
                      {ans.question?.questionText || "Question text missing"}
                    </td>
                    <td className="px-4 py-2 border border-gray-300 text-center font-medium">
                      {ans.answer}
                    </td>
                    <td className="px-4 py-2 border border-gray-300">
                      {ans.remark || "-"}
                    </td>
                    <td className="px-4 py-2 border border-gray-300">
                      {ans.photos && ans.photos.length > 0 ? (
                        <div className="flex gap-1 justify-center">
                          {ans.photos.slice(0, 3).map((photo, photoIdx) => (
                            <button
                              key={photoIdx}
                              onClick={() => openImageModal(photo.url)}
                              className="w-8 h-8 rounded border hover:opacity-75 transition"
                            >
                              <img
                                src={photo.url}
                                alt={`Photo ${photoIdx + 1}`}
                                className="w-full h-full object-cover rounded"
                              />
                            </button>
                          ))}
                          {ans.photos.length > 3 && (
                            <span className="text-xs text-gray-500 self-center">+{ans.photos.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Cards */}
        {audit.answers?.length > 0 && (
          <div className="sm:hidden space-y-3">
            {audit.answers.map((ans, idx) => (
              <div
                key={ans._id}
                className={`bg-white p-3 rounded-lg border shadow-sm ${
                  ans.answer === "No" ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              >
                <p className="font-semibold mb-1">
                  {idx + 1}. {ans.question?.questionText || "Question text missing"}
                </p>
                <p>
                  <span className="font-medium">Answer:</span> {ans.answer}
                </p>
                {ans.remark && (
                  <p>
                    <span className="font-medium">Remark:</span> {ans.remark}
                  </p>
                )}
                {ans.photos && ans.photos.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-sm mb-1">Photos:</p>
                    <div className="flex gap-2 flex-wrap">
                      {ans.photos.map((photo, photoIdx) => (
                        <button
                          key={photoIdx}
                          onClick={() => openImageModal(photo.url)}
                          className="w-16 h-16 rounded border hover:opacity-75 transition"
                        >
                          <img
                            src={photo.url}
                            alt={`Photo ${photoIdx + 1}`}
                            className="w-full h-full object-cover rounded"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!audit.answers?.length && (
          <p className="text-gray-500 mt-2">No questions found for this audit.</p>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Full size view"
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
