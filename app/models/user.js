// app/models/user.js
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
	
	User.set2fa = function(username, state, secret){
		var sql = 'SELECT * FROM login WHERE username = ' + connection.escape(username);
		connection.query(sql, function(err, results){
			if(!err && results.length){
				var has2fa = state ? '1' : '0';
				sql = 'UPDATE login SET has2fa = ' + has2fa + ', totpsecret = ' + connection.escape(secret) + ' WHERE username = ' + connection.escape(username);
				connection.query(sql, function(err,results){
					if(err){
						return err;
					} else{
						return null;
					}
				});
				
			} else {
				return err;
			}
		});
	};
	
	return User;
};