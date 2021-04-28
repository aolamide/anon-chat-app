const express = require('express');
const http = require('http');
const path = require('path');
const moment = require('moment');
const formatMessage = require('./utils/messages');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';

//conect db
mongoose.connect(MONGO_URI, {useNewUrlParser: true, useUnifiedTopology : true, useCreateIndex : true})
.then(() => console.log('DB connected'))
.catch(err => console.log(err));

mongoose.connection.on('error', err => {
    console.log(`DB connection error: ${err.message}`)
});

const Room = require('./models/room');

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const io = require('socket.io')(server);

const { userJoin, getCurrentUser, userLeave, getRoomUsers, isRemoved, removeUser } = require('./utils/users');

const allowEntry = () => {
    let startTime = '';
    //Run when a client connects 
    if(io.sockets._events === undefined) {
        io.on('connection', socket => {
            socket.on('joinRoom', ({ username, room, roomName }) => {
                const user = userJoin(socket.id, username, room);
                socket.join(user.room);
        
                //Welcome current user
                socket.emit('welcomeMessage', [`Welcome to Anonymous Chat on ${roomName}`,  'If you\'re on mobile, click the green menu icon at the left side of the screen to show room details', 'Refresh the page if you are not able to send or receive messages at any point.']);
        
                //Broadcast when a user connects
                socket.broadcast.to(user.room).emit('adminMessage',`${user.username} has joined the room`);
        
                //Send users and room info
                io.to(user.room).emit('roomUsers', {
                    users : getRoomUsers(user.room)
                });
            });
        
            //Listen for chatMessage
            socket.on('chatMessage', msg => {
                const user = getCurrentUser(socket.id);
                // const removed = isRemoved(socket.id);
                // if(removed) {
                //     return socket.emit('adminMessage', 'You can\'t send messages as you have been removed')
                // }
                if(user) {
                    io.to(user.room).emit('message', formatMessage( user.username , msg));
                } else {
                    socket.disconnect();
                }
            });

            //when a user is removed
            // socket.on('removal', data => {
            //     const now = moment();
            //     const removalTime = moment(new Date(startTime).toISOString());
            //     if(now.diff(removalTime) <  0){
            //         return socket.emit('rejectRemoval', 'It is not time to remove yet, be warned!');
            //     }
            //     let { userToRemove } = data;
            //     const user = getCurrentUser(socket.id);
            //     const removingUser = getCurrentUser(userToRemove);
            //     const a = isRemoved(socket.id);
            //     const b = isRemoved(userToRemove);
            //     if(userToRemove == socket.id) {
            //         return socket.emit('adminMessage', 'Why are you trying to remove yourself?');
            //     }
            //     else if(!a && !b && user && removingUser) {
            //         removeUser(userToRemove);

            //         io.to(user.room).emit('adminMessage', `${user.username} removed ${removingUser.username}`);

            //         io.to(removingUser.id).emit('removedYou', 'You have been removed');

            //         //Send users and room info
            //         io.to(user.room).emit('roomUsers', {
            //             room : user.room,
            //             users : getRoomUsers(user.room)
            //         });
            //         return;
            //     }
            //     if(a) return socket.emit('removalError', 'You have been removed already')
            //     if(b) return socket.emit('removalError', `${removingUser.username} has already been removed}`);
            // })
            //RRuns when client disconnects
            socket.on('disconnect', () => {
                const user = userLeave(socket.id);
        
                if(user) {
                    io.to(user.room).emit('adminMessage', `${user.username} has left the room`);
        
                    //Send users and room info
                    io.to(user.room).emit('roomUsers', {
                        room : user.room,
                        users : getRoomUsers(user.room)
                    });
                }
            });
        
        })
    }
}


app.get('/create', (req, res) => {
    res.sendFile(__dirname + '/public/createGame.html')
});

app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/public/chat.html')
});

app.get('/join', (req, res) => {
    res.sendFile(__dirname + '/public/join.html')
});

app.post('/game', (req, res) => {
    let { startTime, name, maxUsers } = req.body;
    if (moment(startTime).isValid() && Number(maxUsers) && name?.trim()) {
        maxUsers = Number(maxUsers);
        if(maxUsers < 2 || maxUsers > 40) return res.json('Invalid number of users.');
        const newRoom = new Room({name, startTime, maxUsers});
        newRoom.save((err, saved) => {
            if(err || !saved) return res.json('Error creating room.');
            return res.json({
                message : `Room "${name}" created successfully.`,
                start : saved.startTime,
                id : saved.id,
                name
            });
        })
    }
    else return res.json('Error, please fill all fields with correct format.');
});

//Endpoint to join game
app.post('/join', (req, res) => {
    const { code : id, username } = req.body;
    if(!id || !username) return res.json({ error : 'Username and room code are required'});
    Room.findOne({id}, (err, room) => {
        if(err || !room) return res.json({error : 'Error. Pin may be incorrect.'});
        let roomUsers = getRoomUsers(room.id);
        let nameExists = roomUsers.find(user => user.username.toLowerCase() === username.toLowerCase());
        const now = moment();
        const roomStart = moment(room.startTime);
        if(roomStart.diff(now) > 0) return res.json({ error : 'Room has not started yet.'});
        if(now.diff(roomStart, 'hours') >= 1) return res.json({error : 'Room has closed for entries.'})
        else if(roomUsers.length >= room.maxUsers) return res.json({error : 'Room is full.'});
        else if(nameExists) return res.json({error : 'Username is taken, choose another.'});
        else {
            allowEntry(room.startTime);
            return res.json({id : room.id, roomName : room.name, startTime : room.startTime});
        }
    });
});


server.listen(process.env.PORT || 3000, () => console.log('Server started'));