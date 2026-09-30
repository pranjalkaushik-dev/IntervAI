const CANONICAL = ['CREATED', 'WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

const LEGACY_TO_CANONICAL = {
  DRAFT: 'CREATED',
  SCHEDULED: 'CREATED',
  LIVE: 'ACTIVE'
};

const TRANSITIONS = {
  CREATED: ['WAITING', 'ACTIVE', 'CANCELLED'],
  WAITING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

const normalizeStatus = (status) => LEGACY_TO_CANONICAL[status] || status;

const isActiveStatus = (status) => normalizeStatus(status) === 'ACTIVE';
const isTerminalStatus = (status) => ['COMPLETED', 'CANCELLED'].includes(normalizeStatus(status));
const canJoinInterview = (status) => ['CREATED', 'WAITING', 'ACTIVE'].includes(normalizeStatus(status));
const canEnterLiveRoom = (status) => isActiveStatus(status);

const assertTransition = (from, to) => {
  const current = normalizeStatus(from);
  const next = normalizeStatus(to);
  if (current === next) return next;
  if (!TRANSITIONS[current] || !TRANSITIONS[current].includes(next)) {
    const error = new Error(`Interview cannot move from ${from} to ${to}.`);
    error.statusCode = 400;
    throw error;
  }
  return next;
};

const displayStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'ACTIVE') return 'Ongoing';
  if (normalized === 'CREATED') return 'Scheduled';
  if (normalized === 'WAITING') return 'Waiting';
  if (normalized === 'COMPLETED') return 'Completed';
  if (normalized === 'CANCELLED') return 'Cancelled';
  return status;
};

module.exports = {
  CANONICAL,
  normalizeStatus,
  isActiveStatus,
  isTerminalStatus,
  canJoinInterview,
  canEnterLiveRoom,
  assertTransition,
  displayStatus
};
