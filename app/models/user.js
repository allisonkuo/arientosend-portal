// load up the user model
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var db = require('../../config/database');

// connect to mySQL 
var connection = db();

module.exports = function(){
	var User = {};
	
	User.find = function(table, row, value, callback){
		var sql = 'SELECT * FROM ' + connection.escapeId(table) + ' WHERE ' + connection.escapeId(row) + ' = ' + connection.escape(value);
		console.log(sql);
		connection.query(sql, function(err, results){
			if(!err && results.length){
				User.name = results[0].username;
				User.pass = results[0].password;
				User.email = results[0].email;
				User.uid = results[0].uid;
			}
			return callback(err, results);
		});
	};
	
	User.hashPassword = function(password){
		return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
	};
	
	User.checkLogin = function(password){
		console.log('1.');
		console.log(bcrypt.hashSync(password, bcrypt.genSaltSync(8), null));
		console.log(this.pass);
		return bcrypt.compareSync(password, this.pass);
	};
	
	User.register = function(username, email, password, callback){ //By the point this is called, the input password should have been hashed.
		var sql = 'INSERT INTO login (username, password, email) VALUES (' + connection.escape(username) + ', ' + connection.escape(password) + ', ' + connection.escape(email) + ')';
		console.log(sql);
		connection.query(sql, function(err, results){ //Just need to check if an error is thrown. Otherwise, we can assume the info was entered.
			callback(err);
		});
	};
	
	return User;
};