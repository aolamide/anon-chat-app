const moment = require("moment");
const Room = require("../models/room");

const createRoom = (req, res) => {
  let { startTime, name, maxUsers } = req.body;
  if (moment(startTime).isValid() && Number(maxUsers) && name?.trim()) {
      maxUsers = Number(maxUsers);
      if(maxUsers < 2 || maxUsers > 50) return res.json('Invalid number of participants. Must be between 2 to 50 participants.');
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
};


module.exports= { createRoom }