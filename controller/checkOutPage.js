const Cartdb = require("../model/cartmodel");
const userdb = require("../model/usermodel");
const productdb = require("../model/pdtmodel");
const orderdb = require("../model/order");
require("dotenv").config();
const WalletModel = require("../model/wallet");
const Coupon = require("../model/couponModel");

const Razorpay = require("razorpay");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const razorpay = new Razorpay({
    key_id: RAZORPAY_ID_KEY,
    key_secret: RAZORPAY_SECRET_KEY,
});

const success = async (req, res) => {
    try {
        const couponCode = req.query.code;
        const userId = req.session.userid;
        console.log("i'm in thee sussec");
        const { razorpayOrderId, paymentResponse, mongodbOrderIds } = req.body;

        const mongoDBOrder = await orderdb.findOne({ onlinePaymentStatus: "intiated", _id: mongodbOrderIds });

        if (!mongoDBOrder) {
            console.error("MongoDB Order not found for Razorpay order ID:", razorpayOrderId);
            return res.status(404).send({ success: false, msg: "Order not found" });
        }

        // Update the onlinePaymentStatus to "success"
        mongoDBOrder.onlinePaymentStatus = "success";
        mongoDBOrder.onlineTransactionId = razorpayOrderId;
        await mongoDBOrder.save();

        const cart = await Cartdb.findOne({ user: userId }).populate({
            path: "products.productId",
            model: "Product",
        });

        if (couponCode && couponCode.length > 0) {
            const coupon = await Coupon.findOne({ code: couponCode });
            coupon.usedBy.push(userId);
            await coupon.save();
        }

        await Cartdb.findOneAndDelete({ user: userId });

        for (let i = 0; i < cart.products.length; i++) {
            const productId = cart.products[i].productId;
            const count = cart.products[i].quantity;

            let att = await productdb.updateOne(
                {
                    _id: productId,
                },
                {
                    $inc: {
                        stockQuantity: -count,
                    },
                }
            );
            console.log("a", att);
        }

        // res.redirect("/profile?tab=orders");

        // Add any additional logic or response handling here

        res.status(200).send({ success: true, msg: "Payment success" });
    } catch (error) {
        console.error("Error in Razorpay success callback:", error);
        res.status(500).send({ success: false, msg: "Internal Server Error" });
    }
};

const failure = async (req, res) => {
    try {
        console.log("I'm in  failure ");
        const { razorpayOrderId, error, paymentResponse, mongodbOrderIds } = req.body;
        console.log(paymentResponse);

        console.log("Razorpay Order ID:", razorpayOrderId);
        console.log("Error Details:", error);
        console.log("MongoDB Order ID:", mongodbOrderIds);

        // Assuming you have received the payment failure response from Razorpay
        // Fetch the corresponding MongoDB order using the Razorpay order ID
        const mongoDBOrder = await orderdb.findOne({ onlinePaymentStatus: "intiated", _id: mongodbOrderIds });

        if (!mongoDBOrder) {
            console.error("MongoDB Order not found for Razorpay order ID:", razorpayOrderId);
            return res.status(404).send({ success: false, msg: "Order not found" });
        }
        mongoDBOrder.onlinePaymentStatus = "Failed";
        mongoDBOrder.onlineTransactionId = razorpayOrderId;
        await mongoDBOrder.save();

        // Add any additional logic related to handling payment failure
        // For example, update order status or log the failure details

        res.status(200).send({ success: true, msg: "Payment failure" });
    } catch (error) {
        console.error("Error in Razorpay failure callback:", error);
        res.status(500).send({ success: false, msg: "Internal Server Error" });
    }
};

const checkOut = async (req, res) => {
    try {
        const { RAZORPAY_ID_KEY } = process.env;
        const paymentOption = req.params.paymentOption;
        const couponId = req.query.code;
        let coupon;
        if (couponId && couponId.length > 0) {
            const formattedCouponId = couponId.trim();
            coupon = await Coupon.findOne({
                code: { $regex: new RegExp(`^${formattedCouponId}$`, "i") },
                couponActive: "Active", // Add this condition
            });

            if (!coupon) {
                // Coupon not found
                return res.status(404).json({ error: "Coupon not found" });
            }

            // Check if the coupon is expired
            const currentDate = new Date();
            if (coupon.expirationDate < currentDate) {
                return res.json({ valid: false, error: "Coupon has expired" });
            }

            if (coupon.startDate > currentDate) {
                return res.json({ valid: false, error: "Coupon is not yet Started" });
            }

            // Check if the currently logged-in user has already used the coupon
            const loggedInUserId = req.session.userid; // Assuming you store the user ID in the session
            if (coupon.usedBy.includes(loggedInUserId)) {
                return res.json({ valid: false, error: "Coupon has already been used by this user" });
            }

            // Coupon is valid
            // Now, update the user's cart to include the applied coupon information
            const userCart = await Cartdb.findOne({ user: loggedInUserId });

            if (userCart.subtotal < coupon.minOrderAmount) {
                return res.json({ valid: false, error: `Cart Value should be greater than ${coupon.minOrderAmount}` });
            }
        }

        if (paymentOption === "online") {
            const addressIndex = req.body.add;
            const userId = req.session.userid;
            const userAddr = await userdb.findById(userId);
            const addresses = userAddr.addresses[addressIndex];
            const cart = await Cartdb.findOne({ user: userId }).populate({
                path: "products.productId",
                model: "Product",
            });

            if (!cart) {
                return res.status(404).json({ error: "Cart not found" });
            }

            // Extract relevant information from the cart
            let { user, userEmail, products, subtotal } = cart;
            let ogAmount = subtotal;
            if (couponId && couponId.length > 0) {
                subtotal -= coupon.discountAmount;
            }

            // Create an order document based on the cart data
            const order = new orderdb({
                user,
                userEmail,
                Products: products.map((product) => ({
                    products: product.productId,
                    name: product.name,
                    price: product.productPrice,
                    quantity: product.quantity,
                    total: product.totalPrice,
                    orderStatus: "placed",
                    reason: "none",
                    image: product.image,
                })),

                paymentMode: paymentOption,
                subtotal: subtotal,
                date: new Date(),
                address: addresses,
                onlinePaymentStatus: "intiated",
                onlineTransactionId: "Not Available",
                coupon: {
                    code: coupon && coupon.code ? coupon.code : "NA",
                    originalAmount: ogAmount,
                },
            });

            // Save the order document
            const savedOrder = await order.save();
            const { ObjectId } = require("mongodb");
            const objectId = savedOrder._id;
            const mongodbOrderIdNo = objectId.toHexString();
            // let totalAmt=savedOrder.toat

            const timestamp = Date.now();
            const receiptId = `${userEmail}_${timestamp}`;

            const options = {
                amount: subtotal * 100, // Replace with the actual amount
                currency: "INR",
                receipt: receiptId,
                payment_capture: 0, // Manual capture of the payment
                notes: {
                    mongodbOrderId: mongodbOrderIdNo, // Pass the MongoDB order ID
                },
            };

            // Create a Razorpay order
            razorpay.orders.create(options, (err, razorpayOrder) => {
                if (err) {
                    console.error("Error creating Razorpay order:", err);
                    return res.status(500).send({ success: false, msg: "Internal Server Error" });
                }

                // Send the order details to the client
                res.status(200).send({
                    success: true,
                    msg: "Order Created",
                    orderId: razorpayOrder.id,
                    amount: razorpayOrder.amount, // Convert amount back to rupees
                    key_id: RAZORPAY_ID_KEY,
                    product_name: "Shoe Rack", // Replace with the actual product name
                    description: "Your order for Shoe Rack", // Replace with the actual product description
                    contact: addresses.phone,
                    name: `${addresses.firstName} ${addresses.lastName}`,
                    email: userAddr.email,
                    mongodbOrderId: options.notes.mongodbOrderId,
                });
            });
        } else if (paymentOption === "Wallet") {
            try {
                const addressIndex = req.body.addressIndex;
                const selectedBillingOption = req.body.billingOption;
                const userId = req.session.userid;
                const userAddr = await userdb.findById(userId);
                const addresses = userAddr.addresses[addressIndex];

                // Find the user's cart items
                const cart = await Cartdb.findOne({ user: userId }).populate({
                    path: "products.productId",
                    model: "Product",
                });

                if (!cart) {
                    return res.status(404).json({ error: "Cart not found" });
                }

                // Extract relevant information from the cart
                let { user, userEmail, products, subtotal } = cart;
                let ogAmount = subtotal;
                if (couponId && couponId.length > 0) {
                    subtotal -= coupon.discountAmount;
                }

                // Check if there's enough balance in the user's wallet
                const userWallet = await WalletModel.findOne({ userId });
                if (!userWallet || userWallet.balance < subtotal) {
                    return res.status(400).json({ error: "Insufficient wallet balance" });
                }

                // Create an order document based on the cart data
                const order = new orderdb({
                    user,
                    userEmail,
                    Products: products.map((product) => ({
                        products: product.productId,
                        name: product.name,
                        price: product.productPrice,
                        quantity: product.quantity,
                        total: product.totalPrice,
                        reason: "none",
                        image: product.image,
                    })),
                    orderStatus: "placed",
                    paymentMode: selectedBillingOption,
                    subtotal: subtotal,
                    date: new Date(),
                    address: addresses,
                    coupon: {
                        code: coupon && coupon.code ? coupon.code : "NA",
                        originalAmount: ogAmount,
                    },
                });

                // Save the order document
                const savedOrder = await order.save();

                // Update the user's wallet balance and add transaction history
                const transactionAmount = -subtotal; // Negative for debit
                userWallet.balance += transactionAmount;
                userWallet.history.push({
                    amount: transactionAmount,
                    type: "debit",
                    description: `Order ID: ${savedOrder._id} - Payment debited`,
                });
                await userWallet.save();

                if (couponId && couponId.length > 0) {
                    const coupon = await Coupon.findOne({ code: couponId });
                    coupon.usedBy.push(userId);
                    await coupon.save();
                }
                // Clear the user's cart after successful checkout
                await Cartdb.findOneAndDelete({ user: savedOrder.user });

                for (let i = 0; i < cart.products.length; i++) {
                    const productId = cart.products[i].productId;
                    const count = cart.products[i].quantity;

                    // Update product stock quantity
                    let att = await productdb.updateOne(
                        {
                            _id: productId,
                        },
                        {
                            $inc: {
                                stockQuantity: -count,
                            },
                        }
                    );
                    console.log("a", att);
                }

                res.redirect("/profile?tab=orders");
            } catch (error) {
                // Handle any errors
                console.error(error);
                res.status(500).json({ error: "Internal server error" });
            }
        } else if (paymentOption === "cod") {
            console.log(couponId);
            try {
                const addressIndex = req.body.addressIndex;
                const selectedBillingOption = req.body.billingOption;
                const userId = req.session.userid;
                const userAddr = await userdb.findById(userId);
                const addresses = userAddr.addresses[addressIndex];

                // Find the user's cart items
                const cart = await Cartdb.findOne({ user: userId }).populate({
                    path: "products.productId",
                    model: "Product",
                });

                if (!cart) {
                    return res.status(404).json({ error: "Cart not found" });
                }

                for (let i = 0; i < cart.products.length; i++) {
                    const productId = cart.products[i].productId;
                    const count = cart.products[i].quantity;
                    const availableQuantity = await productdb.findById(productId).select("stockQuantity").lean();

                    if (!availableQuantity || count > availableQuantity.stockQuantity) {
                        return res.status(400).json({
                            error: `Quantity not available for product: ${cart.products[i].name}. Or Out of Stock`,
                        });
                    }
                }
                // Extract relevant information from the cart
                let { user, userEmail, products, subtotal } = cart;

                let ogAmount = subtotal;

                if (couponId && couponId.length > 0) {
                    subtotal -= coupon.discountAmount;
                }

                // Create an order document based on the cart data
                const order = new orderdb({
                    user,
                    userEmail,
                    Products: products.map((product) => ({
                        products: product.productId,
                        name: product.name,
                        price: product.productPrice,
                        quantity: product.quantity,
                        total: product.totalPrice,
                        reason: "none",
                        image: product.image,
                    })),
                    orderStatus: "placed",
                    paymentMode: selectedBillingOption,
                    subtotal: subtotal,
                    date: new Date(),
                    address: addresses,
                    coupon: {
                        code: coupon && coupon.code ? coupon.code : "NA",
                        originalAmount: ogAmount,
                    },
                });

                // Save the order document
                const savedOrder = await order.save();

                if (couponId && couponId.length > 0) {
                    const coupon = await Coupon.findOne({ code: couponId });
                    coupon.usedBy.push(userId);
                    await coupon.save();
                }

                // Clear the user's cart after successful checkout
                await Cartdb.findOneAndDelete({ user: savedOrder.user });

                for (let i = 0; i < cart.products.length; i++) {
                    const productId = cart.products[i].productId;
                    const count = cart.products[i].quantity;

                    let att = await productdb.updateOne(
                        {
                            _id: productId,
                        },
                        {
                            $inc: {
                                stockQuantity: -count,
                            },
                        }
                    );
                    console.log("a", att);
                }

                res.redirect("/profile?tab=orders");
            } catch (error) {
                // Handle any errors
                console.error(error);
                res.status(500).json({ error: "Internal server error" });
            }
        }
    } catch (error) {
        console.error("Error in checkOut:", error);
        res.status(500).send({ success: false, msg: "Internal Server Error" });
    }
};

module.exports = {
    checkOut,
    success,
    failure,
};
