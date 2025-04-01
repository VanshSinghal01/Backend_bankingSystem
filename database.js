const mongoose = require("mongoose");

async function connect(){
    await mongoose.connect("mongodb+srv://garvitchaudhary534:garvit%40123@garvit.zvql1.mongodb.net/Banking_Application")
}

module.exports = connect;