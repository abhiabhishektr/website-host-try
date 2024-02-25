const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
                
            }
        }
    ]
}, { versionKey: false, _id: false });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
module.exports = Wishlist;
