// expose this function to our app using module.exports
var LocalStrategy   = require('passport-local').Strategy;

// import database connection
var db = require('./database');
var connection = db();

module.exports = function(passport) {

	// =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
		done(null, user.login_id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
		connection.query("SELECT * FROM login WHERE login_id = ? ",[id], function(err, rows){
            done(err, rows[0]);
        });
    });
	

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) { // callback with email and password from our form
            connection.query("SELECT * FROM login WHERE login_name= ?",[email], function(err, rows){
                // if there are any errors, return the error before anything else
                if (err) {
                    return done(err);
                }

                // if no user is found, return the message
                if (!rows.length) {
                    return done(null, false, req.flash('loginMessage', 'Oops! Incorrect username/password.')); // req.flash is the way to set flashdata using connect-flash
                }

                // if the user is found but the password is wrong
                // TODO: make this handle encryption
                if (password != rows[0].login_password) {
                    return done(null, false, req.flash('loginMessage', 'Oops! Incorrect username/password. ')); // create the loginMessage and save it to session as flashdata
                }

                // all is well, return successful user
                return done(null, rows[0]);
            });
        })
    );

};



