const getAiServiceHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.AI_SERVICE_TOKEN) {
    headers.Authorization = `Bearer ${process.env.AI_SERVICE_TOKEN}`;
  }
  return headers;
};

module.exports = { getAiServiceHeaders };
