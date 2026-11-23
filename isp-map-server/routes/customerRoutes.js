const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// ১. নতুন কাস্টমার যুক্ত করা (একাধিকবার কল করলে প্রতিবার নতুন কাস্টমার সেভ হবে)
router.post('/', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    const savedCustomer = await customer.save();
    res.status(201).json({
      message: 'Customer saved successfully',
      data: savedCustomer,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ২. একবারে একাধিক কাস্টমার (Array) সেভ করা
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

// ৩. সব কাস্টমারের তালিকা আনা
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;