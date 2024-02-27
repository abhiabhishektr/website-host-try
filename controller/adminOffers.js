const Offer = require("../model/offerModal"); // Adjust the path accordingly
const Product = require("../model/pdtmodel");
const Cart = require("../model/cartmodel");
const Category = require("../model/category");

const Offers = async (req, res) => {
    try {
        const allOffers = await Offer.find();

        res.render("Offer", { offers: allOffers });
    } catch (error) {
        console.error("Error fetching offers:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const addOfferToDatabase = async (offerData) => {
    try {
        const newOffer = new Offer(offerData);
        await newOffer.save();
        console.log("Offer added to the database:", newOffer);
        return newOffer;
    } catch (error) {
        console.error("Error adding offer to the database:", error);
        throw error;
    }
};

const adminOffers = async (req, res) => {
    const offerData = req.body;

    try {
        const addedOffer = await addOfferToDatabase(offerData);
        // You can send a response to the client or perform additional actions here if needed
        res.status(200).json({ message: "Offer added successfully", offer: addedOffer });
    } catch (error) {
        // Handle errors appropriately, e.g., send an error response to the client
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const OffersAdminManagement = async (req, res) => {
    try {
        let manage = req.params.manage;
        let offerId = req.query.offerId;

        const existingOffer = await Offer.findById(offerId);

        if (!existingOffer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        if (manage === "update") {
            const updatedOfferData = req.body;

            // Update the existing offer with the new data
            existingOffer.name = updatedOfferData.name;
            existingOffer.discountPercentage = updatedOfferData.discountPercentage;
            existingOffer.startDate = updatedOfferData.startDate;
            existingOffer.endDate = updatedOfferData.endDate;

            // Save the updated offer to the database
            await existingOffer.save();

            // Optionally, you can send a success response
            return res.status(200).json({ message: "Offer updated successfully", updatedOffer: existingOffer });
        } else if (manage === "delete") {
            // Delete the existing offer from the database
            const result = await Offer.deleteOne({ _id: offerId });

            if (result.deletedCount > 0) {
                // Successfully deleted the offer
                return res.status(200).json({ message: "Offer deleted successfully" });
            } else {
                // Offer not found or not deleted
                return res.status(404).json({ error: "Offer not found or could not be deleted" });
            }
        } else if (manage === "activate") {
            existingOffer.offerActive = "Not";
            await existingOffer.save();

            return res.status(200).json({ message: "Offer deactivated successfully" });
        } else if (manage === "deactivate") {
            existingOffer.offerActive = "Active";

            // Save the updated offer to the database
            await existingOffer.save();

            // Optionally, you can send a success response
            return res.status(200).json({ message: "Offer activated successfully", updatedOffer: existingOffer });
        } else {
            return res.status(400).json({ error: "Invalid management action" });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const applyoffer = async (req, res) => {
    const productId = req.params.id;
    const { discountPercentage } = req.body;

    try {
        // Retrieve the product by ID
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        let temp = product.price;
        // Calculate the discounted price
        const discountAmount = (discountPercentage / 100) * product.price;
        const discountedPrice = product.price - discountAmount;

        if (!product.singleOffer) {
            product.singleOffer = [];
        }

        // Update the product with the discounted price and offer details
        product.priceoffer = temp;
        product.price = discountedPrice; // Update the original price to the discounted price
        product.singleOffer.push({
            date: new Date(),
            discountPercentage,
            discountedAmount: discountAmount,
        });

        // Save the updated product
        await product.save();

        return res.status(200).json({ message: "Offer applied successfully", product });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const canceloffer = async (req, res) => {
    const productId = req.params.id;

    try {
        // Retrieve the product by ID
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Check if there is any applied offer to cancel
        if (product.singleOffer && product.singleOffer.length > 0) {
            // Get the details of the last applied offer
            // const lastOffer = product.singleOffer.pop();

            // Revert the changes made by the applyoffer function
            product.price = product.priceoffer;
            product.priceoffer = null;

            // Save the updated product
            await product.save();
            return res.status(200).json({ message: "Offer canceled successfully", product });
        } else {
            return res.status(400).json({ message: "No offer to cancel" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};




const applyOfferCategory = async (req, res) => {
    const { categoryId, selectedOfferId } = req.body;
    console.log(req.body);

    try {
        const selectedCategory = await Category.findOne({ _id: categoryId });

        // Step 1: Retrieve Products in the Category
        const productsInCategory = await Product.find({
            category: selectedCategory.subName,
            gender: selectedCategory.Name,
        });

        const offer = await Offer.findOne({ _id: selectedOfferId });
        const discountPercentage = offer.discountPercentage;

        // Step 2: Apply Offer to Each Product
        for (const product of productsInCategory) {
            const { price } = product;
            // Calculate discounted price based on the offer
            const discountedPrice = price - price * (discountPercentage / 100);

            // Save the original price to the priceoffer field
            product.priceoffer = price;

            // Update the product's price to the discounted price
            product.price = discountedPrice;

            // Save the product changes to the database
            await product.save();
        }

        selectedCategory.OfferApplied = 'yes';
        await selectedCategory.save();

        // Step 3: Update Cart Prices
        const cartsWithProductsInCategory = await Cart.find({
            "products.productId": { $in: productsInCategory.map((p) => p._id) },
        });

        for (const cart of cartsWithProductsInCategory) {
            for (const cartProduct of cart.products) {
                const productInCategory = productsInCategory.find((p) => p._id.equals(cartProduct.productId));

                // Update the cart product's price based on the updated product price
                cartProduct.productPrice = productInCategory ? productInCategory.price : cartProduct.productPrice;
                cartProduct.totalPrice = cartProduct.quantity * cartProduct.productPrice;
            }

            // Recalculate the subtotal based on the updated prices
            cart.subtotal = cart.products.reduce((total, product) => total + product.totalPrice, 0);

            // Save the cart changes to the database
            await cart.save();
        }

        res.status(200).json({ message: "Offer applied successfully to the category and cart prices updated." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};




const removeCategoryOffersAndClearCart = async (req, res) => {
    const { categoryId } = req.params; // Assuming categoryId is passed as a parameter in the route

    try {
        // Step 1: Find the category by categoryId
        const category = await Category.findOne({ _id: categoryId });

        // Step 2: Find products in the category
        const productsInCategory = await Product.find({
            category: category.subName,
            gender: category.Name,
        });

        // Step 3: Remove offers from all products in the category and swap values
        for (const product of productsInCategory) {
            if (product.priceoffer !== null) {
                // Swap values between price and priceoffer
                const temp = product.price;
                product.price = product.priceoffer;
                product.priceoffer = null;
                // Remove the priceoffer field
                delete product.priceoffer;
                await product.save();
            }
        }
       

        // Step 4: Find carts with products in the category and clear price issues
        const cartsWithProductsInCategory = await Cart.find({
            "products.productId": { $in: productsInCategory.map((p) => p._id) },
        });

        for (const cart of cartsWithProductsInCategory) {
            for (const cartProduct of cart.products) {
                const productInCategory = productsInCategory.find((p) => p._id.equals(cartProduct.productId));

                // Clear price issue by setting productPrice back to the original price
                if (productInCategory) {
                    cartProduct.productPrice = productInCategory.price;
                    cartProduct.totalPrice = cartProduct.quantity * cartProduct.productPrice;
                }
            }

            // Recalculate the subtotal based on the updated prices
            cart.subtotal = cart.products.reduce((total, product) => total + product.totalPrice, 0);

            // Save the cart changes to the database
            await cart.save();
        }

        category.OfferApplied = 'no'; // Assuming OfferApplied is a field in the Category model
        await category.save();

res.redirect('/category')

        // res.status(200).json({ message: "Category offers removed, and cart prices cleared successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};





module.exports = {
    Offers,
    adminOffers,
    OffersAdminManagement,
    applyoffer,
    canceloffer,
    applyOfferCategory,
    removeCategoryOffersAndClearCart
};
