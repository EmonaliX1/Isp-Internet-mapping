const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: 'N/A',
      trim: true,
    },
    pppoe: {
      type: String,
      default: 'N/A',
      trim: true,
    },
    package: {
      type: String,
      default: 'N/A',
      trim: true,
    },
    due: {
      type: Number,
      default: 0,
    },
    laser: {
      type: Number,
      default: -18,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);