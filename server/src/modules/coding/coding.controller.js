const Submission = require('./submission.model');
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
            const passed = expected ? actual === expected && result.status?.id === 3 : result.status?.id === 3;
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

module.exports = {
  runCode,
  submitCode,
  getSupportedLanguages,
  getSubmissionsByInterview
};
