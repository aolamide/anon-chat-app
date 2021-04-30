const NodeCache = require('node-cache');

//store messages in cache for 1hr
const cache = new NodeCache({ stdTTL : 60 * 60 });

//add messages to cache
const addToCache = (roomId, data) => {
  let room = cache.get(roomId);
  if(!room) {
    room = [data];
  } else {
    room.push(data);
  }
  cache.set(roomId, room);
}

//get messages stored in cache
const getPreviousMessages = (roomId) => {
  const room = cache.get(roomId);
  if(!room) return [];
  return room;
}

module.exports = { addToCache, getPreviousMessages };