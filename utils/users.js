const users = [];
const removedUsers = [];

//Join user to chat
function userJoin(id, username, room) {
    const user = { id, username, room };

    users.push(user);

    return user;
}

//Get current user
function getCurrentUser(id) {
    return users.find(user => user.id === id);
}

//User leaves chat
function userLeave(id) {
    const index = users.findIndex(user => user.id === id);
    if(index !== -1) {
        return users.splice(index, 1)[0];
    }
}

//Get all users in a room
function getRoomUsers(room) {
    return users.filter(user => user.room === room && !isRemoved(user.id));
}

//Check if user has been removed
function removeUser(id) {
    const index = users.findIndex(user => user.id === id);
    if(index !== -1) {
        removedUsers.push(users[index]);
        return ;
    }
}

function isRemoved(id) {
    return removedUsers.find(user => user.id === id)
}

module.exports = {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers,
    removeUser,
    isRemoved
}