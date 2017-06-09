// app/routes.js
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

//TODO: See if I can move this out into another module...
var db 	= require('../config/database');
var connection = db();

var sprintf = require('sprintf');
var base32 = require('thirty-two');
var crypto = require('crypto');

var validator = require('validator');

module.exports = function(app, passport) {

    // =====================================
    // LOGIN ===============================
    // =====================================
    app.get('/', function(req, res) {
        res.render('login.ejs', { message: req.flash('loginMessage') }); 
    });

    // process the login form
    app.post('/', passport.authenticate('local-login', {
            failureRedirect : '/', 
            failureFlash : true 
        }),
        function(req, res) { //Fallthrough function if authenticate is successful.
			if(req.user.has2fa){ //Redirect to Two Factor Authentication (2fa) if in use
				res.redirect('/2falogin');
			} else {
				req.session.method = 'plain'; //Set authentication method for middleware
				res.redirect('/landingpage');
			}
        }

    );
	
	//Process 2fa login 
	app.get('/2falogin', isLoggedIn, function(req,res) {
		if(req.user.has2fa){
			res.render('2falogin.ejs', {message: req.flash('2famessage')});
		}else{
			res.redirect('/landingpage');
		}
	});
	
	app.post('/2falogin', passport.authenticate('totp-login', {
			failureRedirect : '/',
			failureFlash : true
		}),
		function(req,res){
			req.session.method = 'totp'; 
			res.redirect('/landingpage');
		}
	);
	
	// =====================================
	// NEW ADMIN ===========================
	// =====================================
	// Author: Daniel Kho
	
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
			
			passport.registerTotp(req.user.username, 0, secret); //Currently store secret in database for easy verification. This does not enable 2fa.
			
			 url = "https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=" + qrData; //Uses Google Chart API to generate a QR Code
			 req.session.url = url;
		}
		res.render('set2fa.ejs',{
			message: req.flash('set2faMessage'),
			user: req.user,
			has2fa: req.user.has2fa,
			qrUrl : url,
			query : req.query
		});
	});
	
	app.post('/set2fa', passport.authenticate('totp', {
			failureRedirect : '/set2fa?error=1',
			failureFlash : true
		}),
		function(req,res){
			//TODO: Figure out why this logs out.  Alternately, change it to be a feature.
			var state = req.user.has2fa ? 0 : 1;
			if(req.user.has2fa){
				req.session.method = 'plain';
			} else {
				req.session.method = 'totp';
			}
			passport.registerTotp(req.user.username, state, req.user.totpsecret);
			//req.flash('lpMessage', 'Successfully set 2FA!');
			res.redirect('/landingpage'); //TODO: Never gets here.  it just goes back to login. I think it thinks its failing 2fa login.
		}
	);

    // =====================================
    // MAIN PORTAL =========================
    // =====================================
	
    app.get('/landingpage', isLoggedIn, ensureTotp, function(req, res) {
        res.render('landingpage.ejs', {
            user : req.user, 
			message : req.flash('lpMessage')
        });
    });

    // =====================================
    // CREATE COMPANY ======================
    // =====================================
	
    app.get('/create', isLoggedIn, ensureTotp, function(req, res) {
        res.render('create.ejs', {
            user : req.user, 
			message : req.flash('createMessage')
        });
    });
	
	// process the company creation
    app.post('/create', function(req, res) {
		console.log(req.body);

		var domain_pattern = new RegExp('(([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}', 'i');
		
		if (domain_pattern.test(req.body.domain)) {
			console.log("valid domain");
			console.log(req.body.domain);
		}
		
        // make sure not duplicate
		// check duplicate company names
		connection.query("SELECT * FROM company WHERE company_name = ?", [req.body.name], function(err, result) {
			if (err) {
				console.log("database error");
				req.flash('createMessage', 'Oops! An error has occurred. Please try again.');
				res.redirect('/create');
			}
			else if (result[0]) {
				console.log("company name already exists");
				req.flash('createMessage', 'Company name already exists.');
				res.redirect('/create');
			}
			else {
				// check duplicate company domains
				connection.query("SELECT * FROM company WHERE company_domain = ?", [req.body.domain], function(err, result) {
					if (err) {
						console.log("database error");
						req.flash('createMessage', 'Oops! An error has occurred. Please try again.');
						res.redirect('/create');
					}
					else if (!domain_pattern.test(req.body.domain)) {
						console.log("invaild domain");
						req.flash('createMessage', 'Please submit a valid domain.');
						res.redirect('/create');
					}
					else if (result[0]) {
						console.log("company domain already exists");
						req.flash('createMessage', 'Company domain already exists.');
						res.redirect('/create');
					}
					else {
						// check duplicate company emails
						connection.query("SELECT * FROM company WHERE company_email = ?", [req.body.co_email], function(err, result) {
							if (err) {
								console.log("database error");
								req.flash('createMessage', 'Oops! An error has occurred. Please try again.');
								res.redirect('/create');
							}
							// ensure email is in email form
							else if (!validator.isEmail(req.body.co_email)) { 
								console.log("invalid email");
								req.flash('createMessage', 'Please submit a valid email.');
								res.redirect('/create');
							}
							else if (result[0]) {
								console.log("company email already exists");
								req.flash('createMessage', 'Company email already exists.');
								res.redirect('/create');
							}
							else {
								// if new company, add the new company's information
								var sql = "INSERT INTO company (company_name, company_domain, company_email, company_password) VALUES ?";
								var newCompany = [[req.body.name, req.body.domain, req.body.co_email, req.body.co_password]];
							
								connection.query(sql, [newCompany], function(err, result) {
									if (err) {
										console.log("database error");
										req.flash('createMessage', 'Oops! An error has occurred. Please try again.');
										res.redirect('/create');
									}
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
			}
		})
    });

    // =====================================
    // EDIT COMPANY =======================
    // =====================================
	
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
                user : req.user, 
                companies: companies, // pass company names to template
				message : req.flash('editMessage')
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
                co_email: info[0].company_email,
				co_password: info[0].company_password,
				message : req.flash('editInputMessage')
            });
        });
    });

    // update company information in database
    app.post('/edit/:companyName', isLoggedIn, function(req, res) {
		var query = "SELECT * FROM company WHERE company_name = ?";
		var name = req.params.companyName;
		var info;
		
		var domain_pattern = new RegExp('(([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}', 'i');

        connection.query(query, [name], function(err, rows, fields) {
            if (err) {
				console.log("database error");
				req.flash('editMessage', 'Oops! An error has occurred. Please try again.');
				res.redirect('/edit');
			}
            info = rows;
            console.log(info);
		});

		// make sure not duplicate
		// check duplicate company names
		connection.query("SELECT * FROM company WHERE company_name = ?", [req.body.name], function(err, result) {
			if (err) {
				console.log("database error");
				req.flash('editMessage', 'Oops! An error has occurred. Please try again.');
				res.redirect('/edit');
			}
			else if (result[0] && result[0].company_name != name) {
				console.log("company name already exists");
				req.flash('editMessage', 'Company name already exists.');
				res.redirect('/edit');
			}
			else {
				// check duplicate company domains
				connection.query("SELECT * FROM company WHERE company_domain = ?", [req.body.domain], function(err, result) {
					if (err) {
						console.log("database error");
						req.flash('editMessage', 'Oops! An error has occurred. Please try again.');
						res.redirect('/edit');
					}
					else if (!domain_pattern.test(req.body.domain)) {
						console.log("invaild domain");
						req.flash('editMessage', 'Please submit a valid domain.');
						res.redirect('/edit');
					}
					else if (result[0] && result[0].company_name != name) {
						console.log("company domain already exists");
						req.flash('editMessage', 'Company domain already exists.');
						res.redirect('/edit');
					}
					else {
						// check duplicate company emails
						connection.query("SELECT * FROM company WHERE company_email = ?", [req.body.co_email], function(err, result) {
							if (err) {
								console.log("database error");
								req.flash('editMessage', 'Oops! An error has occurred. Please try again.');
								res.redirect('/edit');
							}
							//ensure email is in email form
							else if (!validator.isEmail(req.body.co_email)) { 
								console.log("invalid email");
								req.flash('editMessage', 'Please submit a valid email.');
								res.redirect('/edit');
							}
							else if (result[0] && result[0].company_name != name) {
								console.log("company email already exists");
								req.flash('editMessage', 'Company email already exists.');
								res.redirect('/edit');
							}
                            // don't update password if not included
                            else if (req.body.co_password == "") {
                                console.log("NO PASSWORD PROVIDED");
                                var updateQuery = "UPDATE company SET company_name = ?, company_domain = ?, company_email = ? WHERE company_name = ?";
                                var newInfo = [req.body.name, req.body.domain, req.body.co_email, name];

                                connection.query(updateQuery, newInfo, function(err, result) {
                                    if (err) {
                                        console.log("database error");
                                        req.flash('editMessage', 'Oops! An error has occurred. Please try again.');
                                        res.redirect('/edit');
                                    }
                                    console.log(result.message);
                                    req.flash('editInputMessage', 'Company edited successfully');
                                    res.render('editInput.ejs', {
                                        user : req.user,
                                        name: req.body.name,
                                        domain: req.body.domain,
                                        co_email: req.body.co_email,
                                        co_password: req.body.co_password,
                                        message : req.flash('editInputMessage')
                                    });
                                })

                            }
							else {
								// if no duplicate information, update the company
								var updateQuery = "UPDATE company SET company_name = ?, company_domain = ?, company_email = ?, company_password = ? WHERE company_name = ?";
								var newInfo = [req.body.name, req.body.domain, req.body.co_email, req.body.co_password, name];
								
								connection.query(updateQuery, newInfo, function(err, result) {
									if (err) {
										console.log("database error");
										req.flash('editMessage', 'Oops! An error has occurred. Please try again.');
										res.redirect('/edit');
									}
									console.log(result.message);
									req.flash('editInputMessage', 'Company edited successfully');
									res.render('editInput.ejs', {
										user : req.user,
										name: req.body.name,
										domain: req.body.domain,
										co_email: req.body.co_email,
										co_password: req.body.co_password,
										message : req.flash('editInputMessage')
									});
								})
							}
						})
					}
				})
			}
		})  
    });


    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        console.log(res.user);
        req.session.destroy(function (err) {
            res.clearCookie('connect.sid');
            res.redirect('/'); 
        });
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    if (req.isAuthenticated()){
		console.log('passed auth');
		return next();
	}
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
