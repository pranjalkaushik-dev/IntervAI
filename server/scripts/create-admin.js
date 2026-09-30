require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/modules/auth/auth.model');

(async () => {
  const [, , email, password, ...nameParts] = process.argv;
  const fullName = nameParts.join(' ').trim() || 'Platform Admin';
  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <password> [full name]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collaborative_interview_db');
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.accountRole = 'ADMIN';
    existing.isActive = true;
    existing.passwordHash = password;
    await existing.save();
    console.log(`Promoted ${existing.email} to ADMIN.`);
  } else {
    const user = await User.create({ fullName, email: email.toLowerCase(), passwordHash: password, accountRole: 'ADMIN' });
    console.log(`Created ADMIN ${user.email}.`);
  }
  await mongoose.disconnect();
})().catch((error) => { console.error(error.message); process.exit(1); });
