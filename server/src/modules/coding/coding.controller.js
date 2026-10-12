const mongoose = require('mongoose');
const Submission = require('./submission.model');
const PracticeSubmission = require('./practice-submission.model');
const { getAiServiceHeaders } = require('../../shared/utils/ai-service.utils');
const Question = require('../questions/question.model');
const Interview = require('../interviews/interview.model');

const AI_MONITORING_URL =
  process.env.AI_MONITORING_URL || 'http://localhost:5050';
const { sendSuccess, sendError } = require('../../shared/utils/response.utils');

const JUDGE0_BASE_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || null;



const executeJudge0 = async ({ sourceCode, languageId, stdin }) => {
  const headers = { 'Content-Type': 'application/json' };
  if (JUDGE0_API_KEY) { headers['X-RapidAPI-Key'] = JUDGE0_API_KEY; headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com'; }
  const response = await fetch(`${JUDGE0_BASE_URL}/submissions?base64_encoded=true&wait=true`, { method:'POST', headers, body: JSON.stringify({ source_code: Buffer.from(sourceCode,'utf8').toString('base64'), language_id:Number(languageId), stdin: Buffer.from(String(stdin ?? ''),'utf8').toString('base64') }) });
  if (!response.ok) throw new Error(`Judge0 returned HTTP ${response.status}`);
  const result = await response.json();
  return { stdout: decodeBase64(result.stdout), stderr: decodeBase64(result.stderr), compileOutput: decodeBase64(result.compile_output), status: result.status || {}, time: result.time || '0.0', memory: result.memory || 0 };
};

const decodeBase64 = (str) => {
  if (!str) return '';
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch (e) {
    return str;
  }
};

const compareOutputs = (actual, expected) => {
  const normActual = String(actual ?? '').trim();
  const normExpected = String(expected ?? '').trim();

  // If no expected output is defined, passing means program exited cleanly
  if (!normExpected) return true;

  // 1. Exact string match
  if (normActual === normExpected) return true;

  // 2. Whitespace-insensitive match (e.g. "[0, 1]" vs "[0,1]")
  if (normActual.replace(/\s+/g, '') === normExpected.replace(/\s+/g, '')) {
    return true;
  }

  // 3. JSON array / object match
  try {
    const parsedActual = JSON.parse(normActual);
    const parsedExpected = JSON.parse(normExpected);
    if (JSON.stringify(parsedActual) === JSON.stringify(parsedExpected)) {
      return true;
    }
  } catch (_) {}

  // 4. Case-insensitive boolean / null match (e.g. true vs True, false vs False)
  if (normActual.toLowerCase() === normExpected.toLowerCase()) {
    if (['true', 'false', 'null', 'none'].includes(normExpected.toLowerCase())) {
      return true;
    }
  }

  return false;
};

/**
 * Execute code using Judge0 compiler API with Base64 encoding
 * POST /api/coding/run
 */
const runCode = async (req, res) => {
  try {
    const { sourceCode, languageId, stdin } = req.body;

    if (!sourceCode || !languageId) {
      return sendError(res, 400, 'sourceCode and languageId are required');
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    if (JUDGE0_API_KEY) {
      headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
    }

    const encodedSource = Buffer.from(sourceCode, 'utf-8').toString('base64');
    const encodedStdin = stdin
      ? Buffer.from(stdin, 'utf-8').toString('base64')
      : '';

    const response = await fetch(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=true&wait=true`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source_code: encodedSource,
          language_id: Number(languageId),
          stdin: encodedStdin
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return sendError(
        res,
        response.status,
        'Judge0 execution error',
        errorText
      );
    }

    const result = await response.json();

    const stdout = decodeBase64(result.stdout);
    const stderr = decodeBase64(result.stderr);
    const compileOutput = decodeBase64(result.compile_output);

    return sendSuccess(res, 200, 'Code executed successfully', {
      stdout,
      stderr,
      compileOutput,
      status: result.status || {},
      time: result.time || '0.0',
      memory: result.memory || 0,
      exitCode: result.exit_code,
      exitSignal: result.exit_signal
    });
  } catch (error) {
    return sendError(res, 500, `Execution server error: ${error.message}`);
  }
};

/**
 * Submit code for final evaluation and persist it in MongoDB
 * POST /api/coding/submit
 */
const submitCode = async (req, res) => {
  try {
    const {
      interviewId,
      questionId,
      sourceCode,
      languageId,
      languageName,
      testResults
    } = req.body;

    if (!interviewId || !sourceCode || !languageId) {
      return sendError(
        res,
        400,
        'interviewId, sourceCode, and languageId are required'
      );
    }

    const studentId = req.user._id;

    const interview = await Interview.findOne({
      _id: interviewId,
      $or: [{ createdBy: studentId }, { 'participants.user': studentId }]
    }).select('_id participants createdBy status').lean();
    if (!interview) {
      return sendError(res, 403, 'You are not a participant in this interview.');
    }

    if (questionId) {
      const questionBelongsToInterview = await Question.exists({ _id: questionId, interview: interviewId });
      if (!questionBelongsToInterview) {
        return sendError(res, 400, 'Question does not belong to this interview.');
      }
    }

    // Run the real interview test suite on the server. Hidden test cases are never sent to the browser.
    let authoritativeResults = Array.isArray(testResults) ? testResults : [];
    if (questionId) {
      const questionDoc = await Question.findById(questionId).select('testCases').lean();
      const cases = questionDoc?.testCases || [];
      if (cases.length) {
        authoritativeResults = [];
        for (let i = 0; i < cases.length; i += 1) {
          const tc = cases[i] || {};
          try {
            const result = await executeJudge0({ sourceCode, languageId, stdin: tc.input ?? '' });
            const expected = String(tc.expectedOutput ?? tc.expected ?? '').trim();
            const actual = String(result.stdout || '').trim();
            const passed = result.status?.id === 3 && compareOutputs(actual, expected);
            authoritativeResults.push({ testCaseId: tc.id || `case-${i + 1}`, input: tc.input ?? '', expectedOutput: expected, actualOutput: actual, passed, executionTime: result.time, memory: result.memory, error: result.stderr || result.compileOutput || '' });
          } catch (e) {
            authoritativeResults.push({ testCaseId: tc.id || `case-${i + 1}`, input: tc.input ?? '', expectedOutput: String(tc.expectedOutput ?? tc.expected ?? ''), actualOutput: '', passed: false, error: e.message });
          }
        }
      }
    }

    let generatedAiFeedback = {};
    let aiFeedbackStatus = 'UNAVAILABLE';

    // Generate AI feedback server-side from authoritative test results.
    if (sourceCode) {
      try {
        const aiResponse = await fetch(
          `${AI_MONITORING_URL}/api/ai/coding-evaluation`,
          {
            method: 'POST',
            headers: getAiServiceHeaders(),
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
              question:
                req.body.question ||
                'Evaluate the submitted coding solution based on its implementation and test results.',
              sourceCode,
              language: languageName || 'javascript',
              testResults: authoritativeResults
            })
          }
        );

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();

          if (aiResult.success && aiResult.data?.aiFeedback) {
            generatedAiFeedback = aiResult.data.aiFeedback;
            aiFeedbackStatus = 'COMPLETED';
          }
        } else {
          console.warn(
            `AI evaluation service returned HTTP ${aiResponse.status}`
          );
        }
      } catch (aiError) {
        // AI evaluation should not prevent the code submission
        // from being persisted.
        console.warn(
          `AI evaluation unavailable: ${aiError.message}`
        );
      }
    }

    let score = 100;
    let status = 'PASSED';

    if (Array.isArray(authoritativeResults) && authoritativeResults.length > 0) {
      const passedCount = authoritativeResults.filter((test) => test.passed).length;

      score = Math.round(
        (passedCount / authoritativeResults.length) * 100
      );

      if (score === 100) {
        status = 'PASSED';
      } else if (score > 0) {
        status = 'PARTIAL';
      } else {
        status = 'FAILED';
      }
    }

    const submission = await Submission.create({
      interviewId,
      questionId: questionId || null,
      studentId,
      sourceCode,
      languageId: Number(languageId),
      languageName: languageName || 'javascript',
      status,
      score,
      testResults: authoritativeResults || [],
      aiFeedback: generatedAiFeedback,
      aiFeedbackStatus
    });

    return sendSuccess(
      res,
      201,
      'Code submission saved successfully',
      {
        submissionId: submission._id,
        interviewId: submission.interviewId,
        questionId: submission.questionId,
        studentId: submission.studentId,
        sourceCode: submission.sourceCode,
        languageId: submission.languageId,
        status: submission.status,
        score: submission.score,
        testResults: submission.testResults,
        aiFeedback: submission.aiFeedback,
        aiFeedbackStatus: submission.aiFeedbackStatus,
        submittedAt: submission.submittedAt
      }
    );
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Supported Judge0 language mapping
 * GET /api/coding/languages
 */
const getSupportedLanguages = (req, res) => {
  const languages = [
    { id: 71, name: 'Python (3.8.1)', monacoLang: 'python', extension: 'py' },
    { id: 63, name: 'JavaScript (Node.js 12.14.0)', monacoLang: 'javascript', extension: 'js' },
    { id: 74, name: 'TypeScript (3.7.4)', monacoLang: 'typescript', extension: 'ts' },
    { id: 54, name: 'C++ (GCC 9.2.0)', monacoLang: 'cpp', extension: 'cpp' },
    { id: 62, name: 'Java (OpenJDK 13.0.1)', monacoLang: 'java', extension: 'java' },
    { id: 50, name: 'C (GCC 9.2.0)', monacoLang: 'c', extension: 'c' }
  ];

  return sendSuccess(
    res,
    200,
    'Supported languages retrieved',
    { languages }
  );
};

/**
 * Get the authenticated candidate's submission history for an interview
 * GET /api/coding/submissions/:interviewId
 */
const getSubmissionsByInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;

    if (!interviewId) {
      return sendError(res, 400, 'interviewId is required');
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      $or: [{ createdBy: req.user._id }, { 'participants.user': req.user._id }]
    }).select('_id').lean();
    if (!interview) {
      return sendError(res, 403, 'You are not a participant in this interview.');
    }

    const submissions = await Submission.find(
      req.user.accountRole === 'STUDENT'
        ? { interviewId, studentId: req.user._id }
        : { interviewId }
    )
      .sort({ submittedAt: -1 })
      .lean();

    return sendSuccess(
      res,
      200,
      'Submission history fetched successfully',
      {
        submissions,
        count: submissions.length
      }
    );
  } catch (error) {
    return sendError(
      res,
      500,
      `Failed to fetch submission history: ${error.message}`
    );
  }
};

const canUserAccessQuestion = async (user, question) => {
  if (!question) return false;
  if (user.accountRole === 'ADMIN') return true;
  if (question.isPublished) return true;
  const isOwner = String(question.companyId || question.createdBy) === String(user._id);
  if (isOwner) return true;
  if (question.interview) {
    const interview = await Interview.findById(question.interview).select('participants createdBy').lean();
    if (interview) {
      if (String(interview.createdBy) === String(user._id)) return true;
      if ((interview.participants || []).some((p) => String(p.user) === String(user._id))) return true;
    }
  }
  return false;
};

/**
 * Execute practice code against custom input or sample tests
 * POST /api/coding/practice/run
 */
const runPracticeCode = async (req, res) => {
  try {
    const { sourceCode, languageId, stdin, questionId } = req.body;

    if (!sourceCode || !languageId) {
      return sendError(res, 400, 'sourceCode and languageId are required');
    }

    if (questionId) {
      const question = await Question.findById(questionId).lean();
      if (!question) {
        return sendError(res, 404, 'Question not found');
      }
      const allowed = await canUserAccessQuestion(req.user, question);
      if (!allowed) {
        return sendError(res, 403, 'You are not authorized to practice this question.');
      }
    }

    const result = await executeJudge0({ sourceCode, languageId, stdin: stdin || '' });

    return sendSuccess(res, 200, 'Practice code executed successfully', {
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      status: result.status || {},
      time: result.time || '0.0',
      memory: result.memory || 0
    });
  } catch (error) {
    return sendError(res, 500, `Practice execution error: ${error.message}`);
  }
};

/**
 * Submit practice code against permitted public sample tests
 * POST /api/coding/practice/submit
 */
const submitPracticeCode = async (req, res) => {
  try {
    const { questionId, sourceCode, languageId, languageName } = req.body;

    if (!questionId || !sourceCode || !languageId) {
      return sendError(res, 400, 'questionId, sourceCode, and languageId are required');
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return sendError(res, 400, 'Invalid question ID format');
    }

    const question = await Question.findById(questionId).lean();
    if (!question) {
      return sendError(res, 404, 'Question not found');
    }

    const allowed = await canUserAccessQuestion(req.user, question);
    if (!allowed) {
      return sendError(res, 403, 'You are not authorized to submit practice for this question.');
    }

    // Configure test suite: prioritize configured testCases, fall back to examples.
    let testCasesToRun = [];
    if (Array.isArray(question.testCases) && question.testCases.length > 0) {
      testCasesToRun = question.testCases.map((tc, idx) => ({
        id: tc.id || `case-${idx + 1}`,
        input: tc.input ?? '',
        expected: tc.expectedOutput ?? tc.expected ?? '',
        hidden: Boolean(tc.hidden || tc.isSecret)
      }));
    } else if (Array.isArray(question.examples) && question.examples.length > 0) {
      testCasesToRun = question.examples.map((ex, idx) => ({
        id: `example-${idx + 1}`,
        input: ex.input ?? '',
        expected: ex.output ?? ex.expected ?? ex.expectedOutput ?? '',
        hidden: false
      }));
    } else {
      testCasesToRun = [{ id: 'case-1', input: '', expected: '', hidden: false }];
    }

    // If explicit hiddenTests are defined separately, include them in the evaluation suite
    if (Array.isArray(question.hiddenTests) && question.hiddenTests.length > 0) {
      const hiddenList = question.hiddenTests.map((ht, idx) => ({
        id: ht.id || `hidden-${idx + 1}`,
        input: ht.input ?? '',
        expected: ht.expectedOutput ?? ht.expected ?? '',
        hidden: true
      }));
      testCasesToRun = testCasesToRun.concat(hiddenList);
    }

    const testResults = [];
    let totalTime = 0;
    let maxMemory = 0;

    for (let i = 0; i < testCasesToRun.length; i++) {
      const tc = testCasesToRun[i];
      try {
        const result = await executeJudge0({ sourceCode, languageId, stdin: tc.input || '' });
        totalTime += parseFloat(result.time || 0);
        maxMemory = Math.max(maxMemory, result.memory || 0);

        const expected = String(tc.expected || '').trim();
        const actual = String(result.stdout || '').trim();
        const executionSuccess = result.status?.id === 3;
        const passed = executionSuccess && compareOutputs(actual, expected);

        const errorMsg = result.stderr || result.compileOutput || (result.status?.id && result.status?.id !== 3 ? result.status?.description : '') || '';

        testResults.push({
          testCaseId: tc.id,
          input: tc.hidden ? '[Hidden Test Case]' : tc.input,
          expectedOutput: tc.hidden ? '[Hidden]' : expected,
          actualOutput: tc.hidden ? (passed ? '[Hidden - Passed]' : '[Hidden - Failed]') : actual,
          passed,
          hidden: Boolean(tc.hidden),
          executionTime: result.time,
          memory: result.memory,
          error: errorMsg
        });
      } catch (e) {
        testResults.push({
          testCaseId: tc.id,
          input: tc.hidden ? '[Hidden Test Case]' : tc.input,
          expectedOutput: tc.hidden ? '[Hidden]' : tc.expected,
          actualOutput: '',
          passed: false,
          hidden: Boolean(tc.hidden),
          error: e.message
        });
      }
    }

    const passedCount = testResults.filter((t) => t.passed).length;
    const score = testResults.length > 0 ? Math.round((passedCount / testResults.length) * 100) : 100;
    let status = 'FAILED';
    if (score === 100) status = 'PASSED';
    else if (score > 0) status = 'PARTIAL';

    const submission = await PracticeSubmission.create({
      studentId: req.user._id,
      questionId: question._id,
      sourceCode,
      languageId: Number(languageId),
      languageName: languageName || 'javascript',
      status,
      score,
      testResults,
      executionTime: totalTime.toFixed(3),
      memory: maxMemory
    });

    return sendSuccess(res, 200, 'Practice submission evaluated successfully', {
      submission,
      score,
      status,
      testResults,
      passedCount,
      totalCount: testResults.length
    });
  } catch (error) {
    return sendError(res, 500, `Practice submission failed: ${error.message}`);
  }
};

/**
 * Fetch practice submission history for a specific question
 * GET /api/coding/practice/submissions/:questionId
 */
const getPracticeSubmissions = async (req, res) => {
  try {
    const { questionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return sendError(res, 400, 'Invalid question ID format');
    }

    const submissions = await PracticeSubmission.find({
      questionId,
      studentId: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return sendSuccess(res, 200, 'Practice history fetched successfully', {
      submissions,
      count: submissions.length
    });
  } catch (error) {
    return sendError(res, 500, `Failed to fetch practice history: ${error.message}`);
  }
};

module.exports = {
  runCode,
  submitCode,
  getSupportedLanguages,
  getSubmissionsByInterview,
  runPracticeCode,
  submitPracticeCode,
  getPracticeSubmissions
};
