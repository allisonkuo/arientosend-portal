ARIENTOSEND ADMIN PORTAL README

SETUP
	A MySQL database needs to be created with two tables. The information for the database is currently stored in /config/database.js.
	If the database is set up on AWS, it needs to be of a size that supports encryption at rest, as specified in at
	http://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
	
	Admin information table:
		The first table stores the information about an admin portal user.
		Table name: login
		Schema: (column name, type, [options])
			uid, int, primary_key, non_null, unique, auto_increment
			username, varchar, primary_key, non_null, unique
			password, varchar, non_null
			email, varchar, non_null
			has2fa, tinyint, non_null
			totpsecret, varchar
	Company information table:
		The second table stores the company information.
		Table name: company
		Schema:
			company_name, varchar, non_null, unique
			company_domain, varchar, non_null, unique
			company_email, varchar, non_null, unique
			company_password, varchar, non_null
			company_id, int, primary_key, non_null, unique, auto_increment
			
	To deploy the website, run the command
		node server.js
	in the root directory of the project.

TODO/NEXT STEPS
	- Add a box showing the embed tag to embed the user side portal for each company
		- Add to edit company page
		- Embedded URL should be the URL used by the other team
	- Email field is gathered for the admin accounts, but is currently unused
		- Potentially add a password recovery interface to the login page
		- Email admins upon account creation
	