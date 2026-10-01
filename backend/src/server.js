// server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Built-in middleware to parse incoming JSON
app.use(express.json());

// Sample health check route
app.get('/', (req, res) => {
  res.json({ message: 'Backend is up and running!' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});