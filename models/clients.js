const mongoose  =  require('mongoose')

const schema = new mongoose.Schema({
    username: String,
    email: String,
    phone: String,
    password: String
})

module.exports = mongoose.model('clients', schema)