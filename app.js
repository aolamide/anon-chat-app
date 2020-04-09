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

const bp = require('body-parser');
const Game = require('./models/game');

const app = express();
const server = http.createServer(app);

app.use(bp.json());

app.use(express.static(path.join(__dirname, 'public')));

const io = require('socket.io')(server);

const { userJoin, getCurrentUser, userLeave, getRoomUsers, isRemoved, removeUser } = require('./utils/users');

const allowEntry = ( startTime ) => {
    //Run when a client connects 
    if(io.sockets._events === undefined) {
        io.on('connection', socket => {
            socket.on('joinRoom', ({ username, room }) => {
                const user = userJoin(socket.id, username, room);
                socket.join(user.room);
        
                //Welcome current user
                socket.emit('welcomeMessage', ['Welcome to Last Man Standing', 'You can start removing fellow players from ' + startTime,  'Click on the icon beside a member\'s name to remove them', 'If you try to remove anyone before the time above, it won\'t work and you could be disqualified' , 'If you\'re on mobile, click the purple menu icon at the side of the screen to open the member list', 'Once you\'re removed, you would still be in the game to see how it ends but would not be able to send messages or remove anyone still in the game', 'Leggo, may the best win!!!']);
        
                //Broadcast when a user connects
                socket.broadcast.to(user.room).emit('adminMessage',`${user.username} has joined the chat`);
        
                //Send users and room info
                io.to(user.room).emit('roomUsers', {
                    room : user.room,
                    users : getRoomUsers(user.room)
                });
            });
        
            //Listen for chatMessage
            socket.on('chatMessage', msg => {
                const user = getCurrentUser(socket.id);
                const removed = isRemoved(socket.id);
                if(removed) {
                    return socket.emit('adminMessage', 'Your messages won\'t be seen by others as you have been removed')
                }
        
                io.to(user.room).emit('message', formatMessage( user.username , msg));
            });

            //when a user is removed
            socket.on('removal', data => {
                const now = moment();
                const removalTime = moment(startTime);
                if(now.diff(removalTime) <  0){
                    return socket.emit('rejectRemoval', 'It is not time to remove yet, be warned!');
                }
                let { userToRemove } = data;
                const user = getCurrentUser(socket.id);
                const removingUser = getCurrentUser(userToRemove);
                const a = isRemoved(socket.id);
                const b = isRemoved(userToRemove);
                if(userToRemove == socket.id) {
                    return socket.emit('adminMessage', 'Why are you trying to remove yourself?');
                }
                else if(!a && !b) {
                    removeUser(userToRemove);

                    io.to(user.room).emit('adminMessage', `${user.username} removed ${removingUser.username}`);

                    io.to(removingUser.id).emit('removedYou', 'You have been removed');

                    //Send users and room info
                    io.to(user.room).emit('roomUsers', {
                        room : user.room,
                        users : getRoomUsers(user.room)
                    });
                    return;
                }
                if(a) return socket.emit('removalError', 'You have been removed already')
                if(b) return socket.emit('removalError', `${removingUser.username} has already been removed}`);
            })
            //RRuns when client disconnects
            socket.on('disconnect', () => {
                const user = userLeave(socket.id);
        
                if(user) {
                    io.to(user.room).emit('adminMessage', `${user.username} has left the chat`);
        
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
})

app.post('/game', (req, res) => {
    let { startTime, name, maxUsers } = req.body;
    const now = moment();
    const gameTime = moment(startTime);
    if(now.diff(gameTime) >= 0) return res.json('Please enter a future date')
    else if (moment(startTime).isValid() && Number(maxUsers) && name.trim()) {
    Game.findOne({name}, async (err, game) => {
            if(game) return res.json('Game name already exists');
            startTime = await moment(startTime).format('LLLL');
            maxUsers = await Number(maxUsers);
            const newGame = new Game({name, startTime, maxUsers});
            newGame.save((err, saved) => {
                if(err || !saved) return res.json('Error creating game');
                return res.json({
                    message : 'Game created successfully',
                    start : saved.startTime,
                    id : saved.id
                });
            })
        })
    }
    else return res.json('Error, please fill all fields with correct format');
});

//Endpoint to join game
app.post('/join', (req, res) => {
    const { code : id, username } = req.body;
    Game.findOne({id}, (err, game) => {
        if(err || !game) return res.json({error : 'Error. Pin may be incorrect.'});
        let roomUsers = getRoomUsers(game.id);
        let nameExists = roomUsers.find(user => user.username.toLowerCase() === username.toLowerCase());
        const now = moment();
        const gameStart = moment(game.startTime);
        if(now.diff(gameStart) >= 0) return res.json({error : 'Game has closed for entries'})
        else if(roomUsers.length >= game.maxUsers) return res.json({error : 'Game is full'});
        else if(nameExists) return res.json({error : 'Username is taken, choose another'});
        else {
            allowEntry(game.startTime);
            return res.json({id : game.id});
        }
    });
});

// Game.findOneAndUpdate({id : '8618310050'}, {startTime : 'Thursday, April 9, 2020 12:03 PM'}, (err, res)=> console.log(res));

server.listen(process.env.PORT || 3000, () => console.log('Server started'));