require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const customerRoutes = require('./routes/customerRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected!'))
  .catch((err) => console.error('MongoDB Error:', err));

// Root / Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'ISP Internet Mapping API is running',
  });
});

// API Routes
app.use('/api/customers', customerRoutes);

// Unknown Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));