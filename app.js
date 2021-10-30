const express = require("express");
const http = require("http");
const path = require("path");
const config = require("./config");
const db = require("./helpers/db");
const roomRouter = require("./routes/room");
const moment = require("moment");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");
const formatMessage = require("./utils/messages");
const Room = require("./models/room");
const redirectToHttps = require("./helpers/https");
const {getPreviousMessages, addToCache} = require("./helpers/cache");

const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server);

const initSocket = () => {
  //Run when a client connects
  if (io.sockets._events === undefined) {
    io.on("connection", socket => {
      socket.on("joinRoom", ({username, room, roomName}) => {
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);

        //get and display old messages
        const oldMessages = getPreviousMessages(user.room);

        oldMessages.forEach(msg => {
          if (msg.type === "chatMessage") {
            socket.emit("message", msg);
          } else {
            socket.emit("adminMessage", msg.text);
          }
        });

        //Welcome current user
        socket.emit("welcomeMessage", [
          `Welcome to Anonymous Chat on ${roomName}`,
          "If you're on mobile, click the green menu icon at the left side of the screen to show room details",
          "Refresh the page if you are not able to send or receive messages at any point.",
        ]);

        //Broadcast when a user connects
        socket.broadcast
          .to(user.room)
          .emit("adminMessage", `${user.username} joined the room`);
        addToCache(user.room, {
          text: `${user.username} joined the room`,
          type: "adminMessage",
        });

        //Send users and room info
        io.to(user.room).emit("roomUsers", {
          users: getRoomUsers(user.room),
        });
      });

      //Listen for chatMessage
      socket.on("chatMessage", msg => {
        const user = getCurrentUser(socket.id);
        if (user) {
          const message = formatMessage(user.username, msg);
          io.to(user.room).emit("message", message);

          //add message to cache for 1hr
          message.type = "chatMessage";
          addToCache(user.room, message);
        } else {
          socket.disconnect();
        }
      });

      //Runs when client disconnects
      socket.on("disconnect", () => {
        const user = userLeave(socket.id);

        if (user) {
          const message = `${user.username} left the room`;
          io.to(user.room).emit("adminMessage", message);

          //Send users and room info
          io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room),
          });

          addToCache(user.room, {text: message, type: "adminMessage"});
        }
      });
    });
  }
};

const joinRoom = (req, res) => {
  const {code: id, username} = req.body;
  if (!id || !username)
    return res.json({error: "Username and room code are required"});
  Room.findOne({id}, (err, room) => {
    if (err || !room) return res.json({error: "Error. Pin may be incorrect."});
    let roomUsers = getRoomUsers(room.id);
    let nameExists = roomUsers.find(
      user => user.username.toLowerCase() === username.toLowerCase()
    );
    const now = moment();
    const roomStart = moment(room.startTime);
    if (roomStart.diff(now) > 0)
      return res.json({error: "Room has not started yet."});
    if (now.diff(roomStart, "hours") >= 1)
      return res.json({error: "Room has closed for entries."});
    else if (roomUsers.length >= room.maxUsers)
      return res.json({error: "Room is full."});
    else if (nameExists)
      return res.json({error: "Username is taken, choose another."});
    else {
      initSocket();
      return res.json({
        id: room.id,
        roomName: room.name,
        startTime: room.startTime,
      });
    }
  });
};

app.use(redirectToHttps);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(roomRouter);
app.post("/join", joinRoom);

const PORT = config.PORT;

(async function () {
  try {
    await db.connect();
    server.listen(PORT, () =>
      console.log("DB connected. Server listening on PORT " + PORT)
    );
    // module.exports = server;
  } catch (error) {
    console.error(error);
    process.exit(0);
  }
})();

module.exports = initSocket;
