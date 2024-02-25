  const mongoose = require("mongoose");

  const productSchema = mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    priceoffer: {
      type: Number,
    },
    gender: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      default: "Active",
    },
    category: {
      type: String,
    },
    manufacturer: {
      type: String,
    },
    stockQuantity: {
      type: Number,
      default: 0,
    },
  imageUrls  : [{
      type: String,
    }],
    size: {
      type: String, // You can change this to an array if a product can have multiple sizes
    },
    productDeleted: {
      type: String,
    },
     averageRating: {
    type: Number,
    default: 0,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },

  //reviews

  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
   
  },
  userName:{
    type: String,
  },
    rating: {
      type: Number,
    },
    reviewText: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  }],

//offers
offers: [
  {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
  },
],
singleOffer: [{
  date: {
      type: Date,
      default: Date.now,
  },
  discountPercentage: {
      type: Number,
      required: true,
  },
  discountedAmount: {
      type: Number,
      required: true,
  },
}],




  }, { versionKey: false });

  module.exports = mongoose.model('Product', productSchema);
