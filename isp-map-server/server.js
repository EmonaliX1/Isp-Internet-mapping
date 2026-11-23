require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Customer = require('./models/Customer.js');

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected!'))
  .catch((err) => console.error('MongoDB Error:', err));

// সব কাস্টমার আনা
app.get('/api/customers', async (req, res) => {
  try {
    const list = await Customer.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// নতুন কাস্টমার সেভ করা
app.post('/api/customers', async (req, res) => {
  try {
    const created = await Customer.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error('Save Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// কাস্টমার এডিট/আপডেট করা
app.put('/api/customers/:id', async (req, res) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// কাস্টমার ডিলিট করা
app.delete('/api/customers/:id', async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));