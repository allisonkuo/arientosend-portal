// config/database.js
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

// DB Schema:
// login: uid, username, password, email, has2fa, totpsecret
// company: company_name, company_domain, company_email, company_password, company_id

var dbconfig = {
    'connection': {
        'host': 'arientosenddb.cnrikh4cspia.us-west-2.rds.amazonaws.com',
        'user': 'ariento',
        'password': 'arientosend'
    },
	'database': 'ArientoSend_Database',
    'users_table': 'login', 
	'companies_table': 'company'
};

var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');

// connect to and export mySQL 
module.exports = function () { 
	var connection = mysql.createConnection(dbconfig.connection);
	connection.connect(function(err) {
	  if (err) {
	    console.error('Database connection failed: ' + err.stack);
	    return;
	  }

	  console.log('Connected to database.');
	});
	connection.query('USE ' + dbconfig.database);
	return connection;
};