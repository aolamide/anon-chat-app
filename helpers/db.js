const mongoose = require('mongoose');
const config  = require('../config');

const MONGO_URI = config.MONGO_URI;

//conect db
const connect = () => {
    return mongoose.connect(MONGO_URI, {useNewUrlParser: true, useUnifiedTopology : true, useCreateIndex : true})
}

mongoose.connection.on('error', err => {
    console.log(`DB connection error: ${err.message}`)
});

module.exports = { connect };