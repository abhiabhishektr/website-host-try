// cartCountMiddleware.js

const cartdb = require('../model/cartmodel');
const Wishlist = require('../model/wishlistModel');
const User=require('../model/usermodel');

const cartCountMiddleware = async (req, res, next) => {
    try {
        if (req.session.userid) {
            const userCart = await cartdb.findOne({ user: req.session.userid });
            const userWishlist = await Wishlist.findOne({ user: req.session.userid });
            const userImageCheck = await User.findOne({ _id: req.session.userid }, { googleImage: 1 });
            req.cartCount = {
                count: userCart && userCart.products ? userCart.products.length : 0,
                subtotal: userCart ? userCart.subtotal || 0 : 0,
                wishlistCount: userWishlist && userWishlist.products ? userWishlist.products.length : 0,
                userImage: userImageCheck && userImageCheck.googleImage ? userImageCheck.googleImage : null
            };
            
        } else {
            req.cartCount = 0;
        }
        next();
    } catch (error) {
        console.error("Error while fetching cart count", error);
        // Assuming 'error' view is in the 'views' directory
        res.status(500).render("error", { error: "Internal Server Error" });
    }
};

module.exports = cartCountMiddleware;
