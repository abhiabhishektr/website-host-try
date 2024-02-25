const user = require("../model/usermodel");
const ptd = require("../model/pdtmodel");
const catdb = require("../model/category");
const orderdb = require("../model/order");
const cartdb = require("../model/cartmodel");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const WalletModel = require("../model/wallet");
const Wishlist = require("../model/wishlistModel");
const Banner = require("../model/banner");
const Cartdb = require("../model/cartmodel");

const home = async (req, res) => {
    try {
        // Fetch products for the homepage
        let products = await ptd.find().limit(4);

        // Fetch the banner, providing a default empty object if none is found
        let banner = (await Banner.findOne()) || 1;

        const userId = req.session.userid;
        const wishlist = await Wishlist.findOne({ user: userId });

        if (wishlist && wishlist.products.length > 0) {
            products = await isInWishlist(products, userId);
        }

        const Cart = await Cartdb.findOne({ user: userId });

        if (Cart && Cart.products.length > 0) {
            products = await isInCart(products, userId);
        }

        // Render the view with the products, banner, and cart count
        res.render("homepage", { products, banner, cartCount: req.cartCount });
    } catch (error) {
        console.error("Error while showing all products", error);

        // Handle the error accordingly, for example, redirect to an error page
        res.status(500).render("error", { error: "Internal Server Error" });
    }
};

const forgotPasswordReset = async (req, res) => {
    console.log("Hai i'm here");
    const nodemailer = require("nodemailer");
    const generateToken = () => {
        return Math.floor(1000 + Math.random() * 9000).toString();
    };
    generettedOtp = generateToken();
    try {
        const email = req.body.email;
        console.log(email);
        const users = await user.findOne({ email });

        if (!users) {
            return res.json({ success: false, message: "User does not exist." });
        }
        // if (!users.token) {
        // Token field does not exist, update the document
        const result = await user.updateOne({ email: email }, { $set: { token: generettedOtp } });

        console.log("hai this is generateToken ", generettedOtp);
        console.log(result);
        if (result.modifiedCount > 0) {
            console.log("Token added successfully.");

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "abhishekabtr@gmail.com",
                    pass: "ynvf qhpi ykrm nwdm",
                },
            });

            const mailOptions = {
                from: "abhishekabtr@gmail.com",
                to: email,
                subject: "Reset Password",
                text: `Click the link to reset your password: http://localhost:3000/resetPassword?name=${users.email}&token=${generettedOtp}`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error:", error);
                    res.json({ success: false, message: "Failed to send email." });
                } else {
                    console.log("Email sent:", info.response);
                    res.json({ success: true, message: "Email sent successfully." });
                }
            });

            if (users) {
                return res.json({ success: false, message: "Reset Mail has Sent to Your email" });

                // return res.json({ success: true, message: "Token added successfully." });
            } else {
                console.error("Error:");
                return res.json({ success: false, message: "ERROR." });
            }
        }
        // } else {
        //     console.log("Token already exists.");
        //     // return res.json({ success: true, message: "Token already exists." });
        // }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const resetPasswordPost = async (req, res) => {
    try {
        let token = req.body.usertoken;
        let email = req.body.useremail;
        let newPassword = req.body.newPassword;

        // Hash the new password
        const hashedPassword = await crypting(newPassword);

        // Find the user with the provided email and matching token
        const users = await user.findOne({ email: email, token: token });

        if (!users) {
            console.log("user not found");
            return res.status(404).json({ success: false, message: "User not found or invalid token." });
        }

        // Update the user's password
        users.password = hashedPassword;
        if (users.token === token) {
            users.token = null;
        }

        // Reset the token to null (or remove the token field if not needed anymore)
        // users.addresses.forEach((address) => {

        // });

        // Save the updated user document
        await users.save();
        console.log("pass change done");
        return res.status(200).json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        console.error("An error occurred:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const resetPassword = async (req, res) => {
    let name = req.query.name;
    let emailcheck = await user.findOne({ email: name });
    let userName = emailcheck.name;
    res.render("resetPassword", { userName });
};

const forgotPassword = async (req, res) => {
    res.render("forgotPassword");
};

const login = (req, res) => {
    const loginMessage = req.query.loginMessage;

    // Render the login page with the loginMessage variable
    res.render("login", { loginMessage });
};

const signOutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying sessions:", err);
            res.status(500).send("Internal Server Error");
        } else {
            res.redirect("/"); // Redirect to login page after destroying sessions
        }
    });
};

// Hash the password
const crypting = (password) => {
    return bcrypt.hash(password, 10);
};

// compairing the passwords after hashing

const comparePasswords = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

const signup = async (req, res) => {
    // console.log(req.body.email);
    const referal = req.body.referralCode;
    console.log("referal::", referal);
    const hashedPassword = await crypting(req.body.password);
    let emailcheck = await user.findOne({ email: req.body.email });

    // console.log(emailcheck.otp);
    if (emailcheck && emailcheck.otp == true) {
        res.render("login", { existerorr: "Same user Exist" });
    } else {
        let usernew = new user({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            appliedReferal: referal || null,
        });
        usernew.save();

        res.render("otp1", { existerorr: "Click to Get OTP in mail", email: req.body.email });
    }
};
// emailcheck.email
const otp = async (req, res) => {
    res.render("otp1");
};

const otpvalidation = async (req, res) => {
    try {
        const mailid = req.body.email;
        const fullotp = req.body.otp;

        // Assuming `generettedOtp` is defined somewhere in your code
        if (fullotp === generettedOtp) {
            // Update user document to set OTP to true
            await user.updateOne({ email: mailid }, { $set: { otp: true } });

            // Check if the user has a referral code
            const userWithReferral = await user.findOne({ email: mailid, appliedReferal: { $exists: true } });

            if (userWithReferral) {
                // Check if the referral code exists in the system
                const referrer = await user.findOne({ referalcode: userWithReferral.appliedReferal });

                if (referrer) {
                    // Check if the referrer already has a wallet
                    const existingReferrerWallet = await WalletModel.findOne({ userId: referrer._id });

                    if (existingReferrerWallet) {
                        // Add $200 to the existing referrer's wallet
                        const referrerWalletUpdate = await WalletModel.updateOne(
                            { userId: referrer._id },
                            {
                                $inc: { balance: 200 },
                                $push: {
                                    history: {
                                        amount: 200,
                                        type: "credit",
                                        description: "Referral Bonus from " + userWithReferral.name,
                                    },
                                },
                            }
                        );

                        console.log(`${referrerWalletUpdate.nModified} referrer's wallet updated`);
                    } else {
                        // Create a new wallet for the referrer and push $200
                        const newReferrerWallet = new WalletModel({
                            userId: referrer._id,
                            balance: 200,
                            history: [
                                {
                                    amount: 200,
                                    type: "credit",
                                    description: "Referral Bonus from " + userWithReferral.name,
                                },
                            ],
                        });

                        await newReferrerWallet.save();
                        console.log("New wallet created for the referrer");
                    }
                }

                // Check if the referred user already has a wallet
                const existingWallet = await WalletModel.findOne({ userId: userWithReferral._id });

                if (existingWallet) {
                    // Add $200 to the existing wallet
                    const walletUpdate = await WalletModel.updateOne(
                        { userId: userWithReferral._id },
                        {
                            $inc: { balance: 200 },
                            $push: {
                                history: {
                                    amount: 200,
                                    type: "credit",
                                    description: "Referral Bonus",
                                },
                            },
                        }
                    );

                    console.log(`${walletUpdate.nModified} wallet updated`);
                } else {
                    // Create a new wallet for the referred user and push $200
                    const newWallet = new WalletModel({
                        userId: userWithReferral._id,
                        balance: 200,
                        history: [
                            {
                                amount: 200,
                                type: "credit",
                                description: "Referral Bonus",
                            },
                        ],
                    });

                    await newWallet.save();
                    console.log("New wallet created for the referred user");
                }
                await user.updateOne({ email: mailid }, { $unset: { appliedReferal: 1 } });
            }

            res.status(200).json({ message: "Registration successful, login now" });

            // for Currently In testing purpose the false datas are deleted manually after deplaying It can be
            //given to a set time interval one day or any other time. by considering the potential false of this process
            const result = await user.deleteMany({ otp: false });
            console.log(`${result.deletedCount} documents deleted`);
        } else {
            res.status(400).json({ message: "Failed" });
        }
    } catch (error) {
        console.error("Error in otpvalidation:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

let generettedOtp;

// Handle the POST request to /sendotp
const sendotp = async (req, res) => {
    const { email } = await req.body;
    console.log(email);
    const nodemailer = require("nodemailer");

    // Function to generate a random 4-digit OTP
    const generateOTP = () => {
        return Math.floor(1000 + Math.random() * 9000).toString();
    };

    // Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "abhishekabtr@gmail.com",
            pass: "ynvf qhpi ykrm nwdm", // Replace with your actual generated App Password
        },
    });

    // Generate a random 4-digit OTP
    generettedOtp = generateOTP();
    console.log(generettedOtp);
    // Define the email options with HTML content

    const mailOptions = {
        from: "abhishekabtr@gmail.com",
        to: email,
        subject: "Welcome to Shoe Rack",
        html: `<p>Welcome to Shoe Rack, where every step is a stylish journey. Step in and discover the perfect pair for your unique style!</p><p style="font-size: larger; font-weight: bold; color: blue; ">Your OTP is: ${generettedOtp}</p>`,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });

    res.json({ message: "OTP sent successfully" });
};

const logincheck = async (req, res) => {
    try {
        let usercheck = await user.findOne({ email: req.body.email });

        if (
            usercheck &&
            (await comparePasswords(req.body.password, usercheck.password)) &&
            usercheck.otp == true &&
            usercheck.Status == true
        ) {
            req.session.user = req.body.email;
            req.session.userid = usercheck._id;

            res.redirect("/");
        } else {
            if (usercheck && usercheck.Status == false) {
                res.render("login", { message: "User blocked" });
            } else {
                res.render("login", { message: "Invalid username or password" });
            }
        }
    } catch (error) {
        console.error("Error in logincheck:", error);
        res.render("login", { message: "An error occurred during login" });
    }
};

// userController

// const fullpdt = async (req, res) => {
//     try {
//         const MainCat = req.params.MainCat;

//         if (MainCat === "Men" || MainCat === "Women" || MainCat === "Kids") {
//             // Fetch products based on the specified gender category
//             const products = await ptd.find({
//                 gender: MainCat,
//                 status: "Active",
//                 productDeleted: { $ne: "deleted" },
//             });
//             let mainCatLower = MainCat.toLowerCase();
//             const categories = await catdb.find({ Name: mainCatLower });

//             // Extract unique subName values from the categories array
//             const uniqueSubNames = [...new Set(categories.map((category) => category.subName))];

//             const brands = await ptd
//                 .find({
//                     status: "Active",
//                     productDeleted: { $ne: "deleted" },
//                 })
//                 .distinct("manufacturer");

//             // Render the 'fullpdt' template and pass the filtered products as a variable
//             res.render("fullpdt", { products, uniqueSubNames, brands, cartCount: req.cartCount });
//         } else if (MainCat == 0) {
//             // Fetch categories with Status set to true
//             const activeCategories = await catdb.find({ Status: true });

//             // Extract category names from the active categories
//             const activeCategoryNames = activeCategories.map((category) => category.subName);

//             // Fetch all products that belong to the active categories
//             const products = await ptd.find({
//                 category: { $in: activeCategoryNames },
//                 status: "Active",
//                 productDeleted: { $ne: "deleted" },
//             });
//             const categories = await catdb.find();

//             // Extract unique subName values from the categories array
//             const uniqueSubNames = [...new Set(categories.map((category) => category.subName))];

//             const brands = await ptd
//                 .find({
//                     status: "Active",
//                     productDeleted: { $ne: "deleted" },
//                 })
//                 .distinct("manufacturer");

//             // Render the 'fullpdt' template and pass the filtered products as a variable
//             res.render("fullpdt", { products, uniqueSubNames, brands, cartCount: req.cartCount });
//         } //for sraching
//         else {
//             console.log(MainCat); // this is the search text
//             const regex = new RegExp(MainCat, "i");
//             const products = await ptd.find({
//                 $or: [
//                     { name: regex },
//                     { manufacturer: regex },
//                     // Add more fields if needed
//                 ],
//             });

//             // res.json(products);
//             console.log(products);

//             const categories = await catdb.find();

//             // Extract unique subName values from the categories array
//             const uniqueSubNames = [...new Set(categories.map((category) => category.subName))];
//             console.log("Rendering fullpdt page");
//             // Render the 'fullpdt' template and pass the filtered products as a variable

//             const brands = await ptd
//                 .find({
//                     status: "Active",
//                     productDeleted: { $ne: "deleted" },
//                 })
//                 .distinct("manufacturer");

//             res.render("fullpdt", { products, uniqueSubNames, brands, cartCount: req.cartCount });
//         }
//     } catch (error) {
//         console.error("Error fetching products:", error);
//         res.status(500).send("Internal Server Error");
//     }
// };

// const fullpdt = async (req, res) => {
//     try {
//         const MainCat = req.params.MainCat;
//         const page = parseInt(req.query.page) || 1; // Get the requested page from the query parameters
//         const itemsPerPage = 12; // Adjust the number of items per page as needed

//         let query = {
//             status: "Active",
//             productDeleted: { $ne: "deleted" },
//         };

//         const activeCategories = await catdb.find({ Status: true });
//         const activeCategoryNames = activeCategories.map((category) => category.subName);
//         query.category = { $in: activeCategoryNames };

//         if (MainCat === "Men" || MainCat === "Women" || MainCat === "Kids") {
//             // Fetch products based on the specified gender category
//             query.gender = MainCat;
//         } else if (MainCat == 0) {
//             // Fetch products based on all active categories
//         } else {
//             console.log(MainCat);
//             // Fetch products based on search text
//             const regex = new RegExp(MainCat, "i");
//             query.$or = [
//                 { name: regex },
//                 { manufacturer: regex },
//                 { category: regex },
//                 // Add more fields if needed
//             ];
//         }

//         const totalProducts = await ptd.countDocuments(query);
//         let totalProductsCount = totalProducts;

//         const totalPages = Math.ceil(totalProducts / itemsPerPage);
//         const skip = (page - 1) * itemsPerPage;

//         const products = await ptd.find(query).skip(skip).limit(itemsPerPage);
//         const sizes = await ptd.distinct("size", query);
//         const uniqueSubNames = await ptd.distinct("category", query);
//         const brands = await ptd.distinct("manufacturer", query);

//         res.render("fullpdt", {
//             products,
//             uniqueSubNames,
//             brands,
//             cartCount: req.cartCount,
//             totalPages,
//             currentPage: page,
//             MainCat,
//             totalProductsCount,
//             sizes,
//         });
//     } catch (error) {
//         console.error("Error fetching products:", error);
//         res.status(500).send("Internal Server Error");
//     }
// };

const isInCart = async (products, userId) => {
    try {
        const userCart = await Cartdb.findOne({ user: userId });

        // Create a map for faster lookups of cart productIds
        const cartProductIds = new Set(userCart.products.map((product) => product.productId.toString()));

        // Check if each wishlist product is in the cart
        products.forEach((product) => {
            if (product._id) {
                const isInCartCheck = cartProductIds.has(product._id.toString());
                product.isInCart = isInCartCheck;
            } else {
                console.error("ProductId is undefined for a product:", product);
            }
        });

        return products;
    } catch (error) {
        console.error("Error checking isInCart:", error);
        // return products.map(product => ({ ...product, isInCart: false }));
    }
};

const isInWishlist = async (products, userId) => {
    try {
        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            return products.map((product) => ({ ...product, isInWishlist: false }));
        }

        const WishlistProductIds = new Set(wishlist.products.map((product) => product.productId.toString()));

        products.forEach((product) => {
            const isInWish = WishlistProductIds.has(product._id.toString());
            product.isInWishlist = isInWish;
        });
        //    console.log(products);
        return products;
    } catch (error) {
        console.error("Error checking wishlist:", error);
        // return products.map(product => ({ ...product, isInWishlist: false }));
    }
};

const fullpdt = async (req, res) => {
    try {
        // console.log(req.query);
        const MainCat = req.params.MainCat;
        const page = parseInt(req.query.page) || 1; // Get the requested page from the query parameters
        const itemsPerPage = 12; // Adjust the number of items per page as needed
        const search = req.query.search || req.query.q;
        // Get selected sort option
        const selectedSortOption = req.query.sortby;

        let query = {
            status: "Active",
            productDeleted: { $ne: "deleted" },
        };

        const activeCategories = await catdb.find({ Status: true });
        const activeCategoryNames = activeCategories.map((category) => category.subName);
        query.category = { $in: activeCategoryNames };

        if (MainCat === "Men" || MainCat === "Women" || MainCat === "Kids") {
            // Fetch products based on the specified gender category
            query.gender = MainCat;
        } else if (MainCat == 0) {
            // Fetch products based on all active categories
        }
        // && search!=='[object Event]'
        if (search && search.length > 1) {
            // Fetch products based on search text
            const regex = new RegExp(req.query.search, "i");
            query.$or = [
                { name: regex },
                { manufacturer: regex },
                { category: regex },
                // Add more fields if needed
            ];
        }

        // Apply filtering based on categories, sizes, and brands
        if (req.query.categories || req.query.sizes || req.query.brands) {
            // Get selected categories, sizes, and brands
            const selectedCategories = req.query.categories ? req.query.categories.split(",") : [];
            const selectedSizes = req.query.sizes ? req.query.sizes.split(",") : [];
            const selectedBrands = req.query.brands ? req.query.brands.split(",") : [];

            // Update the query with selected filters

            if (selectedCategories.length !== 0) {
                query.category = { $in: selectedCategories };
            }
            if (selectedSizes.length !== 0) {
                query.size = { $in: selectedSizes };
            }
            if (selectedBrands.length !== 0) {
                query.manufacturer = { $in: selectedBrands };
            }
        }

        const totalProducts = await ptd.countDocuments(query);
        let totalProductsCount = totalProducts;

        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        const skip = (page - 1) * itemsPerPage;

        // Apply sorting based on the selected sort option
        let sort = {};
        if (selectedSortOption === "price-high") {
            sort.price = -1; // Sort by price in descending order
        } else if (selectedSortOption === "price-low") {
            sort.price = 1; // Sort by price in ascending order
        } else {
            sort.popularity = -1; // Sort by popularity in descending order
        }

        let products = await ptd.find(query).sort(sort).skip(skip).limit(itemsPerPage);
        const sizes = await ptd.distinct("size", query);
        const uniqueSubNames = await ptd.distinct("category", query);
        const brands = await ptd.distinct("manufacturer", query);

        // Get the base URL without any query parameters
        let baseUrl = req.originalUrl.split("?")[0];

        // Get the current query parameters and convert them to an object
        let queryParams = new URLSearchParams(req.originalUrl.split("?")[1]);

        // Update the 'page' query parameter for the previous and next pages
        queryParams.set("page", page > 1 ? page - 1 : 1);
        let prevPageUrl = baseUrl + "?" + queryParams.toString();

        queryParams.set("page", page < totalPages ? page + 1 : totalPages);
        let nextPageUrl = baseUrl + "?" + queryParams.toString();

        // Generate the URLs for each page number
        let pageUrls = [];
        for (let i = 1; i <= totalPages; i++) {
            queryParams.set("page", i);
            pageUrls[i] = baseUrl + "?" + queryParams.toString();
        }

        const userId = req.session.userid;
        const wishlist = await Wishlist.findOne({ user: userId });

        if (wishlist && wishlist.products.length > 0) {
            products = await isInWishlist(products, userId);
        }

        const Cart = await Cartdb.findOne({ user: userId });

        if (Cart && Cart.products.length > 0) {
            products = await isInCart(products, userId);
        }

        res.render("fullpdt", {
            products,
            uniqueSubNames,
            brands,
            cartCount: req.cartCount,
            totalPages,
            currentPage: page,
            MainCat,
            totalProductsCount,
            sizes,
            prevPageUrl,
            nextPageUrl,
            pageUrls,
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
};

// =====================product ====================

const product = async (req, res) => {
    const productId = req.params.id;

    try {
        const product = await ptd.findOne({ _id: productId });

        // Extract product name and manufacturer
        const productName = product.name;
        const manufacturer = product.manufacturer;

        // Find related products with the same name and manufacturer (case-insensitive)
        // const DiferentSizeProducts = await ptd.find({
        //     $and: [
        //         { name: { $regex: new RegExp(productName, "i") } },
        //         { manufacturer: { $regex: new RegExp(manufacturer, "i") } },
        //         { _id: { $ne: product._id } }, // Exclude the main product
        //     ],
        // });

        const DiferentSizeProducts = await ptd.find({
            $and: [
                { name:productName },
                { manufacturer:manufacturer},
            ],
        });



        const DiferentSizeProductsListing = DiferentSizeProducts.map((product) => {
            const { _id: productId, size } = product;
            return { productId, size };
        });
        
        // console.log("DiferentSizeProductsListing", DiferentSizeProductsListing);
        


        const productList = Object.values(DiferentSizeProductsListing);

// Sort the array based on the 'size' property
productList.sort((a, b) => a.size.localeCompare(b.size, undefined, { sensitivity: 'base' }));

// Now, productList is sorted based on the 'size' property
// console.log("productList", productList);


        const products = await ptd.find().limit(4); // Use find() instead of findOne()

        const userId = req.session.userid;
        const cart = await cartdb.findOne({ user: userId });
        const wishlist = await Wishlist.findOne({ user: userId });

        let isInCart = false,
            isInwish = false;
        if (cart) {
            const cartProductIds = cart.products.map((product) => product.productId.toString());
            isInCart = cartProductIds.includes(productId);
        }
        if (wishlist) {
            const wishlistProductIds = wishlist.products.map((product) => product.productId.toString());
            isInwish = wishlistProductIds.includes(productId);
        }

        // console.log("isInCart ::", isInCart);
        // console.log("isInwish ::", isInwish);

        res.render("product", { product, products, isInCart, isInwish, productList, cartCount: req.cartCount });
    } catch (error) {
        console.error("Error finding product:", error);
    }
};

// =====================Profile ====================

// const profile = async (req, res) => {
//     try {
//         const userId = req.session.userid;
//         const email = req.session.user;

//         if (!userId) {
//             res.redirect('/login');
//         }

//         const userdata = await user.findById(userId);

//         if (!userdata) {
//             return res.status(404).send("User not found");
//         }

//         // Check if the user already has a referral code
//         if (!userdata.referalcode) {
//             // If not, generate a referral code based on the user's email
//             const userEmailWithoutDomain = email.split('@')[0];
//             const randomDigits = Math.floor(1000 + Math.random() * 9000); // Add random digits
//             const referralCode = `${userEmailWithoutDomain}${randomDigits}`;
//             userdata.referalcode = referralCode;
//             // Update the user's data with the referral code
//             await user.findByIdAndUpdate(userId, { referalcode: referralCode }, { new: true });
//         }

//         const addresses = userdata.addresses || [];

//         // Pagination for orders
//         const page = parseInt(req.query.page) || 1;
//         const pageSize = 10; // Adjust this value based on the desired number of orders per page

//         const totalOrders = await orderdb.countDocuments({ user: userId });
//         const totalPages = Math.ceil(totalOrders / pageSize);

//         const orders = await orderdb
//             .find({ user: userId })
//             .populate({
//                 path: "Products.products",
//                 model: "Product",
//             })
//             .skip((page - 1) * pageSize)
//             .limit(pageSize);

//         const walletData = await WalletModel.findOne({ userId }).limit(15);

//         const selectedTab = req.query.tab || "defaultTab";
//         res.render("profile", {
//             addresses,
//             orders,
//             selectedTab,
//             userId,
//             userdata,
//             walletData,
//             referal: userdata.referalcode,
//             cartCount: req.cartCount,
//             currentPage: page,
//             totalPages,
//         });
//     } catch (error) {
//         console.error('Error in profile:', error);
//         // res.status(500).json({ error: 'Internal Server Error' });
//     }
// };

const profile = async (req, res) => {
    try {
        const userId = req.session.userid;
        const email = req.session.user;

        if (!userId) {
            res.redirect("/login");
        } else {
            const userdata = await user.findById(userId);

            if (!userdata) {
                return res.status(404).send("User not found");
            }

            // Check if the user already has a referral code
            if (!userdata.referalcode) {
                // If not, generate a referral code based on the user's email
                const userEmailWithoutDomain = email.split("@")[0];
                const randomDigits = Math.floor(1000 + Math.random() * 9000); // Add random digits
                const referralCode = `${userEmailWithoutDomain}${randomDigits}`;
                userdata.referalcode = referralCode;
                // Update the user's data with the referral code
                await user.findByIdAndUpdate(userId, { referalcode: referralCode }, { new: true });
            }

            const addresses = userdata.addresses || [];

            // Pagination for orders
            const page = parseInt(req.query.page) || 1;
            const pageSize = 10; // Adjust this value based on the desired number of orders per page

            const totalOrders = await orderdb.countDocuments({ user: userId });
            const totalPages = Math.ceil(totalOrders / pageSize);

            const orders = await orderdb
                .find({ user: userId })
                .populate({
                    path: "Products.products",
                    model: "Product",
                })
                .skip((page - 1) * pageSize)
                .limit(pageSize);

            // Calculate pagination URLs
            const pageUrls = Array.from({ length: totalPages }, (_, i) => `/profile?tab=orders&page=${i + 1}`);

            // Define prevPageUrl and nextPageUrl
            const prevPageUrl = page > 1 ? `/profile?tab=orders&page=${page - 1}` : null;
            const nextPageUrl = page < totalPages ? `/profile?tab=orders&page=${page + 1}` : null;

            const walletData = await WalletModel.findOne({ userId }).limit(15);

            const selectedTab = req.query.tab || "defaultTab";
            res.render("profile", {
                addresses,
                orders,
                selectedTab,
                userId,
                userdata,
                walletData,
                referal: userdata.referalcode,
                cartCount: req.cartCount,
                currentPage: page,
                totalPages,
                prevPageUrl,
                nextPageUrl,
                pageUrls,
            });
        }
    } catch (error) {
        console.error("Error in profile:", error);
        // res.status(500).render("error", { error: "Internal Server Error" });
    }
};

// =====================delete Address ====================
const deleteAddress = async (req, res) => {
    try {
        const indexToDelete = req.params.id;
        const userId = await req.session.userid;
        // Step 1: Set the value at the specified index to null
        await user.findByIdAndUpdate(userId, { $set: { [`addresses.${indexToDelete}`]: null } });

        // Step 2: Remove null values from the array
        const userc = await user.findByIdAndUpdate(userId, { $pull: { addresses: null } }, { new: true });

        if (!userc) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({});
        // res.redirect("/profile?tab=address");
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const editAddress = async (req, res) => {
    const userId = req.session.userid; // Assuming you have the user's ID in the session

    try {
        // Fetch the user data from the database
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Extract the address index from the request parameters
        const addressIndex = req.params.id;

        // Ensure the address index is valid
        if (addressIndex < 0 || addressIndex >= user.addresses.length) {
            return res.status(400).json({ error: "Invalid address index" });
        }

        // Get the existing address data
        const existingAddress = user.addresses[addressIndex];

        // Render a form with the existing address data for the user to edit
        res.render("editAddressForm", { existingAddress });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const orderStatusUpdation = async (req, res) => {
    const { id } = req.params;
    const { reason, productId } = req.body;

    try {
        const order = await orderdb.findById(id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.onlinePaymentStatus === "initiated") {
            return res.status(404).json({ message: "Invalid request. Order not yet completed properly or payment failed" });
        }

        let changeStatus;
        // let  changeStatusforWallet, productAmount;

        const product = order.Products.find((prod) => prod._id.toString() === productId);

        if (!product) {
            return res.status(404).json({ message: "Product not found in the order" });
        }

        if (product.orderStatus === "placed" || product.orderStatus === "shipped") {
            changeStatus = "Cancellation requested";
            changeStatusforWallet = "Cancellation requested";
        } else if (product.orderStatus === "delivered") {
            changeStatus = "Return requested";
            changeStatusforWallet = "Return requested";
        }

        try {
            const updatedUsers = await orderdb.updateOne(
                { _id: id, "Products._id": productId },
                {
                    $set: {
                        "Products.$.orderStatus": changeStatus,
                        "Products.$.reason": reason,
                    },
                }
            );
        } catch (error) {
            console.error(error);
            // Handle order status update error
        }

        res.json({ message: "Order status updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

const updateMobile = async (req, res) => {
    const userId = req.session.userid;
    const newMobile = req.body.newMobile;
    const newName = req.body.newName;

    try {
        let update = await user.updateOne({ _id: userId }, { $set: { phoneNo: newMobile, name: newName } }, { new: true });

        res.status(200).send("Mobile number updated successfully");
    } catch (err) {
        console.error("Error updating mobile number:", err);
        res.status(500).send("Error updating mobile number");
    }
};

const passwordChange = async (req, res) => {
    const userId = req.session.userid; // Assuming the user ID is stored in the session
    const passChange = req.body.passChange;

    if (!userId) {
        console.error("User ID not found in the session.");
        return res.status(500).send("User ID not found in the session.");
    }

    console.log("New Password:", passChange);

    try {
        const hashedPassword = await crypting(passChange);

        let update = await user.updateOne({ _id: userId }, { $set: { password: hashedPassword } });

        console.log("Update Result:", update);

        if (update.ok) {
            console.log("Password updated successfully");
            return res.status(200).send("Password updated successfully");
        } else {
            console.error("Failed to update password");
            return res.status(500).send("Failed to update password");
        }
    } catch (err) {
        console.error("Error updating password:", err);
        return res.status(500).send("Error updating password");
    }
};

const updateAddress = async (req, res) => {
    try {
        const userId = req.session.userid; // Assuming you're using sessions
        const addressId = req.params.id;
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

        const updatedUser = await user.findOneAndUpdate(
            { _id: userId, "addresses._id": addressId },
            {
                $set: {
                    "addresses.$.firstName": addressData.firstName,
                    "addresses.$.lastName": addressData.lastName,
                    "addresses.$.companyName": addressData.companyName,
                    "addresses.$.country": addressData.country,
                    "addresses.$.streetAddress1": addressData.streetAddress1,
                    "addresses.$.streetAddress2": addressData.streetAddress2,
                    "addresses.$.townCity": addressData.townCity,
                    "addresses.$.stateCounty": addressData.stateCounty,
                    "addresses.$.postcodeZIP": addressData.postcodeZIP,
                    "addresses.$.phone": addressData.phone,
                },
            },
            { new: true }
        );

        if (updatedUser) {
            res.redirect("/profile?tab=address");
            // res.json({});
        } else {
            res.status(404).json({ message: "Address not found or not updated" });
        }
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const orderDetails = async (req, res) => {
    try {
        // Assuming you want to find orders based on the orderId
        const orderId = req.params.orderId;
        // Find orders from the database using the orderId
        const orders = await orderdb.find({ _id: orderId });

        // Extracting the last 10 digits from the ObjectId
        const last10Digits = orderId.slice(-8);

        res.render("orderDetails", {
            orders,
            orderId: "Order No : # " + last10Digits, // Include the last 10 digits in the orderId
            cartCount: req.cartCount,
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Internal Server Error");
    }
};

const downloadInvoice = async (req, res) => {
    try {
        // Assuming you want to find orders based on the orderId
        const orderId = req.params.orderId;
        // Find orders from the database using the orderId
        const orders = await orderdb.find({ _id: orderId });

        // Assuming there is only one product in the Products array
        const productId = req.query.productID;
        // console.log("orders:", orders);
        // Corrected the property name to "products" for comparison
        const product = orders[0].Products.find((item) => item._id.$oid === productId);

        console.log("orderId ::", orderId);
        console.log("productId ::", productId);
        console.log("product :", product);

        res.render("invoice", { orders, product });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Internal Server Error");
    }
};

const createinvoice = async (req, res) => {
    try {
        // Assuming you want to find orders based on the orderId
        const orderId = req.params.orderId;
        // Find orders from the database using the orderId
        const orders = await orderdb.find({ _id: orderId });

        // Assuming there is only one product in the Products array
        const productId = req.query.productID;
        // console.log("orders:", orders);
        // Corrected the property name to "products" for comparison
        const product = orders[0].Products.find((item) => item._id.$oid === productId);

        console.log("orderId ::", orderId);
        console.log("productId ::", productId);
        console.log("product :", product);

        res.render("invoiceDownload", { orders, product });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    home,
    signup,
    otp,
    otpvalidation,
    sendotp,
    logincheck,
    login,
    product,
    fullpdt,
    //=========profile =========
    profile,
    deleteAddress,
    editAddress,
    orderStatusUpdation,
    updateMobile, // changing the name also
    passwordChange,
    updateAddress,
    forgotPassword,
    forgotPasswordReset,
    resetPassword,
    resetPasswordPost,
    orderDetails,
    downloadInvoice,
    signOutUser,
    createinvoice,
};

// downloadInvoice

// <% if (orders.coupon) { %>
//     <tr>
//       <td colspan="4">Coupon Discount (Code: <%= order.coupon.code %>)</td>
//       <td class="total">-₹<%= orders.coupon.originalAmount %></td>
//     </tr>
//     <tr>
//       <td colspan="4" class="grand total">FINAL TOTAL</td>
//       <td class="grand total">₹<%= order.subtotal + (order.subtotal * 0.25) - order.coupon.originalAmount %></td>
//     </tr>
//   <% } %>
