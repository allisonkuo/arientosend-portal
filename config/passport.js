// expose this function to our app using module.exports
var LocalStrategy   = require('passport-local').Strategy;
var TotpStrategy = require('passport-totp').Strategy;

// import database connection
var users = require('../app/models/user');
var User = users();

var base32 = require('thirty-two');

module.exports = function(passport) {

	// =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
		done(null, user.uid);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
		User.find('login', 'uid', id, function(err, results){
			done(err, results[0]);
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
            User.find('login', 'username', email, function(err, rows){
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
                //if (password != rows[0].login_password) {
                if (!User.checkLogin(password)) {
                    return done(null, false, req.flash('loginMessage', 'Oops! Incorrect username/password. ')); // create the loginMessage and save it to session as flashdata
                }

                // all is well, return successful user
                return done(null, rows[0]);
            });
        })
    );
	
	//Signup
	
	passport.use('local-signup', new LocalStrategy({ 
			usernameField : 'username',
			passwordField : 'password',
			passReqToCallback : true
		},
		function(req, username, password, done){
			User.find('login', 'username', username, function(err, rows){ //Want to verify user is not already in db.
				if(err){
					return done(err);
				}
				
				if(rows.length > 0){
					return done(null, false, req.flash('addAdminMessage', 'Oops! Username already in use!'));
				}
				
				if(password != req.body.password2){
					return done(null, false, req.flash('addAdminMessage', 'Passwords do not match.'));
				}
				
				User.register(username, req.body.email, User.hashPassword(password), function(err){
					if(err){
						throw err;
					}
					return done(null, true, req.flash('lpMessage', 'Success! User added!'));
				});
			});
		})
	);
	
	passport.use('totp', new TotpStrategy({
			codeField : 'code'
		},
		function(user, done){
			done(null, base32.decode(user.totpsecret), 30);
		})
	);
	
	passport.use('totp-login', new TotpStrategy({
			codeField : 'code'
		},
		function(user, done){
			done(null, base32.decode(user.totpsecret), 30);
		})
	);
	console.log('fallthrough?');
	passport.registerTotp = function(username, state, secret){
		User.set2fa(username, state, secret);
	};
	
	
};



