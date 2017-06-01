// app/routes.js
var sprintf = require('sprintf');
var base32 = require('thirty-two');
var crypto = require('crypto');

module.exports = function(app, passport) {

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    /*app.get('/', function(req, res) {
        res.render('index.ejs'); // load the index.ejs file
    });*/

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage') }); 
    });

    // process the login form
    app.post('/', passport.authenticate('local-login', {
            //successRedirect : '/2falogin', // TODO: redirect to the secure company section
            failureRedirect : '/', // redirect back to the login page if there is an error 
            failureFlash : true // allow flash messages
        }),
        function(req, res) {
			/*console.log('Auth!');
            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }

            res.redirect('/');*/
			if(req.user.has2fa){
				req.session.method = 'totp'; //TODO: this should really get moved to after 2fa is authenticated.
				res.redirect('/2falogin');
			} else {
				req.session.method = 'plain';
				res.redirect('/landingpage');
			}
        }

    );
	
	//2fa login
	app.get('/2falogin', isLoggedIn, function(req,res) {
		if(req.user.has2fa){
			res.render('2falogin.ejs', {message: req.flash('2famessage')});
		}else{
			res.redirect('/landingpage');
		}
	});
	
	app.post('/2falogin', passport.authenticate('totp-login', {
			//successRedirect : '/landingpage',
			failureRedirect : '/',
			failureFlash : true
		}),
		function(req,res){
			console.log('hi?');
			res.redirect('/landingpage');
		}
	);
	
	// =====================================
	// NEW ADMIN ===========================
	// =====================================
	// Author: Daniel Kho
	// show admin registration form
	app.get('/newadmin', isLoggedIn, ensureTotp, function(req, res) {
        res.render('newadmin.ejs', {
			message: req.flash('addAdminMessage'),
			user : req.user
		}); 
    });
	
	app.post('/newadmin', passport.authenticate('local-signup', {
			successRedirect : '/landingpage',
			failureRedirect : '/newadmin',
			failureFlash : true
	}));
	
	// =====================================
	// 2FA REGISTRATION ====================
	// =====================================
	// Author: Daniel Kho
	
	app.get('/set2fa', isLoggedIn, ensureTotp, function(req, res){
		var url;
		if(!req.user.has2fa){
			var secret = base32.encode(crypto.randomBytes(16));
			secret = secret.toString().replace(/=/g, ''); //formatting for gAuth
			var qrData = sprintf('otpauth://totp/%s?secret=%s', req.user.username, secret);
			//req.user.secret = secret; //TODO: how to store this?
			
			passport.registerTotp(req.user.username, 0, secret);
			
			//TODO: generate qr code
			 url = "https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=" + qrData;
		}
		res.render('set2fa.ejs',{
			message: req.flash('set2faMessage'),
			user: req.user,
			has2fa: req.user.has2fa,
			//TODO: pass in QR code
			qrUrl : url,
			query : req.query
		});
	});
	
	app.post('/set2fa', passport.authenticate('totp', {
			successRedirect : '/mod2fa',
			failureRedirect : '/set2fa?error',
			failureFlash : true
	}));
	
	app.get('/mod2fa', isLoggedIn, ensureTotp, function(req, res){
		var state = req.user.has2fa ? 0 : 1;
		passport.registerTotp(req.user.username, state, req.user.totpsecret);
		res.redirect('/landingpage');
	});
	
    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { 
			message: req.flash('signupMessage') 
		});
    });

    // process the signup form
    // app.post('/signup', do all our passport stuff here);

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/landingpage', isLoggedIn, ensureTotp, function(req, res) {
        res.render('landingpage.ejs', {
			message : req.flash('landingMessage'),
            user : req.user // get the user out of session and pass to template
        });
    });

    // =====================================
    // CREATE COMPANY ======================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/create', isLoggedIn, ensureTotp, function(req, res) {
        res.render('create.ejs', {
            user : req.user // get the user out of session and pass to template
        });
    });

    // =====================================
    // CREATE COMPANY ======================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/edit', isLoggedIn, ensureTotp, function(req, res) {
        res.render('edit.ejs', {
            user : req.user // get the user out of session and pass to template
        });
    });


    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        console.log(res.user);
        req.session.destroy(function (err) {
            res.clearCookie('connect.sid');
            res.redirect('/'); //Inside a callback… bulletproof!
        });
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated()){
		console.log('passed auth');
		return next();
	}
    // if they aren't redirect them to the home page
	console.log('failed auth');
    res.redirect('/');
}

function ensureTotp(req, res, next) {
	console.log('ENSURETOTP------------');
	console.log(req.session.method);
	console.log(req.user.has2fa);
	if((req.user.has2fa && req.session.method == 'totp') || (!req.user.has2fa && req.session.method == 'plain')){
		console.log('passed totp');
		return next();
	}
	console.log('failed totp');
	res.redirect('/');
}
