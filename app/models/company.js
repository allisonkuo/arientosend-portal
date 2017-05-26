// load the things we need
var mysql 	= require('mysql');
var bcrypt 	= require('bcrypt-nodejs');

var companySchema = mysql.Schema({

    local            : {
        name        : String,
        domain	    : String,
		co_email	: String,
		co_password	: String
    }

});

// methods ======================
// generating a hash
companySchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
companySchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mysql.model('Company', companySchema);