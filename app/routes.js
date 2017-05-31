// app/routes.js
var db 	= require('../config/database');
var connection = db();

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
            successRedirect : '/landingpage', // redirect to the secure company section
            failureRedirect : '/', // redirect back to the login page if there is an error
            failureFlash : true // allow flash messages
        }),
        function(req, res) {
            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }

            res.redirect('/');
        }

    );

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
    app.get('/landingpage', isLoggedIn, function(req, res) {
        res.render('landingpage.ejs', {
            user : req.user.login_name // get the user out of session and pass to template
        });
    });

    // =====================================
    // CREATE COMPANY ======================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/create', isLoggedIn, function(req, res) {
        res.render('create.ejs', {
            user : req.user.login_name // get the user out of session and pass to template
        });
    });
	
	// process the company creation
    app.post('/create', function(req, res) {
		console.log(req.body);
		var sql = "INSERT INTO company (company_name, company_domain, company_email, company_password) VALUES ?";
		
		var newCompany = [[req.body.name, req.body.domain, req.body.co_email, req.body.co_password]];
		
		connection.query(sql, [newCompany], function(err, result) {
			if (err) throw err;
			console.log("Number of records inserted: " + result.affectedRows);
		});	

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
                user : req.user.login_name, // get the user out of session and pass to template
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
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}


