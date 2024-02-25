const express=require('express')
const router= express()
const userController =require("../controller/userController")
const cartController =require("../controller/cartController")
const checkOutPage=require("../controller/checkOutPage")
const userMid=require("../middleware/usermid")
const session = require('express-session');
const cartCountMiddleware = require('../middleware/cartCountMiddleware');
const authController=require('../controller/authController');

router.set("view engine","ejs")
router.set('views','views/user')


router.use(session({
    secret: 'your-secret-key',//env
    resave: false,
    saveUninitialized: true
  }));

  router.get('/auth/google', authController.googleAuth);

  router.get("/auth/google/callback", authController.googleCallback, authController.setupSession);
  
router.get('/',cartCountMiddleware,userController.home)


router.get('/login',userMid.islogin,userController.login)

router.get('/signOutUser',userController.signOutUser)


router.get('/forgotPassword',userController.forgotPassword)
router.post('/forgotPassword',userController.forgotPasswordReset)
router.get('/resetPassword',userController.resetPassword)
router.post('/resetPassword',userController.resetPasswordPost)

router.post('/signup',userController.signup)


router.get('/otp',userController.otp)


router.post('/otpvalidation',userController.otpvalidation)


router.post('/sendotp',userController.sendotp)




// ===============================product=====================
router.get('/fullpdt/:MainCat', cartCountMiddleware,userController.fullpdt)
// router.get('/cateFilter', cartCountMiddleware,userController.cateFilter)

router.post('/loginSubmit',userController.logincheck)

// =====================product=============
router.get('/product/:id', cartCountMiddleware,userController.product)

//=====================================================
// ======================  CART   ==================
//===================================================
router.get('/cart',userMid.islogin, cartCountMiddleware,cartController.cart) // cart page showing 
router.put('/cart/:productId',cartController.cartItemRemove) // cart page showing 

router.put('/updatecart/:id',cartController.updatecart)  // add to cart
router.post('/updatequantity',cartController.updateCartDetails) //quantity management in the cart page
router.get('/paymentmethod',userMid.islogin, cartCountMiddleware,cartController.paymentmethod) //payment method and address selecting page 
router.post('/addAddress/:id',cartController.addAddress) //adding address in the paymet page
router.post('/addReview',cartController.addReview)

//=====================================================
// ======================  Wishlist   ==================
//===================================================
router.get('/wishlist',userMid.islogin, cartCountMiddleware,cartController.wishlist) // cart page showing 
router.put('/wishlistManagement',cartController.wishlistManagement)


//=====================================================
// ======================  CHECK OUT  ==================
//===================================================
router.post('/checkOut/:paymentOption',checkOutPage.checkOut) 
router.post('/success',checkOutPage.success)
router.post('/failure',checkOutPage.failure)
//=====================================================
// ======================  PROFILE   ==================
//===================================================
router.get('/profile',userMid.islogin, cartCountMiddleware,userController.profile)
router.get('/editAddress',userController.editAddress)
router.post('/deleteAddress/:id',userController.deleteAddress)



router.put('/orderStatusUpdation/:id',userController.orderStatusUpdation)

router.patch('/updateMobile',userController.updateMobile)
router.patch('/passwordChange',userController.passwordChange)
router.post('/updateAddress/:id',userController.updateAddress)

router.get('/orderDetails/:orderId',userMid.islogin, cartCountMiddleware,userController.orderDetails)
router.get('/downloadInvoice/:orderId',userMid.islogin,userController.downloadInvoice)
router.get('/downloadInvoicePdf/:orderId',userController.createinvoice)
















// router.get('/trial', (req, res) => {
//   res.render("invoice");
// });

// router.get('/error', (req, res) => {
//   res.render("404");
// });
// router.get('*', (req, res) => {
//   res.redirect('/error');
// });


module.exports=router