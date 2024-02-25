const Cartdb = require("../model/cartmodel");
const userdb = require("../model/usermodel");
const productdb = require("../model/pdtmodel");
const orderdb = require("../model/order");
const WalletModel = require("../model/wallet");
const Wishlist = require("../model/wishlistModel");
const mongoose = require("mongoose");

const cart = async (req, res) => {
    let idd = req.session.userid;

    if (!idd) {
        res.redirect("/login?loginMessage=Please Sign In first.");
    } else {
        try {
            const cartData = await Cartdb.findOne({ user: idd }).populate({
                path: "products.productId",
                model: "Product", // Make sure it matches the model name for the Product
            });

            if (!cartData) {
                // Handle the case where the user has no items in the cart
                res.render("cart", { cartData, cartCount: req.cartCount });
                return;
            } else {
                const productQuantities = [];
                // Assuming there is a specific product index (e.g., index 1) you want to get the quantity from
                cartData.products.forEach((product, index) => {
                    const qty = product.productId.stockQuantity;
                    productQuantities.push(qty);
                });

                res.render("cart", { cartData, productQuantities, cartCount: req.cartCount });
            }
        } catch (error) {
            console.error("Error fetching cart data:", error);
            res.status(500).send("Internal Server Error");
        }
    }
};

const updatecart = async (req, res) => {
    if (!req.session.userid) {
        res.json({ status: "error", message: "Please log in first." });
    } else {
        let idd = req.session.userid;
        let email = req.session.user;

        let productid = req.params.id;
        let exist = await Cartdb.findOne({ user: idd });
        let product = await productdb.findById(productid);
        try {
            if (!exist) {
                const newcart = new Cartdb({
                    user: idd,
                    userEmail: email,
                    products: [
                        {
                            productId: product._id,
                            name: product.name,
                            quantity: 1,
                            productPrice: product.price,
                            totalPrice: product.price * 1,
                            image: product.imageUrls[0],
                        },
                    ],
                    subtotal: product.price,
                });
                await newcart.save();
                res.json({ status: "success", message: "Product added to cart." });
            } else {
                const existingProduct = exist.products.find((item) => item.productId.equals(product._id));

                if (existingProduct) {
                    res.json({ status: "error", message: "Product already in the cart." });
                } else {
                    exist.products.push({
                        productId: product._id,
                        name: product.name,
                        quantity: 1,
                        productPrice: product.price,
                        totalPrice: product.price * 1,
                        image: product.imageUrls[0],
                    });

                    // Recalculate the subtotal based on the updated products
                    exist.subtotal = exist.products.reduce((total, product) => {
                        return total + product.totalPrice;
                    }, 0);
                    await exist.save();
                    res.json({ status: "success", message: "Product added to cart." });
                }
            }
        } catch (error) {
            console.log(error);
            res.status(500).json({ status: "error", message: "Internal Server Error" });
        }
    }
};

const updateCartDetails = async (req, res) => {
    try {
        const { cartId, productId, quantity } = req.body;
        const id = req.session.userid;

        const existingCart = await Cartdb.findById(cartId);

        if (!existingCart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const productToUpdate = existingCart.products.find((p) => p.productId.equals(productId));

        if (!productToUpdate) {
            return res.status(404).json({ success: false, message: "Product not found in the cart" });
        }

        productToUpdate.quantity = quantity;
        productToUpdate.totalPrice = quantity * productToUpdate.productPrice;

        const updatedCart = await existingCart.save();
        const updatedTotalPrice = productToUpdate.totalPrice;
        const totalPriceTotal = existingCart.products.reduce((total, product) => {
            return total + product.totalPrice;
        }, 0);
        existingCart.subtotal = totalPriceTotal;

        await existingCart.save();

        res.json({
            success: true,
            message: "Quantity updated successfully",
            updatedTotalPrice,
            totalPriceTotal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const paymentmethod = async (req, res) => {
    try {
        const userId = req.session.userid;
        const user = await userdb.findById(userId);
        let walletBalance = 0; // Declare walletBalance here with a default value

        if (user) {
            const userWallet = await WalletModel.findOne({ userId: userId });

            if (userWallet) {
                walletBalance = userWallet.balance;
            }

            const addresses = user.addresses || [];

            const cart = await Cartdb.findOne({ user: userId }).populate({
                path: "products.productId",
                model: "Product", // Make sure it matches the model name for the Product
            });

            if (cart) {
                res.render("paymentmethod", { addresses, cart, walletBalance, cartCount: req.cartCount });
            } else {
                res.redirect("/");
            }
        } else {
            return res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("Error in paymentmethod:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const addAddress = async (req, res) => {
    if (!req.session.userid) {
        return res.send(
            '<script>alert("Please log in first."); window.location="/login?loginMessage=Please Sign In first.";</script>'
        );
    } else {
        try {
            const fromProfile = req.params.id;
            const userId = req.session.userid;
            const addressData = {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                companyName: req.body.companyName,
                country: req.body.country,
                streetAddress1: req.body.streetAddress1,
                streetAddress2: req.body.streetAddress2,
                townCity: req.body.townCity,
                stateCounty: req.body.stateCounty,
                postcodeZIP: req.body.postcodeZIP,
                phone: req.body.phone,
            };

            const updateQuery = {
                $push: { addresses: addressData },
            };

            // Update the user document to push the new address into the addresses array
            const updatedUser = await userdb.findByIdAndUpdate(userId, updateQuery, { new: true });

            if (!updatedUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const selectedTab = "address";

            if (fromProfile == 1) {
                res.redirect(`/profile?tab=${selectedTab}`);
            } else {
                res.redirect("/paymentmethod");
            }
        } catch (error) {
            console.error("Error adding address:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
};

const cartItemRemove = async (req, res) => {
    const productIdToRemove = req.params.productId;
    const userId = req.session.userid;

    if (!userId) {
        return res.status(401).json({ success: false, message: "User not authenticated." });
    }

    try {
        // Find the user's cart
        const userCart = await Cartdb.findOne({ user: userId });

        if (!userCart) {
            return res.status(404).json({ success: false, message: "User does not have a cart." });
        }

        // Find the index of the product to remove
        const productIndex = userCart.products.findIndex((product) => product.productId.toString() === productIdToRemove);

        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: "Product not found in the cart." });
        }

        // Get the removed product's total price
        const removedProductTotalPrice = userCart.products[productIndex].totalPrice;

        // Remove the product from the cart
        userCart.products.splice(productIndex, 1);

        // Recalculate the subtotal
        userCart.subtotal -= removedProductTotalPrice;

        // Save the updated cart
        await userCart.save();

        return res.json({ success: true, message: "Product removed from the cart.", subtotal: userCart.subtotal });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ============================================================
// ==========================wishlist==========================
// ============================================================

// const wishlist = async (req, res) => {
//     try {
//         const wishlistData = await Wishlist.findOne({ user: req.session.userid }).populate({
//             path: "products.productId",
//             model: "Product",
//         });
// // console.log(wishlistData.products[0].productId._id);
//         res.render("wishlist", { cartCount: req.cartCount, wishlistData });
//     } catch (error) {
//         console.error("Error in wishlist route:", error);
//         res.status(500).render("error", { error: "Internal Server Error" });
//     }
// };

const wishlist = async (req, res) => {
    try {
        const wishlistData = await Wishlist.findOne({ user: req.session.userid }).populate({
            path: "products.productId",
            model: "Product",
        });

        // Fetch the user's cart
        const userCart = await Cartdb.findOne({ user: req.session.userid });

        // Create a map for faster lookups of cart productIds
        const cartProductIds = new Set(userCart.products.map(product => product.productId.toString()));

        // Check if each wishlist product is in the cart
        wishlistData.products.forEach(product => {
            const isInCart = cartProductIds.has(product.productId._id.toString());
            product.isInCart = isInCart;
        });

        res.render("wishlist", { cartCount: req.cartCount, wishlistData });
    } catch (error) {
        console.error("Error in wishlist route:", error);
        res.status(500).render("error", { error: "Internal Server Error" });
    }
};


const wishlistManagement = async (req, res) => {
    try {
        if (!req.session.userid) {
            res.status(200).json({ message: "No Login" });
        } else {
            
            const { productId } = req.body; // Assuming you send productId in the request body
            const Wishlistcheck = await Wishlist.findOne({ user: req.session.userid });

            if (!Wishlistcheck) {
                await new Wishlist({ user: req.session.userid });
                console.log("new wishlist db created for the user");
            }

            // Check if the product is already in the wishlist
            const existingWishlistItem = await Wishlist.findOne({
                user: req.session.userid, // Assuming you have user authentication and session handling
                products: { $elemMatch: { productId } },
            });

            if (existingWishlistItem) {
                // Product is already in the wishlist, remove it
                await Wishlist.findOneAndUpdate(
                    { user: req.session.userid },
                    { $pull: { products: { productId } } },
                    { new: true }
                );

                res.status(200).json({ message: "Product removed from wishlist" });
            } else {
                // Product is not in the wishlist, add it
                await Wishlist.findOneAndUpdate(
                    { user: req.session.userid },
                    { $push: { products: { productId } } },
                    { upsert: true, new: true }
                );

                res.status(200).json({ message: "Product added to wishlist" });
            }
        }
    } catch (error) {
        console.error("Error in wishlistManagement:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const addReview = async (req, res) => {
    // Enable MongoDB query debugging
    // mongoose.set("debug", true);
    let existingReviewIndex = -1;
    let preRating;
    const { orderId, ProductId, rating, review } = req.body;

    try {
        const order = await orderdb.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const productIndex = order.Products.findIndex((product) => product.products.toString() === ProductId);
        if (productIndex === -1 || !order.Products[productIndex]) {
            return res.status(404).json({ error: "Product not found in the order" });
        }

        const parsedRating = parseInt(rating);

        if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
            return res.status(400).json({ error: "Invalid rating value" });
        }

        const newReview = {
            user: req.session.userid,
            userName: req.session.user,
            rating: parsedRating,
            reviewText: review,
        };


        order.Products[productIndex].rating = rating;
        order.Products[productIndex].review = review;
        await order.save();
        // const updateObject = {
        //     $set: {
        //         [`Products.${productIndex}.rating`]: parsedRating,
        //         [`Products.${productIndex}.review`]: review,
        //     },
        // };

        // await orderdb.updateOne({ _id: orderId }, updateObject);

        let itemProduct = await productdb.findById(ProductId);

        if (!itemProduct.reviews || itemProduct.reviews.length === 0) {
            // If reviews array doesn't exist or is empty, create a new one
            itemProduct.reviews = [];
            itemProduct.averageRating = 0;
            itemProduct.totalRatings = 0;
        } else {
            for (let i = 0; i < itemProduct.reviews.length; i++) {

                if (itemProduct.reviews[i].userName === req.session.user) {
                    existingReviewIndex = i;
                    console.log(i);
                    break; // Stop the loop once the matching review is found
                }
            }

            if (existingReviewIndex !== -1) {
                preRating = itemProduct.reviews[existingReviewIndex].rating;
            }
            
        }

        console.log("existingReviewIndex::", existingReviewIndex);


        if (existingReviewIndex !== -1) {
            console.log('iffff::');
            // Update the existing review
            itemProduct.reviews[existingReviewIndex] = newReview;
        } else {
            console.log('else::');
            // Push the new review
            itemProduct.reviews.push(newReview);
        }

        const totalRatings = itemProduct.totalRatings || 0;
        const oldAverageRating = itemProduct.averageRating || 0;

        // Update the product document with the modified reviews array and ratings

        // there is a small calulartion mistake
        if (existingReviewIndex !== -1) {
            const newAverageRating = (oldAverageRating * totalRatings + parsedRating - preRating) / totalRatings;

            await productdb.findByIdAndUpdate(ProductId, {
                $set: { reviews: itemProduct.reviews, totalRatings: totalRatings, averageRating: newAverageRating },
            });
        } else {
            const newAverageRating = (oldAverageRating * totalRatings + parsedRating) / (totalRatings + 1);

            await productdb.findByIdAndUpdate(ProductId, {
                $set: { reviews: itemProduct.reviews, totalRatings: totalRatings + 1, averageRating: newAverageRating },
            });
        }

        console.log("Review added successfully");
        res.status(201).json({ message: "Review added successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
    //  finally {
    //     // Disable MongoDB query debugging after the request
    //     mongoose.set("debug", false);
    // }
};

module.exports = {
    cart,
    updatecart, // add to cart
    updateCartDetails,
    paymentmethod,
    addAddress,
    // checkOut,
    cartItemRemove,
    // ======wishlist======
    wishlist,
    wishlistManagement,
    addReview,
};
