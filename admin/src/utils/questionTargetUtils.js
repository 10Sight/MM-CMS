/**
 * Average number of checklist questions answered per audit, derived from the
 * period data returned by /api/audits/metrics. Used to translate audit-based
 * targets into question-based targets since targets are only configured per audit.
 */
export const computeAvgQuestionsPerAudit = (dashboardMetrics) => {
  const totalPoints = dashboardMetrics.reduce((sum, m) => sum + (m.totalPoints || 0), 0);
  const totalActual = dashboardMetrics.reduce((sum, m) => sum + (m.actual || 0), 0);
  return totalActual > 0 ? totalPoints / totalActual : 0;
};

/**
 * Target question count for a single period/layer: falls back to the overall
 * average when the period/layer itself has no completed audits to derive a ratio from.
 */
export const computeTargetQuestions = (targetAudits, actualAudits, actualPoints, overallAvgQuestionsPerAudit) => {
  const ratio = actualAudits > 0 ? actualPoints / actualAudits : overallAvgQuestionsPerAudit;
  return targetAudits * ratio;
};
