/**
 * Judge0 Code Execution Service
 * Lead: Nitesh (Code Editor & Execution Lead)
 */

const JUDGE0_PUBLIC_API = 'https://ce.judge0.com';
const BACKEND_API = '/api/coding/run';

const safeB64Encode = (str) => {
  try {
    return btoa(unescape(encodeURIComponent(str || '')));
  } catch (e) {
    return '';
  }
};

const safeB64Decode = (str) => {
  if (!str) return '';
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    return str;
  }
};

/**
 * Execute source code using Judge0
 * @param {Object} params
 * @param {number} params.languageId - Judge0 Language ID
 * @param {string} params.sourceCode - Code to compile and run
 * @param {string} params.stdin - Standard input
 * @returns {Promise<Object>} Execution result
 */
export const executeCode = async ({ languageId, sourceCode, stdin = '' }) => {
  // First attempt: Backend Proxy /api/coding/run
  try {
    const backendRes = await fetch(BACKEND_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        languageId,
        sourceCode,
        stdin
      })
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.success && data.data) {
        return {
          ...data.data,
          via: 'Backend Server Proxy'
        };
      }
    }
  } catch (err) {
    console.warn('[Backend Execution Proxy unreachable, falling back to direct Judge0 CE]:', err.message);
  }

  // Fallback: Direct call to public Judge0 CE endpoint with base64
  try {
    const encodedSource = safeB64Encode(sourceCode);
    const encodedStdin = safeB64Encode(stdin);

    const response = await fetch(`${JUDGE0_PUBLIC_API}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language_id: languageId,
        source_code: encodedSource,
        stdin: encodedStdin
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Judge0 API error (${response.status}): ${errText}`);
    }

    const resData = await response.json();

    return {
      stdout: safeB64Decode(resData.stdout),
      stderr: safeB64Decode(resData.stderr),
      compileOutput: safeB64Decode(resData.compile_output),
      status: resData.status || { description: 'Completed' },
      time: resData.time || '0.0',
      memory: resData.memory || 0,
      exitCode: resData.exit_code,
      message: safeB64Decode(resData.message),
      via: 'Direct Judge0 CE Cloud'
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error.message || 'Unknown execution error occurred',
      compileOutput: '',
      status: { id: -1, description: 'Execution Error' },
      time: '0.00',
      memory: 0,
      via: 'Error Fallback'
    };
  }
};
