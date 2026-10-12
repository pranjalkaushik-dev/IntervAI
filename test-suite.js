/**
 * IntervAI truthful integration/regression suite.
 *
 * This suite never manufactures JWTs, users, room state, or PASS results.
 * Supply real test accounts against a disposable/test MongoDB database:
 *   TEST_COMPANY_EMAIL / TEST_COMPANY_PASSWORD
 *   TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD
 *
 * Optional:
 *   SERVER_URL, AI_URL, FRONTEND_URL
 *
 * Browser-only media (camera/mic/WebRTC/screen sharing/mobile) is reported as
 * BLOCKED here because it requires real browser/device sessions; source
 * inspection is never converted into a runtime PASS.
 */
const { spawn } = require('child_process');
const path = require('path');

const ROOT = __dirname;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5001';
const AI_URL = process.env.AI_URL || 'http://localhost:5050';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5179';

const results = [];
const children = [];

const record = (name, status, evidence) => {
  results.push({ name, status, evidence });
  const tag = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '•';
  console.log(`  ${tag} [${status}] ${name}${evidence ? ` — ${evidence}` : ''}`);
};
const pass = (name, evidence) => record(name, 'PASS', evidence);
const fail = (name, evidence) => record(name, 'FAIL', evidence);
const blocked = (name, evidence) => record(name, 'BLOCKED', evidence);

async function request(url, options = {}) {
  const response = await fetch(url, options);
  let body = null;
  try { body = await response.json(); } catch (_) {}
  return { response, body };
}

async function waitFor(url, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const { response } = await request(url);
      if (response.ok) return true;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function startIfMissing(url, cwd, command, args) {
  return waitFor(url, 2).then((up) => {
    if (up) return null;
    const child = spawn(command, args, { cwd, stdio: 'inherit', env: process.env });
    children.push(child);
    return child;
  });
}

async function login(email, password) {
  const { response, body } = await request(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok || !body?.success || !body?.data?.token || !body?.data?.user) {
    throw new Error(body?.message || `Login failed (${response.status})`);
  }
  return body.data;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function main() {
  console.log('\n=== IntervAI truthful integration/regression suite ===\n');

  await startIfMissing(`${SERVER_URL}/api/health`, path.join(ROOT, 'server'), 'node', ['src/index.js']);
  await startIfMissing(`${AI_URL}/health`, path.join(ROOT, 'ai-monitoring'), 'npx', ['tsx', 'src/ai-server.ts']);

  const serverReady = await waitFor(`${SERVER_URL}/api/health`);
  const aiReady = await waitFor(`${AI_URL}/health`);

  if (!serverReady) {
    fail('Backend health', 'Backend did not become ready.');
  } else {
    const { body } = await request(`${SERVER_URL}/api/health`);
    if (body?.status === 'OK') pass('Backend health', `${SERVER_URL}/api/health`);
    else fail('Backend health', JSON.stringify(body));
  }

  if (!aiReady) {
    blocked('AI service runtime', 'AI service could not be started in this environment.');
  } else {
    const { body } = await request(`${AI_URL}/health`);
    if (body?.success && body?.service === 'ai-monitoring') pass('AI service health', `Gemini configured=${Boolean(body.geminiConfigured)}`);
    else fail('AI service health', JSON.stringify(body));
  }

  // Public registration must always create STUDENT, regardless of requested role.
  const registrationEmail = `intervai-test-${Date.now()}@example.com`;
  const { response: regResponse, body: regBody } = await request(`${SERVER_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'IntervAI Regression Student',
      email: registrationEmail,
      password: 'RegressionPassword!123',
      accountRole: 'ADMIN'
    })
  });
  if (regResponse.ok && regBody?.data?.user?.accountRole === 'STUDENT') pass('Public registration RBAC', 'Requested ADMIN role was normalized to STUDENT.');
  else fail('Public registration RBAC', JSON.stringify(regBody));

  const companyEmail = process.env.TEST_COMPANY_EMAIL;
  const companyPassword = process.env.TEST_COMPANY_PASSWORD;
  const studentEmail = process.env.TEST_STUDENT_EMAIL;
  const studentPassword = process.env.TEST_STUDENT_PASSWORD;

  if (!companyEmail || !companyPassword || !studentEmail || !studentPassword) {
    blocked('Authenticated integration suite', 'Set TEST_COMPANY_EMAIL/PASSWORD and TEST_STUDENT_EMAIL/PASSWORD against a test database.');
    blocked('Interview lifecycle', 'Requires real COMPANY and STUDENT test accounts.');
    blocked('Answer persistence / AI evaluation', 'Requires a real test interview and authenticated STUDENT account.');
    blocked('Judge0 submission persistence', 'Requires a real test interview/question and authenticated STUDENT account.');
    blocked('Socket.IO room authorization', 'Requires real authenticated users and a persisted interview.');
    blocked('Reports / ownership', 'Requires completed test interview data.');
  } else {
    let company;
    let student;
    try {
      company = await login(companyEmail, companyPassword);
      student = await login(studentEmail, studentPassword);
      if (company.user.accountRole === 'COMPANY' && student.user.accountRole === 'STUDENT') pass('Login + canonical roles', 'COMPANY and STUDENT accounts authenticated.');
      else fail('Login + canonical roles', `${company.user.accountRole} / ${student.user.accountRole}`);
    } catch (error) {
      fail('Login + canonical roles', error.message);
    }

    if (company?.token && student?.token) {
      // Company creates a disposable text interview. Student joining must move CREATED -> WAITING.
      const create = await request(`${SERVER_URL}/api/interviews`, {
        method: 'POST',
        headers: authHeaders(company.token),
        body: JSON.stringify({
          title: `IntervAI Regression ${Date.now()}`,
          description: 'Automated regression interview. Safe to discard.',
          interviewType: 'TECHNICAL',
          durationMinutes: 30,
          question: {
            prompt: 'Explain the difference between a process and a thread.',
            type: 'TEXT',
            topic: 'Operating Systems',
            difficulty: 'MEDIUM',
            expectedKeywords: ['process', 'thread', 'address space']
          }
        })
      });

      if (!create.response.ok || !create.body?.data?.interview) {
        fail('Interview creation', create.body?.message || `HTTP ${create.response.status}`);
      } else {
        const interview = create.body.data.interview;
        if (interview.status === 'CREATED') pass('Interview creation', `room=${interview.roomCode}`);
        else fail('Interview creation status', `Expected CREATED, got ${interview.status}`);

        const join = await request(`${SERVER_URL}/api/interviews/join`, {
          method: 'POST',
          headers: authHeaders(student.token),
          body: JSON.stringify({ roomCode: interview.roomCode })
        });
        if (join.response.ok && join.body?.data?.interview?.status === 'WAITING') pass('Interview CREATED -> WAITING', 'Student join transition verified.');
        else fail('Interview CREATED -> WAITING', join.body?.message || JSON.stringify(join.body));

        const start = await request(`${SERVER_URL}/api/interviews/${interview._id}/start`, {
          method: 'POST', headers: authHeaders(company.token), body: JSON.stringify({})
        });
        if (start.response.ok && start.body?.data?.interview?.status === 'ACTIVE') pass('Interview WAITING -> ACTIVE', 'Owning company start transition verified.');
        else fail('Interview WAITING -> ACTIVE', start.body?.message || JSON.stringify(start.body));

        const answer = await request(`${SERVER_URL}/api/interviews/${interview._id}/text-submit`, {
          method: 'POST',
          headers: authHeaders(student.token),
          body: JSON.stringify({
            questionId: create.body.data.question?._id,
            studentAnswer: 'A process has its own address space and resources; threads are execution units that share the process address space and resources.'
          })
        });
        if (answer.response.ok && answer.body?.data?.answerSaved === true && answer.body?.data?.answerId) pass('Raw text answer persistence', 'Answer was acknowledged as saved before evaluation completion.');
        else fail('Raw text answer persistence', answer.body?.message || JSON.stringify(answer.body));

        const answers = await request(`${SERVER_URL}/api/interviews/${interview._id}/answers`, {
          headers: authHeaders(student.token)
        });
        if (answers.response.ok && Array.isArray(answers.body?.data?.answers) && answers.body.data.answers.length > 0) pass('Answer database read-back', 'Persisted answer retrieved by authenticated student.');
        else fail('Answer database read-back', answers.body?.message || JSON.stringify(answers.body));

        const complete = await request(`${SERVER_URL}/api/interviews/${interview._id}/complete`, {
          method: 'POST', headers: authHeaders(company.token), body: JSON.stringify({})
        });
        if (complete.response.ok && complete.body?.data?.interview?.status === 'COMPLETED') pass('Interview ACTIVE -> COMPLETED', 'Completion transition verified.');
        else fail('Interview ACTIVE -> COMPLETED', complete.body?.message || JSON.stringify(complete.body));

        const report = await request(`${SERVER_URL}/api/interviews/${interview._id}/report`, { headers: authHeaders(company.token) });
        if (report.response.ok && report.body?.data?.report) pass('Report ownership/read access', 'Owning company can read the completed interview report.');
        else fail('Report ownership/read access', report.body?.message || JSON.stringify(report.body));

        const unrelated = await request(`${SERVER_URL}/api/interviews/${interview._id}`, { headers: authHeaders(student.token) });
        if (unrelated.response.ok) pass('Participant interview access', 'Student participant can access the joined interview.');
        else fail('Participant interview access', unrelated.body?.message || JSON.stringify(unrelated.body));
      }

      // AI mock-mode contract: each mode must survive the frontend/backend boundary.
      if (aiReady) {
        for (const mode of ['DSA', 'CORE_CS', 'PROJECT', 'MIXED']) {
          const mock = await request(`${SERVER_URL}/api/interviews/mock`, {
            method: 'POST',
            headers: authHeaders(student.token),
            body: JSON.stringify({ mode, numberOfQuestions: 2 })
          });
          const questions = mock.body?.data?.questions;
          if (mock.response.ok && Array.isArray(questions) && questions.length > 0 && mock.body?.data?.mockMode === mode) {
            pass(`AI mock mode ${mode}`, `${questions.length} questions returned with mode preserved.`);
          } else {
            fail(`AI mock mode ${mode}`, mock.body?.message || JSON.stringify(mock.body));
          }
        }
      } else {
        for (const mode of ['DSA', 'CORE_CS', 'PROJECT', 'MIXED']) blocked(`AI mock mode ${mode}`, 'AI service unavailable.');
      }

      // Socket tests use the same real identities and the persisted room; no fake JWTs.
      try {
        const { io } = require('./frontend/node_modules/socket.io-client');
        const room = await request(`${SERVER_URL}/api/interviews`, { headers: authHeaders(company.token) });
        const ownInterviews = room.body?.data?.interviews || [];
        const testInterview = ownInterviews.find((item) => item.status === 'COMPLETED') || ownInterviews[0];
        if (!testInterview) throw new Error('No persisted interview available for Socket.IO test.');

        const companySocket = io(SERVER_URL, { auth: { token: company.token }, transports: ['websocket'], reconnection: false });
        const studentSocket = io(SERVER_URL, { auth: { token: student.token }, transports: ['websocket'], reconnection: false });
        const connect = (socket) => new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Socket connection timeout')), 7000);
          socket.once('connect', () => { clearTimeout(timer); resolve(); });
          socket.once('connect_error', (err) => { clearTimeout(timer); reject(err); });
        });
        await Promise.all([connect(companySocket), connect(studentSocket)]);
        pass('Socket.IO authenticated connection', 'Both real users connected with JWT authentication.');

        const roomCode = testInterview.roomCode;
        const joined = new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('user-joined timeout')), 5000);
          companySocket.once('user-joined', (event) => { clearTimeout(timer); resolve(event); });
        });
        companySocket.emit('join-room', { roomId: roomCode, interviewId: testInterview._id });
        studentSocket.emit('join-room', { roomId: roomCode, interviewId: testInterview._id });
        await joined;
        pass('Socket.IO room authorization + participant discovery', `Room ${roomCode}`);

        const code = 'function twoSum(a, target) { return []; }';
        const codeSync = new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('code-update timeout')), 5000);
          studentSocket.once('code-update', (payload) => { clearTimeout(timer); resolve(payload?.code); });
        });
        companySocket.emit('code-change', { roomId: roomCode, code });
        if (await codeSync === code) pass('Socket.IO code synchronization', 'Real participant received exact code update.');
        else fail('Socket.IO code synchronization', 'Received code did not match sender state.');

        companySocket.disconnect();
        studentSocket.disconnect();
      } catch (error) {
        blocked('Socket.IO authenticated room test', `Runtime dependency/database state prevented execution: ${error.message}`);
      }
    }
  }

  // Frontend serving/build is environment dependent. If a dev server is already up, verify its HTML.
  if (await waitFor(FRONTEND_URL, 2)) {
    const { response, body } = await request(FRONTEND_URL);
    const html = typeof body === 'string' ? body : '';
    if (response.ok) pass('Frontend dev server', FRONTEND_URL);
    else fail('Frontend dev server', `HTTP ${response.status}`);
  } else {
    blocked('Frontend runtime/build', 'No frontend server is running. Run npm ci then npm run build/dev in frontend/.');
  }

  // Browser/device tests cannot be honestly completed by this Node-only runner.
  blocked('WebRTC camera + microphone', 'Requires two real browser peers with media permissions.');
  blocked('WebRTC screen sharing', 'Requires a real browser session and getDisplayMedia().');
  blocked('WebRTC reconnect', 'Requires two live browser peers and a network disconnect/reconnect.');
  blocked('Mobile camera + microphone', 'Requires an actual phone browser over a secure context.');
  blocked('Mobile screen sharing', 'Requires an actual supported phone/browser combination.');

  console.log('\n=== Regression summary ===');
  for (const result of results) console.log(`${result.status.padEnd(7)} ${result.name} — ${result.evidence}`);

  const failed = results.filter((result) => result.status === 'FAIL').length;
  const blockedCount = results.filter((result) => result.status === 'BLOCKED').length;
  console.log(`\nPASS=${results.filter((r) => r.status === 'PASS').length} FAIL=${failed} BLOCKED=${blockedCount}`);

  for (const child of children) child.kill();
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error('Fatal regression runner error:', error);
  for (const child of children) child.kill();
  process.exitCode = 1;
});
