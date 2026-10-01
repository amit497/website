const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // ডিবাগ করার জন্য চেক করছি .env থেকে ইউআরআই ঠিকমতো আসছে কি না
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is undefined in environment variables!");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;