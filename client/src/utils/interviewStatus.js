export function normalizeInterviewStatus(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'DRAFT' || value === 'SCHEDULED') return 'CREATED';
  if (value === 'LIVE') return 'ACTIVE';
  return value;
}
export const isInterviewActive = (status) => normalizeInterviewStatus(status) === 'ACTIVE';
export const isInterviewCompleted = (status) => normalizeInterviewStatus(status) === 'COMPLETED';
export const isInterviewCancelled = (status) => normalizeInterviewStatus(status) === 'CANCELLED';
