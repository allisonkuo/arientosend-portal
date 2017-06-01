// app/routes.js

//var flash = require('connect-flash');
//TODO: See if I can move this out into another module...
var db 	= require('../config/database');
var connection = db();

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
		console.log(req.query.error);
		if(req.query.error == '1'){
			console.log('inerr');
			url = req.session.url;
		}
		else if(!req.user.has2fa){
			var secret = base32.encode(crypto.randomBytes(16));
			secret = secret.toString().replace(/=/g, ''); //formatting for gAuth
			var qrData = sprintf('otpauth://totp/%s?secret=%s', req.user.username, secret);
			//req.user.secret = secret; //TODO: how to store this?
			
			passport.registerTotp(req.user.username, 0, secret);
			
			//TODO: generate qr code
			 url = "https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=" + qrData;
			 req.session.url = url;
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
			failureRedirect : '/set2fa?error=1',
			failureFlash : true
	}));
	
	app.get('/mod2fa', isLoggedIn, ensureTotp, function(req, res){ //TODO: Work this into app.post(/set2fa) (see app.post('/') for inspiration)
		var state = req.user.has2fa ? 0 : 1;
		passport.registerTotp(req.user.username, state, req.user.totpsecret);
		res.redirect('/landingpage');
	});
	
    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    /*app.get('/signup', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });*/


    // process the signup form
    // app.post('/signup', do all our passport stuff here);

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/landingpage', isLoggedIn, ensureTotp, function(req, res) {
        res.render('landingpage.ejs', {
            user : req.user, // get the user out of session and pass to template
			messages : req.flash('lpMessage')

        });
    });

    // =====================================
    // CREATE COMPANY ======================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/create', isLoggedIn, ensureTotp, function(req, res) {
        res.render('create.ejs', {
            user : req.user, // get the user out of session and pass to template
			message : req.flash('createMessage')
        });
    });
	
	// process the company creation
    app.post('/create', function(req, res) {
		console.log(req.body);

        // make sure not duplicate
		connection.query("SELECT * FROM company WHERE company_domain = ?", [req.body.domain], function(err, result) {
			if (err) throw err;
			else if (result[0]) {
				console.log("company domain already exists");
				req.flash('createMessage', 'Company domain already exists.');
				res.redirect('/create');
			}
			else {
				connection.query("SELECT * FROM company WHERE company_email = ?", [req.body.co_email], function(err, result) {
					if (err) throw err;
					else if (result[0]) {
						console.log("company email already exists");
						req.flash('createMessage', 'Company email already exists.');
						res.redirect('/create');
					}
					else {
						var sql = "INSERT INTO company (company_name, company_domain, company_email, company_password) VALUES ?";
						var newCompany = [[req.body.name, req.body.domain, req.body.co_email, req.body.co_password]];
					
						connection.query(sql, [newCompany], function(err, result) {
							if (err) throw err;
							else {
								//console.log("Number of records inserted: " + result.affectedRows);
								req.flash('createMessage', 'Company created successfully');
								res.redirect('/create');
							}
						});
					}
				})
			}
		})
		
        // TODO: i think there may be a bug here if you try to insert something that already exists
        // or something like that
        // let's look into it
    });

    // =====================================
    // EDIT COMPANY ======================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/edit', isLoggedIn, function(req, res) {
        // get list of company names
        var query = "SELECT * FROM company";
        var companies = [];

        connection.query(query, function(err, rows, fields) {
            if (err) throw err;
            for (var i in rows) {
                companies.push(rows[i].company_name);
            }

            res.render('edit.ejs', {
                user : req.user, // get the user out of session and pass to template
                companies: companies // pass company names to template

            });

        });

    });

    // generate input boxes to edit company info
    app.get('/edit/:companyName', isLoggedIn, function(req, res) {
        console.log(req.params);

        // get info of chosen company
        var query = "SELECT * FROM company WHERE company_name = ?";
        var name = req.params.companyName;
        var info;

        connection.query(query, [name], function(err, rows, fields) {
            if (err) throw err;
            info = rows;
            console.log(info);

            res.render('editInput.ejs', {
				user : req.user,
                name: name,
                domain: info[0].company_domain,
                email: info[0].company_email
            });
        });
    });

    // update company information in database
    app.post('/edit/:companyName', function(req, res) { 
        var query = "UPDATE company SET company_name = ?, company_domain = ?, company_email = ? WHERE company_name = ?";
        var newInfo = [req.body.name, req.body.domain, req.body.co_email, req.params.companyName];

        connection.query(query, newInfo, function(err, result) {
            if (err) throw err;
            console.log(result.message);
        
            res.render('editInput.ejs', {
                name: req.body.name,
                domain: req.body.domain,
                email: req.body.co_email
            });
        })
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
