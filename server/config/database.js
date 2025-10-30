const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // URL encode the password if it contains special characters
    const conn = await mongoose.connect('mongodb+srv://odl:odl%402025@cluster0.vb0ajdn.mongodb.net/odl-monitor?retryWrites=true&w=majority');
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
