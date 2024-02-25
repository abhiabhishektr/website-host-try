// offerModel.js

const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    offerActive:{
        type: String,
        default:"Active"
    }

});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
