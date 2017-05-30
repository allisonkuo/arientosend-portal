// config/database.js
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