const mongoose = require('mongoose');

const deriveTitleFromPrompt = (prompt, topic, type) => {
  if (!prompt) return topic || `${type || 'Technical'} Question`;
  const firstSentence = prompt.split(/[.\n]/)[0].trim();
  if (firstSentence.length <= 60 && firstSentence.length > 3) {
    return firstSentence;
  }
  return firstSentence.slice(0, 57).trim() + '…';
};

const migrateQuestions = async () => {
  try {
    const db = mongoose.connection.db;
    const questionsCollection = db.collection('questions');
    const indexes = await questionsCollection.indexes();
    
    // Check if the old interview_1_order_1 unique index exists without partialFilterExpression
    const oldIndex = indexes.find((idx) => idx.name === 'interview_1_order_1');
    if (oldIndex && !oldIndex.partialFilterExpression) {
      console.log('[Migration] Dropping old non-partial interview_1_order_1 index...');
      await questionsCollection.dropIndex('interview_1_order_1');
      console.log('[Migration] Old index dropped successfully.');
    }

    // Backfill questions that miss companyId or title
    const Question = mongoose.model('Question');
    const Interview = mongoose.model('Interview');

    const unmigrated = await Question.find({
      $or: [
        { companyId: { $in: [null, undefined] } },
        { title: { $in: [null, undefined, ''] } },
        { isPublished: { $in: [null, undefined] } }
      ]
    }).lean();

    if (unmigrated.length > 0) {
      console.log(`[Migration] Migrating ${unmigrated.length} legacy questions...`);
      for (const q of unmigrated) {
        const update = {};
        if (!q.title) {
          update.title = deriveTitleFromPrompt(q.prompt, q.topic, q.type);
        }
        if (q.isPublished === undefined || q.isPublished === null) {
          // Keep legacy interview questions private to start with, or published if wanted
          update.isPublished = false;
        }
        if (!q.companyId) {
          if (q.interview) {
            const intDoc = await Interview.findById(q.interview).select('createdBy').lean();
            update.companyId = intDoc?.createdBy || q.createdBy;
          } else {
            update.companyId = q.createdBy;
          }
        }
        if (q.isRepositoryQuestion === undefined) {
          update.isRepositoryQuestion = true;
        }

        await Question.updateOne({ _id: q._id }, { $set: update });
      }
      console.log(`[Migration] Completed migrating ${unmigrated.length} questions.`);
    }

    // Safely normalize confirmed Two Sum placeholder questions
    const placeholderQuestions = await Question.find({
      $or: [
        { prompt: /Coding and problem solving round/i },
        { title: /Coding and problem solving round/i }
      ]
    }).lean();

    for (const pq of placeholderQuestions) {
      const isTwoSum =
        Array.isArray(pq.testCases) &&
        pq.testCases.some((tc) =>
          (typeof tc.input === 'string' && tc.input.includes('nums') && tc.input.includes('target')) ||
          (typeof tc.expected === 'string' && tc.expected.includes('[0,1]')) ||
          (typeof tc.expectedOutput === 'string' && tc.expectedOutput.includes('[0,1]'))
        );

      if (isTwoSum) {
        console.log(`[Migration] Normalizing confirmed Two Sum question ${pq._id}...`);
        await Question.updateOne(
          { _id: pq._id },
          {
            $set: {
              title: 'Two Sum',
              topic: pq.topic && pq.topic !== 'Algorithms' ? pq.topic : 'Arrays & Hashing',
              prompt:
                'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
              examples: [
                {
                  input: 'nums = [2,7,11,15], target = 9',
                  output: '[0,1]',
                  explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
                }
              ]
            }
          }
        );
      }
    }

    // Ensure model indexes
    await Question.syncIndexes();
  } catch (err) {
    console.warn('[Migration] Question migration warning:', err.message);
  }
};

module.exports = migrateQuestions;
