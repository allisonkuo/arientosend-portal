var mysql = require('mysql');

var connection = mysql.createConnection({
	host     : "arientosenddb.cnrikh4cspia.us-west-2.rds.amazonaws.com",
	user     : "ariento",
	password : "arientosend",
	port     : 3306,
	database : 'ArientoSend_Database'
});

connection.connect(function(err) {
	if (err) {
		console.error('Database connection failed: ' + err.stack);
    	return;
  	}

  	console.log('Connected to database.');
});

connection.end();