// config/database.js
var olddbconfig = {
    'connection': {
        'host': 'arientosenddb.cnrikh4cspia.us-west-2.rds.amazonaws.com',
        'user': 'ariento',
        'password': 'arientosend'
    },
	'database': 'ArientoSend_Database',
    'users_table': 'login',
};

//Remember, different db has different schema:
//old db has: login_name, login_id, login_password

//new db has: username, password, email, uid, (and soon 2fa-secret)
var dbconfig = {
    'connection': {
        'host': 'cs130db.cijzwabqavtc.us-west-1.rds.amazonaws.com',
        'user': 'kho',
        'password': '204315203'
    },
	'database': 'CS130_DB',
    'users_table': 'login',
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
