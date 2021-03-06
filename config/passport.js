// config/passport.js
/*
	Copyright 2017, Allison Kuo, Daniel Kho, Jeremy Rotman
	
	This file is part of ArientoSend.

    ArientoSend is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    ArientoSend is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with ArientoSend.  If not, see <http://www.gnu.org/licenses/>.
*/


var LocalStrategy   = require('passport-local').Strategy;
var TotpStrategy = require('passport-totp').Strategy;

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
					return done(null, req.user, req.flash('lpMessage', 'Success! User added!'));
				});
			});
		})
	);
	
	passport.use('change-password', new LocalStrategy({
		usernameField : 'new_password', //dumb workaround
		passwordField: 'old_password',
		passReqToCallback : true
		},
		function(req, username, password, done){
			console.log('hi');
			User.find('login', 'username', req.user.username, function(err, rows){ //make sure password matches old password
				console.log('1');
				if(err){
					return done(err);
				}
				console.log('2');
				if(!rows.length){
					console.log('I cannot be here');
					err = new Error('The user that is logged in does not exist.');
					err.code = 'NONEXISTANT_USER';
					err.fatal = false;
					return done(err);
				}
				console.log('3');
				if(!User.checkLogin(password)){
					return done(null, false, req.flash('changepwdMessage', 'Incorrect old password.'));
				}
				console.log(req.body.new_password + ' ' + req.body.new_password2);
				if(req.body.new_password != req.body.new_password2){
					return done(null, false, req.flash('changepwdMessage', 'New passwords do not match.'));
				}
				console.log('5');
				User.updatePassword(req.user.username, User.hashPassword(req.body.new_password), function(err){
					if(err){
						return done(err);
					}
					
					return done(null, req.user, req.flash('lpMessage', 'Success! Password changed!'));
				});
				console.log('6?');
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
	
	passport.registerTotp = function(username, state, secret){
		User.set2fa(username, state, secret);
	};
	
	
};



