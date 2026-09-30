const mongoose = require('mongoose');
const User = require('./src/modules/auth/auth.model.js');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collaborative_interview_db';
const PASSWORD = 'RegressionPassword!123';

const accounts = [
  { fullName: 'Regression Company', email: 'company-test@example.com', accountRole: 'COMPANY' },
  { fullName: 'Regression Student', email: 'student-test@example.com', accountRole: 'STUDENT' }
];

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 4000 });

  for (const account of accounts) {
    let user = await User.findOne({ email: account.email });
    if (!user) {
      user = new User({ ...account, passwordHash: PASSWORD, isActive: true });
      console.log('created', account.email, 'as', account.accountRole);
    } else {
      user.passwordHash = PASSWORD; // pre-save hook re-hashes
      console.log('updated password for', account.email, '(', account.accountRole, ')');
    }
    await user.save();
  }

  await mongoose.disconnect();
  console.log('test accounts ready');
}

main().catch((error) => {
  console.error('setup failed:', error.message);
  process.exit(1);
});
