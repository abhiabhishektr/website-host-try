// authController.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../model/usermodel");

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.clientID,
            clientSecret: process.env.clientSecret,
            callbackURL: "https://4196-103-170-228-58.ngrok-free.app/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Extract necessary information from the Google API response
                const { id: googleId, email, displayName: name } = profile;

                // Check if the user already exists in your database based on googleId
                let user = await User.findOne({ email: profile._json.email });
                if (!user) {
                    // If the user doesn't exist, create a new user with the extracted information
                    user = await User.create({
                        googleId,
                        email: profile._json.email,
                        name,
                        otp: profile._json.email_verified,
                        googleImage: profile._json.picture,
                    });
                }

                // Return the user to be serialized and stored in the session
                return done(null, user);
            } catch (error) {
                console.error("Error during Google authentication:", error);
                return done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = {
    googleAuth: passport.authenticate("google", { scope: ["profile", "email"] }),

    googleCallback: passport.authenticate("google", {
        failureRedirect: "/login",
        // Do not provide successRedirect here
    }),

    // Handle the session setup after successful authentication
    setupSession: (req, res, next) => {
        // Check if the user is authenticated
        if (req.isAuthenticated()) {
            req.session.user = req.user.email;
            req.session.userid = req.user._id;
        }
        // Redirect to the appropriate route after session setup
        res.redirect("/");
    },
};
