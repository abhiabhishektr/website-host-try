const fs = require("fs");
const pdf = require("html-pdf"); // You may need to install this package
const Order = require("../model/order");
const Coupon = require("../model/couponModel");
const Cart = require("../model/cartmodel");
const Banner = require("../model/banner");
const path = require("path");

const multer = require("multer");
const { title } = require("process");

const generateSalesReport = async (req, res) => {
    try {
        const startDate = req.body["start-date"];
        const endDate = req.body["end-date"];
        // Validate dates
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            return res.status(400).json({ error: "Invalid date format" });
        }

        // Convert dates to JavaScript Date objects with time included
        const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
        const endDateTime = new Date(`${endDate}T23:59:59.999Z`);

        // Use aggregation to fetch orders within the specified date range
        const orders = await Order.aggregate([
            {
                $match: {
                    date: { $gte: startDateTime, $lte: endDateTime },
                },
            },
            // Add more aggregation stages if needed
        ]);

        const updatedOrders = orders.map((order) => {
            order.Products.forEach((product) => {
                product._id = generateRandomString(5); // You can adjust the length as needed
            });
            return order;
        });

        return res.status(200).json({
            orders: updatedOrders,
            startDate: startDate,
            endDate: endDate,
        });
    } catch (error) {
        console.error("Error generating sales report:", error);
        return res.status(500).json({ error: "Failed to generate sales report" });
    }
};

const generateRandomString = (length) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// Helper function to check if a date is valid
const isValidDate = (dateString) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    const isDate = dateRegex.test(dateString);

    // console.log("isDate:", isDate);

    return isDate;
};

const salesReport = async (req, res) => {
    res.render("salesReports");
};

const bannersAdmin = async (req, res) => {
    res.render("banner");
};

const uploadPath = path.join(__dirname, "..", "public", "uploads");

const uploadBanner = async (req, res) => {

    try {
        if (req.query.delete && req.query.delete === "yes") {
            // Check if there are banners to delete
            const bannersToDelete = await Banner.find();
            
            if (bannersToDelete.length > 0) {
                // If there are banners, delete them
                await Banner.deleteMany();
                res.status(200).json({ message: "Banners Deleted successfully" });
            } else {
                // If no banners are found, send a message
                res.status(404).json({ message: "No banners found to delete" });
            }
        }else{

        // Extract the base64 image data from the request body
        const base64Data = req.body.image.split(";base64,").pop();

        // Generate a unique filename or use the original filename
        const filename = "uploaded_image.jpg";

        // Construct the full path for saving the file
        const filePath = path.join(uploadPath, filename);

        // Save the decoded image to the file
        fs.writeFileSync(filePath, base64Data, { encoding: "base64" });

        console.log("Image saved to:", filePath);

        await Banner.deleteMany();

        const NewBanner = new Banner({
            title: req.body.title,
            image: filename,
            link: req.body.link,
        });

        await NewBanner.save();

        // Respond with success message or other relevant information
        res.status(200).json({ message: "Image uploaded successfully" });
    }
    } catch (error) {
        console.error("Error uploading banner:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const CouponsAdmin = async (req, res) => {
    const existingCoupons = await Coupon.find();
    res.render("Coupon", { existingCoupons });
};

const CouponsAdminPost = async (req, res) => {
    try {
        const { code, discountType, discountAmount, startDate, expirationDate, minOrderAmount } = req.body;

        // Check if the coupon code already exists
        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({ error: "Coupon code already exists" });
        }

        // Validate discountType
        if (!["percentage", "fixed"].includes(discountType)) {
            return res.status(400).json({ error: "Invalid discount type" });
        }

        // Validate discountAmount and minOrderAmount
        if (discountAmount < 0 || minOrderAmount < 0) {
            return res.status(400).json({ error: "Discount amount and minimum order amount must not be negative" });
        }

        const newCoupon = new Coupon({
            code,
            discountType,
            discountAmount,
            startDate: new Date(startDate),
            expirationDate: new Date(expirationDate), // Assuming expirationDate is a string in 'yyyy-mm-dd' format
            minOrderAmount,
        });

        await newCoupon.save();
        // Fetch the updated list of coupons
        const allCoupons = await Coupon.find();

        res.status(201).json({ message: "Coupon added successfully!", allCoupons });
    } catch (error) {
        console.error("Error adding coupon:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const CouponsAdminManagements = async (req, res) => {
    try {
        let manage = req.params.manage;
        let couponId = req.query.couponId; // only in checking condition this came with the coupon code

        if (manage === "check") {
            try {
                const formattedCouponId = couponId.trim();

                const coupon = await Coupon.findOne({
                    code: { $regex: new RegExp(`^${formattedCouponId}$`, "i") },
                    couponActive: "Active", // Add this condition
                });

                if (!coupon) {
                    // Coupon not found
                    console.log(couponId);
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
                const userCart = await Cart.findOne({ user: loggedInUserId });

                if (userCart.subtotal < coupon.minOrderAmount) {
                    return res.json({ valid: false, error: `Cart Value should be greater than ${coupon.minOrderAmount}` });
                }

                if (userCart) {
                    return res.json({
                        valid: true,
                        discount: coupon.discountAmount,
                        code: coupon.code,
                        subtotal: userCart.subtotal,
                    });
                } else {
                    return res.status(404).json({ error: "Coupon not found" });
                }
            } catch (error) {
                console.error("Error:", error);
                return res.status(500).json({ error: "Internal server error" });
            }
        }

        const existingCoupon = await Coupon.findById(couponId);

        if (!existingCoupon) {
            return res.status(404).json({ error: "Coupon not found" });
        }

        if (manage === "update") {
            const updatedCouponData = req.body;
            // Update the existing coupon with the new data
            existingCoupon.code = updatedCouponData.code;
            existingCoupon.discountType = updatedCouponData.discountType;
            existingCoupon.startDate = updatedCouponData.startDate;
            existingCoupon.expirationDate = updatedCouponData.expirationDate;
            existingCoupon.discountAmount = updatedCouponData.discountAmount;
            existingCoupon.minOrderAmount = updatedCouponData.minOrderAmount;

            // Save the updated coupon to the database
            await existingCoupon.save();

            // Optionally, you can send a success response
            return res.status(200).json({ message: "Coupon updated successfully", updatedCoupon: existingCoupon });
        } else if (manage === "delete") {
            // Delete the existing coupon from the database
            const result = await Coupon.deleteOne({ _id: couponId });

            if (result.deletedCount > 0) {
                // Successfully deleted the coupon
                return res.status(200).json({ message: "Coupon deleted successfully" });
            } else {
                // Coupon not found or not deleted
                return res.status(404).json({ error: "Coupon not found or could not be deleted" });
            }
        } else if (manage === "deactivate") {
            existingCoupon.couponActive = "Active";
            await existingCoupon.save();

            return res.status(200).json({ message: "Coupon blocked successfully" });
        } else if (manage === "activate") {
            existingCoupon.couponActive = false;

            // Save the updated coupon to the database
            await existingCoupon.save();

            // Optionally, you can send a success response
            return res.status(200).json({ message: "Coupon deactivated successfully", updatedCoupon: existingCoupon });
        } else {
            return res.status(400).json({ error: "Invalid management action" });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    bannersAdmin,
    salesReport,
    generateSalesReport,
    CouponsAdmin,
    CouponsAdminPost,
    CouponsAdminManagements,
    // addBanner
    uploadBanner,
};
