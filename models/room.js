const mongoose = require('mongoose');
const nanoid = require('nanoid').customAlphabet('01234567891011121314151617181920', 10);

const roomSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => nanoid()
    },
    name : {
        type : String
    },
    startTime : {
        type : String
    },
    maxUsers : {
        type :  Number
    }
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;