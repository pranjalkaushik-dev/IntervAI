require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required. Put it in server/.env or export it in the shell.');
  process.exit(1);
}

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const interviews = await db.collection('interviews')
    .find()
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();
  console.log(JSON.stringify(interviews, null, 2));
  await mongoose.disconnect();
}).catch(async (error) => {
  console.error(`MongoDB inspection failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
