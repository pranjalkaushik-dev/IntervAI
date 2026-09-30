const { sendSuccess, sendError } = require('../../shared/utils/response.utils');

const AI_MONITORING_URL =
  process.env.AI_MONITORING_URL || 'http://localhost:5050';

/**
 * Generate an adaptive interview step using the AI monitoring service.
 *
 * POST /api/ai/interview-assistant
 */
const interviewAssistant = async (req, res) => {
  try {
    const {
      currentQuestion,
      candidateAnswer,
      expectedKeywords,
      interviewType,
      difficulty,
      previousTurns
    } = req.body;

    if (!currentQuestion || !candidateAnswer) {
      return sendError(
        res,
        400,
        'currentQuestion and candidateAnswer are required'
      );
    }

    const aiResponse = await fetch(
      `${AI_MONITORING_URL}/api/ai/interview-assistant`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentQuestion,
          candidateAnswer,
          expectedKeywords: Array.isArray(expectedKeywords)
            ? expectedKeywords
            : [],
          interviewType: interviewType || 'TEXT',
          difficulty: difficulty || 'MEDIUM',
          previousTurns: Array.isArray(previousTurns)
            ? previousTurns
            : []
        })
      }
    );

    const aiResult = await aiResponse.json();

    if (!aiResponse.ok || !aiResult.success) {
      return sendError(
        res,
        aiResponse.status || 502,
        aiResult.message || 'AI interview assistant failed'
      );
    }

    return sendSuccess(
      res,
      200,
      'Interview assistant response generated successfully',
      aiResult.data
    );
  } catch (error) {
    console.error(
      `AI interview assistant unavailable: ${error.message}`
    );

    return sendError(
      res,
      502,
      'AI interview assistant service is unavailable'
    );
  }
};

module.exports = {
  interviewAssistant
};
