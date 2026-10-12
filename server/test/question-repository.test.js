const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const User = require('../src/modules/auth/auth.model');
const Interview = require('../src/modules/interviews/interview.model');
const Question = require('../src/modules/questions/question.model');
const PracticeSubmission = require('../src/modules/coding/practice-submission.model');
const Submission = require('../src/modules/coding/submission.model');
const InterviewReport = require('../src/modules/interviews/report.model');

const {
  createQuestion,
  updateQuestion,
  togglePublishQuestion,
  assignQuestionToInterview,
  getQuestionById,
  getQuestionLibrary,
  getPracticeQuestions,
  getCompaniesForPractice,
  bulkCreateQuestions,
  deleteQuestion,
  sanitizeQuestionForClient
} = require('../src/modules/questions/question.controller');

const {
  runPracticeCode,
  submitPracticeCode,
  getPracticeSubmissions
} = require('../src/modules/coding/coding.controller');

// Mock Express response helper
function mockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
}

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    } catch {
      await mongoose.connect('mongodb://127.0.0.1:27017/intervai', { serverSelectionTimeoutMS: 3000 });
    }
  }
});

test.after(async () => {
  // Cleanup test artifacts
  await User.deleteMany({ email: /@test-repo-suite\.com$/ });
  await Question.deleteMany({ prompt: /\[TEST-SUITE\]/ });
  await PracticeSubmission.deleteMany({ sourceCode: /TEST-PRACTICE-SUITE/ });
  await mongoose.disconnect();
});

test('Company Isolation: Company A cannot see or edit Company B questions', async () => {
  const companyA = await User.create({
    fullName: 'Company Alpha',
    email: `alpha-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'COMPANY'
  });

  const companyB = await User.create({
    fullName: 'Company Beta',
    email: `beta-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'COMPANY'
  });

  // Company A creates private question
  const reqA = {
    user: companyA,
    body: {
      title: 'Alpha Private Problem',
      prompt: '[TEST-SUITE] Internal problem only for Company A',
      type: 'CODING',
      topic: 'Algorithms',
      difficulty: 'HARD',
      isPublished: false,
      solution: 'secret-alpha-solution',
      hiddenTests: [{ input: '10', expected: '20' }]
    }
  };
  const resA = mockRes();
  await createQuestion(reqA, resA);
  assert.equal(resA.statusCode, 201);
  const qA = resA.data.data.question;

  // Company B fetches library
  const reqB = { user: companyB, query: {} };
  const resB = mockRes();
  await getQuestionLibrary(reqB, resB);
  assert.equal(resB.statusCode, 200);
  const betaQuestions = resB.data.data.questions;
  const leaked = betaQuestions.find((q) => q._id.toString() === qA._id.toString());
  assert.equal(leaked, undefined, 'Company A private question leaked into Company B library!');

  // Company B attempts direct GET
  const reqBGet = { user: companyB, params: { id: qA._id } };
  const resBGet = mockRes();
  await getQuestionById(reqBGet, resBGet);
  assert.equal(resBGet.statusCode, 403, 'Company B should be denied (403) viewing Company A private question');

  // Company B attempts update
  const reqBUpdate = { user: companyB, params: { id: qA._id }, body: { title: 'Hacked Title' } };
  const resBUpdate = mockRes();
  await updateQuestion(reqBUpdate, resBUpdate);
  assert.equal(resBUpdate.statusCode, 403, 'Company B should be denied (403) updating Company A question');

  // Company B attempts delete
  const reqBDelete = { user: companyB, params: { id: qA._id } };
  const resBDelete = mockRes();
  await deleteQuestion(reqBDelete, resBDelete);
  assert.equal(resBDelete.statusCode, 403, 'Company B should be denied (403) deleting Company A question');
});

test('Candidate Access: Can access published practice questions, denied private questions', async () => {
  const company = await User.create({
    fullName: 'Acme Corp',
    email: `acme-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'COMPANY'
  });

  const student = await User.create({
    fullName: 'Jane Student',
    email: `jane-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'STUDENT'
  });

  // Create published question
  const pubQ = await Question.create({
    companyId: company._id,
    createdBy: company._id,
    title: 'Published Two Sum',
    prompt: '[TEST-SUITE] Find two numbers that add up to target',
    type: 'CODING',
    topic: 'Arrays',
    difficulty: 'EASY',
    isPublished: true,
    examples: [{ input: '[2, 7], 9', output: '[0, 1]' }],
    solution: 'private-company-solution',
    hiddenTests: [{ input: '[1, 2, 3], 5', expected: '[1, 2]' }]
  });

  // Create unpublished question
  const privQ = await Question.create({
    companyId: company._id,
    createdBy: company._id,
    title: 'Private Assessment Problem',
    prompt: '[TEST-SUITE] Unpublished company assessment',
    type: 'CODING',
    difficulty: 'HARD',
    isPublished: false,
    solution: 'top-secret'
  });

  // Student fetches practice questions
  const reqPrac = { user: student, query: {} };
  const resPrac = mockRes();
  await getPracticeQuestions(reqPrac, resPrac);
  assert.equal(resPrac.statusCode, 200);

  const practiceList = resPrac.data.data.questions;
  const hasPublished = practiceList.some((q) => q._id.toString() === pubQ._id.toString());
  const hasPrivate = practiceList.some((q) => q._id.toString() === privQ._id.toString());

  assert.equal(hasPublished, true, 'Student should see published question');
  assert.equal(hasPrivate, false, 'Student should NOT see private unpublished question');

  // Student attempts direct access to private question -> 403 Forbidden
  const reqPrivGet = { user: student, params: { id: privQ._id } };
  const resPrivGet = mockRes();
  await getQuestionById(reqPrivGet, resPrivGet);
  assert.equal(resPrivGet.statusCode, 403, 'Direct access to unpublished question must return 403');
});

test('Data Sanitization: Hidden tests and solutions are NEVER exposed to candidates', async () => {
  const company = await User.create({
    fullName: 'Security Test Co',
    email: `sec-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'COMPANY'
  });

  const student = await User.create({
    fullName: 'Security Student',
    email: `student-sec-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'STUDENT'
  });

  const question = await Question.create({
    companyId: company._id,
    createdBy: company._id,
    title: 'Secret Test Problem',
    prompt: '[TEST-SUITE] Public prompt',
    type: 'CODING',
    difficulty: 'MEDIUM',
    isPublished: true,
    examples: [{ input: '1', output: '2' }],
    solution: 'SECRET_REFERENCE_CODE',
    referenceSolution: 'SECRET_REFERENCE_SOLUTION',
    hiddenTests: [{ input: '999', expected: '1000' }],
    correctOptionIndex: 2,
    testCases: [{ input: 'hidden-input', expected: 'hidden-expected' }]
  });

  // Student requests question
  const req = { user: student, params: { id: question._id } };
  const res = mockRes();
  await getQuestionById(req, res);

  assert.equal(res.statusCode, 200);
  const data = res.data.data.question;

  assert.equal(data.solution, undefined, 'solution must be deleted');
  assert.equal(data.referenceSolution, undefined, 'referenceSolution must be deleted');
  assert.equal(data.hiddenTests, undefined, 'hiddenTests must be deleted');
  assert.equal(data.correctOptionIndex, undefined, 'correctOptionIndex must be deleted');
  assert.equal(data.testCases, undefined, 'testCases must be deleted');
  assert.equal(data.examples.length, 1, 'public examples should remain');
});

test('Interview Assignment Snapshot: Preserves historical integrity on repository edits', async () => {
  const company = await User.create({
    fullName: 'Snapshot Co',
    email: `snap-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'COMPANY'
  });

  const interview = await Interview.create({
    title: 'Scheduled Interview Alpha',
    roomCode: `SNAP${Math.floor(Math.random() * 9000 + 1000)}`,
    createdBy: company._id,
    status: 'CREATED'
  });

  const repoQuestion = await Question.create({
    companyId: company._id,
    createdBy: company._id,
    title: 'Initial Problem Title',
    prompt: '[TEST-SUITE] Initial prompt description',
    type: 'CODING',
    difficulty: 'EASY',
    isPublished: true
  });

  // Assign to interview -> snapshots question
  const assignReq = {
    user: company,
    body: {
      questionId: repoQuestion._id,
      interviewId: interview._id
    }
  };
  const assignRes = mockRes();
  await assignQuestionToInterview(assignReq, assignRes);
  assert.equal(assignRes.statusCode, 201);
  const snapshotQ = assignRes.data.data.question;
  assert.notEqual(snapshotQ._id.toString(), repoQuestion._id.toString(), 'Snapshot must have a new distinct ID');
  assert.equal(snapshotQ.interview.toString(), interview._id.toString());

  // Company later updates the repository question
  const updateReq = {
    user: company,
    params: { id: repoQuestion._id },
    body: {
      title: 'Completely Changed Title',
      prompt: '[TEST-SUITE] Modified prompt text',
      difficulty: 'HARD'
    }
  };
  const updateRes = mockRes();
  await updateQuestion(updateReq, updateRes);
  assert.equal(updateRes.statusCode, 200);

  // Verify interview snapshot remains intact
  const refreshedSnapshot = await Question.findById(snapshotQ._id).lean();
  assert.equal(refreshedSnapshot.title, 'Initial Problem Title', 'Interview snapshot title was altered!');
  assert.equal(refreshedSnapshot.difficulty, 'EASY', 'Interview snapshot difficulty was altered!');
  assert.equal(refreshedSnapshot.prompt, '[TEST-SUITE] Initial prompt description', 'Interview snapshot prompt was altered!');
});

test('Practice Isolation: Code execution and submission do not affect official interviews', async () => {
  const student = await User.create({
    fullName: 'Practice Student',
    email: `prac-stud-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'STUDENT'
  });

  const question = await Question.create({
    companyId: student._id,
    createdBy: student._id,
    title: 'Practice JavaScript Sum',
    prompt: '[TEST-SUITE] Print 42',
    type: 'CODING',
    difficulty: 'EASY',
    isPublished: true,
    examples: [{ input: '', output: '42' }]
  });

  const initialInterviewCount = await Interview.countDocuments();
  const initialOfficialSubmissions = await Submission.countDocuments();
  const initialReports = await InterviewReport.countDocuments();

  // Practice run
  const runReq = {
    user: student,
    body: {
      questionId: question._id,
      sourceCode: 'console.log(42);',
      languageId: 63
    }
  };
  const runRes = mockRes();
  await runPracticeCode(runReq, runRes);
  assert.equal(runRes.statusCode, 200);

  // Practice submit
  const subReq = {
    user: student,
    body: {
      questionId: question._id,
      sourceCode: 'console.log(42); // TEST-PRACTICE-SUITE',
      languageId: 63,
      languageName: 'javascript'
    }
  };
  const subRes = mockRes();
  await submitPracticeCode(subReq, subRes);
  assert.equal(subRes.statusCode, 200);
  assert.equal(subRes.data.data.status, 'PASSED');

  // Verify official interview models were completely untouched
  const afterInterviewCount = await Interview.countDocuments();
  const afterOfficialSubmissions = await Submission.countDocuments();
  const afterReports = await InterviewReport.countDocuments();

  assert.equal(afterInterviewCount, initialInterviewCount, 'Practice created or altered official Interview!');
  assert.equal(afterOfficialSubmissions, initialOfficialSubmissions, 'Practice created an official interview Submission!');
  assert.equal(afterReports, initialReports, 'Practice generated an official InterviewReport!');

  // Verify practice submission was recorded in PracticeSubmission
  const practiceRecord = await PracticeSubmission.findOne({
    studentId: student._id,
    questionId: question._id
  }).lean();
  assert.ok(practiceRecord, 'PracticeSubmission must be recorded');
  assert.equal(practiceRecord.status, 'PASSED');
});

test('Publish Toggle: Company can toggle publication status', async () => {
  const company = await User.create({
    fullName: 'Toggle Co',
    email: `toggle-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'COMPANY'
  });

  const question = await Question.create({
    companyId: company._id,
    createdBy: company._id,
    title: 'Toggleable Question',
    prompt: '[TEST-SUITE] Testing toggle status',
    type: 'THEORY',
    isPublished: false
  });

  // Toggle to published
  const toggleReq1 = { user: company, params: { id: question._id } };
  const toggleRes1 = mockRes();
  await togglePublishQuestion(toggleReq1, toggleRes1);
  assert.equal(toggleRes1.statusCode, 200);
  assert.equal(toggleRes1.data.data.question.isPublished, true);

  // Toggle back to unpublished
  const toggleReq2 = { user: company, params: { id: question._id } };
  const toggleRes2 = mockRes();
  await togglePublishQuestion(toggleReq2, toggleRes2);
  assert.equal(toggleRes2.statusCode, 200);
  assert.equal(toggleRes2.data.data.question.isPublished, false);
});

test('Mixed Types & Discovery: Theory, MCQ, System Design support and candidate filtering', async () => {
  const company = await User.create({
    fullName: 'Mixed Corp',
    email: `mixed-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'COMPANY'
  });

  const student = await User.create({
    fullName: 'Filtering Candidate',
    email: `student-filter-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'STUDENT'
  });

  // Create Theory question
  await Question.create({
    companyId: company._id,
    createdBy: company._id,
    title: 'CAP Theorem In Depth',
    prompt: '[TEST-SUITE] Explain partition tolerance in distributed databases',
    type: 'THEORY',
    topic: 'System Design',
    difficulty: 'MEDIUM',
    isPublished: true
  });

  // Create MCQ question
  await Question.create({
    companyId: company._id,
    createdBy: company._id,
    title: 'JavaScript Event Loop MCQ',
    prompt: '[TEST-SUITE] Which executes first: microtask or macrotask?',
    type: 'MCQ',
    topic: 'JavaScript',
    difficulty: 'EASY',
    options: ['Microtask', 'Macrotask', 'Both concurrently', 'None'],
    correctOptionIndex: 0,
    isPublished: true
  });

  // Create System Design question
  await Question.create({
    companyId: company._id,
    createdBy: company._id,
    title: 'URL Shortener Architecture',
    prompt: '[TEST-SUITE] Design a highly available URL shortener like bit.ly',
    type: 'SYSTEM_DESIGN',
    topic: 'Architecture',
    difficulty: 'HARD',
    isPublished: true
  });

  // Student fetches companies offering practice questions
  const compReq = { user: student };
  const compRes = mockRes();
  await getCompaniesForPractice(compReq, compRes);
  assert.equal(compRes.statusCode, 200);
  const foundCompany = compRes.data.data.companies.find((c) => c._id.toString() === company._id.toString());
  assert.ok(foundCompany, 'Company should be discoverable in practice company list');

  // Student filters by MCQ type
  const mcqReq = { user: student, query: { companyId: company._id.toString(), type: 'MCQ' } };
  const mcqRes = mockRes();
  await getPracticeQuestions(mcqReq, mcqRes);
  assert.equal(mcqRes.statusCode, 200);
  const mcqList = mcqRes.data.data.questions;
  assert.ok(mcqList.length >= 1);
  assert.ok(mcqList.every((q) => q.type === 'MCQ'));
  // Ensure correctOptionIndex is NOT exposed in the sanitized list
  assert.equal(mcqList[0].correctOptionIndex, undefined, 'MCQ answer must NOT be leaked');

  // Student filters by THEORY type
  const theoryReq = { user: student, query: { companyId: company._id.toString(), type: 'THEORY' } };
  const theoryRes = mockRes();
  await getPracticeQuestions(theoryReq, theoryRes);
  assert.equal(theoryRes.statusCode, 200);
  const theoryList = theoryRes.data.data.questions;
  assert.ok(theoryList.length >= 1);
  assert.ok(theoryList.every((q) => q.type === 'THEORY'));
});

test('Bulk Direct Persistence: Save generated questions directly to library without interview', async () => {
  const company = await User.create({
    fullName: 'GenAI Company',
    email: `genai-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'COMPANY'
  });

  const bulkReq = {
    user: company,
    body: {
      isPublished: true,
      questions: [
        {
          title: 'Direct Saved Problem 1',
          prompt: '[TEST-SUITE] AI Generated problem 1',
          type: 'CODING',
          difficulty: 'MEDIUM',
          tags: ['AI-Generated']
        },
        {
          title: 'Direct Saved Problem 2',
          prompt: '[TEST-SUITE] AI Generated problem 2',
          type: 'THEORY',
          difficulty: 'EASY',
          tags: ['AI-Generated']
        }
      ]
    }
  };
  const bulkRes = mockRes();
  await bulkCreateQuestions(bulkReq, bulkRes);
  assert.equal(bulkRes.statusCode, 201);
  assert.equal(bulkRes.data.data.count, 2);

  // Verify questions exist in company library with company ownership
  const libReq = { user: company, query: { search: 'Direct Saved' } };
  const libRes = mockRes();
  await getQuestionLibrary(libReq, libRes);
  assert.equal(libRes.statusCode, 200);
  const found = libRes.data.data.questions;
  assert.equal(found.length, 2);
  assert.equal(found[0].companyId._id.toString(), company._id.toString());
  assert.equal(found[0].interview, null, 'Repository questions must not require an interview link');
});

test('Phase 2 Evaluation: Java Two Sum execution matches [0,1] vs [0, 1] with 100% score', async () => {
  const student = await User.create({
    fullName: 'Java Developer',
    email: `java-dev-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'STUDENT'
  });

  const question = await Question.create({
    companyId: student._id,
    createdBy: student._id,
    title: 'Two Sum Problem',
    prompt: '[TEST-SUITE] Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    type: 'CODING',
    difficulty: 'EASY',
    isPublished: true,
    testCases: [
      {
        id: 'tc-1',
        input: '',
        expected: '[0,1]'
      }
    ]
  });

  const javaSource = `import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }

    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        int[] result = twoSum(nums, target);
        System.out.println(Arrays.toString(result));
    }
}`;

  const subReq = {
    user: student,
    body: {
      questionId: question._id,
      sourceCode: javaSource,
      languageId: 62,
      languageName: 'java'
    }
  };
  const subRes = mockRes();
  await submitPracticeCode(subReq, subRes);
  assert.equal(subRes.statusCode, 200);
  assert.equal(subRes.data.data.score, 100);
  assert.equal(subRes.data.data.status, 'PASSED');
  assert.equal(subRes.data.data.passedCount, 1);
  assert.equal(subRes.data.data.testResults[0].passed, true);
});

test('Phase 2 Evaluation: Incorrect solution produces FAILED status with score 0', async () => {
  const student = await User.create({
    fullName: 'Failing Student',
    email: `fail-stud-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'STUDENT'
  });

  const question = await Question.create({
    companyId: student._id,
    createdBy: student._id,
    title: 'Sum Verification',
    prompt: '[TEST-SUITE] Return expected result',
    type: 'CODING',
    difficulty: 'EASY',
    isPublished: true,
    testCases: [
      {
        id: 'tc-1',
        input: '',
        expected: '100'
      }
    ]
  });

  const incorrectSource = 'console.log(999);';
  const subReq = {
    user: student,
    body: {
      questionId: question._id,
      sourceCode: incorrectSource,
      languageId: 63,
      languageName: 'javascript'
    }
  };
  const subRes = mockRes();
  await submitPracticeCode(subReq, subRes);
  assert.equal(subRes.statusCode, 200);
  assert.equal(subRes.data.data.score, 0);
  assert.equal(subRes.data.data.status, 'FAILED');
  assert.equal(subRes.data.data.passedCount, 0);
  assert.equal(subRes.data.data.testResults[0].passed, false);
});

test('Phase 2 Error Handling: Syntax/Compilation errors display properly without crashing', async () => {
  const student = await User.create({
    fullName: 'Syntax Error Student',
    email: `syntax-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'STUDENT'
  });

  const question = await Question.create({
    companyId: student._id,
    createdBy: student._id,
    title: 'Compile Error Check',
    prompt: '[TEST-SUITE] Test compilation errors',
    type: 'CODING',
    difficulty: 'EASY',
    isPublished: true,
    testCases: [{ id: 'tc-1', input: '', expected: '10' }]
  });

  const brokenSource = 'public class Main { broken code syntax ;;;';
  const subReq = {
    user: student,
    body: {
      questionId: question._id,
      sourceCode: brokenSource,
      languageId: 62,
      languageName: 'java'
    }
  };
  const subRes = mockRes();
  await submitPracticeCode(subReq, subRes);
  assert.equal(subRes.statusCode, 200);
  assert.equal(subRes.data.data.status, 'FAILED');
  assert.ok(subRes.data.data.testResults[0].error.length > 0, 'Compilation error message must be captured');
});

test('Phase 2 Confidentiality: Hidden test cases are evaluated without leaking inputs/expected to candidates', async () => {
  const student = await User.create({
    fullName: 'Confidential Candidate',
    email: `confidential-${Date.now()}@test-repo-suite.com`,
    passwordHash: 'dummyhash',
    accountRole: 'STUDENT'
  });

  const question = await Question.create({
    companyId: student._id,
    createdBy: student._id,
    title: 'Hidden Test Suite Problem',
    prompt: '[TEST-SUITE] Problem with hidden tests',
    type: 'CODING',
    difficulty: 'MEDIUM',
    isPublished: true,
    testCases: [
      { id: 'public-1', input: '', expected: '42', hidden: false }
    ],
    hiddenTests: [
      { id: 'secret-1', input: '', expected: '42' }
    ]
  });

  const source = 'console.log(42);';
  const subReq = {
    user: student,
    body: {
      questionId: question._id,
      sourceCode: source,
      languageId: 63,
      languageName: 'javascript'
    }
  };
  const subRes = mockRes();
  await submitPracticeCode(subReq, subRes);
  assert.equal(subRes.statusCode, 200);
  assert.equal(subRes.data.data.score, 100);
  assert.equal(subRes.data.data.status, 'PASSED');
  assert.equal(subRes.data.data.totalCount, 2);

  // Check that the hidden test details were masked
  const hiddenResult = subRes.data.data.testResults.find((r) => r.hidden === true);
  assert.ok(hiddenResult, 'Hidden test case must be evaluated');
  assert.equal(hiddenResult.input, '[Hidden Test Case]');
  assert.equal(hiddenResult.expectedOutput, '[Hidden]');
  assert.notEqual(hiddenResult.input, '');
});

test('Phase 2 Sanitization: Empty examples fallback to testCases, privileged fields removed', async () => {
  const rawQuestion = {
    _id: '507f1f77bcf86cd799439011',
    prompt: 'Given an array find sum.',
    type: 'CODING',
    topic: 'Math',
    referenceSolution: 'secret code',
    solution: 'another secret',
    hiddenTests: [{ input: 'x', expected: 'y' }],
    correctOptionIndex: 2,
    testCases: [
      { input: '1 2', expectedOutput: '3', hidden: false },
      { input: 'secret', expectedOutput: 'secret', hidden: true }
    ]
  };

  const sanitized = sanitizeQuestionForClient(rawQuestion, false);
  assert.equal(sanitized.referenceSolution, undefined);
  assert.equal(sanitized.solution, undefined);
  assert.equal(sanitized.hiddenTests, undefined);
  assert.equal(sanitized.correctOptionIndex, undefined);
  assert.equal(sanitized.testCases, undefined);

  // Check examples were populated from non-hidden test cases
  assert.ok(Array.isArray(sanitized.examples));
  assert.equal(sanitized.examples.length, 1);
  assert.equal(sanitized.examples[0].input, '1 2');
  assert.equal(sanitized.examples[0].output, '3');
});

