const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// সব কাস্টমারের তালিকা আনা
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error('Fetch Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// নতুন কাস্টমার যুক্ত করা
router.post('/', async (req, res) => {
  try {
    const savedCustomer = await Customer.create(req.body);
    res.status(201).json(savedCustomer);
  } catch (err) {
    console.error('Save Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// একবারে একাধিক কাস্টমার (Array) সেভ করা
router.post('/bulk', async (req, res) => {
  try {
    const insertedCustomers = await Customer.insertMany(req.body);
    res.status(201).json({
      message: `${insertedCustomers.length} customers saved successfully`,
      data: insertedCustomers,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// কাস্টমার এডিট / আপডেট করা
router.put('/:id', async (req, res) => {
  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(updatedCustomer);
  } catch (err) {
    console.error('Update Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// কাস্টমার ডিলিট করা
router.delete('/:id', async (req, res) => {
  try {
    const deletedCustomer = await Customer.findByIdAndDelete(req.params.id);

    if (!deletedCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    console.error('Delete Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;