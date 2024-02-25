// walletModel.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user', 
    required: true 
},
  
  balance: {
     type: Number, default: 0
     },
  history: [
    {
      amount: { type: Number, required: true },
      type: { type: String, enum: ['credit', 'debit'], required: true },
      description: { type: String },
      timestamp: { type: Date, default: Date.now },
    },
  ],

});

const WalletModel = mongoose.model('Wallet', walletSchema);

module.exports = WalletModel;
