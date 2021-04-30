const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const usersCount = document.getElementById('users-count');
const chatLoader = document.querySelector('.chat-loader');
const chatContainer = document.querySelector('.chat-container');
const toggler = document.querySelector('.sideToggler');
const sideBar = document.querySelector('.chat-sidebar');
const messageInput = document.getElementById('msg');
let sideOpen = false;

//side nav
toggler.addEventListener('click', function() {
    if(sideOpen) {
        sideBar.style.width = '0px';
        sideBar.style.padding = '0px';
        toggler.style.left = '0';
    }else {
        sideBar.style.width = '70vw';
        sideBar.style.padding = '20px 20px 60px';
        toggler.style.left = '70vw'
    }
    sideOpen = !sideOpen;
})


//get username and room from URL
let { username, code } = Qs.parse(location.search, {
    ignoreQueryPrefix : true
});

window.onload = function () {
    if(username && code){
        username = username.trim();
        code = code.trim();
        if(!username|| !code) {
            window.location.href = '/join';
        }
        fetch('/join', {
            method : 'POST',
            headers : {
                'Content-Type' : 'application/json',
                'Accept' : 'application/json'
            },
            body : JSON.stringify({username, code})
        })
        .then(res => res.json())
        .then(response => {
            if(response.error){
                alert(response.error);
                window.location.href = `/join?code=${code}`;
            }
            else {
                chatLoader.style.display = 'none'
                chatContainer.style.display = 'block'
                document.title = `Chat Room : ${response.roomName}`;
                initSocket(response.id, response.roomName)
            }
        });
    } else {
        window.location.href = `/join`;
    }
}

let socket = '';

function initSocket(room, roomName) {
    socket = io();

    //Join chat room
    socket.emit('joinRoom', { username, room, roomName });

    //Get room and users
    socket.on('roomUsers', ({ users }) => {
        outputRoomName(roomName);
        outputUsers(users);
    });

    //welcomeMesage
    socket.on('welcomeMessage', messages => {
        messages.map(message => outputAdminMessage(message));
    });

    //Message from server
    socket.on('message', message => {
        outputMessage(message);
    });

    socket.on('adminMessage', message => {
        const splitMessage = message.split(' ');
        if(splitMessage[0] === username) {
            message = `You ${splitMessage[1]}`
        }
        outputAdminMessage(message);
    })

    //Message submit
    chatForm.addEventListener('submit', e => {
        e.preventDefault();

        //Get message text
        // const msg = e.target.elements.msg.value;
        const msg = messageInput.value;

        //Emit message to server
        socket.emit('chatMessage', msg);

        //Clear input
        messageInput.value = '';
        messageInput.focus();
    });
    window.addEventListener('beforeunload', () => socket.disconnect())
}

let lastMessageUsername = '';

//Output message to DOM
function outputMessage(message){
    const div = document.createElement('div');
    let isMyMessage = message.username === username;
    const time = new Date(message.time).toLocaleTimeString();
    if(lastMessageUsername !== message.username) {
        isMyMessage ? div.classList.add(...['message', 'myMsg', 'chats']) : div.classList.add(...['message', 'chatMsg', 'chats']);
        div.innerHTML = `<p class="meta">${isMyMessage ? '' : message.username} <span>${time}</span></p>
        <p class="text">
            ${message.text}
        </p>`;
    } else {
        div.classList.add(...['message', 'noUsernameMessage', 
        'chats']);
        if(isMyMessage) {
            div.classList.add('myMsgGroup')
        }
        div.innerHTML = `<p class="meta"><span>${time}</span></p><p class="text">${message.text}</p>`;
    }
     
    chatMessages.appendChild(div);
    //scroll down
    chatMessages.scrollTop = chatMessages.scrollHeight;
    lastMessageUsername = message.username;
}

function outputAdminMessage(message) {
    const clearFloat = document.createElement('div');
    clearFloat.style.clear = 'both';
    chatMessages.appendChild(clearFloat);
    const div = document.createElement('div');
    div.classList.add(...['message', 'adminMessage']);
    div.innerHTML = `<p class="meta">${message}</p>`; 
    chatMessages.appendChild(div);
    //scroll down
    chatMessages.scrollTop = chatMessages.scrollHeight;

    //reset lastMessageUsername
    lastMessageUsername = '';
}

//Add room name to DOM
function outputRoomName(room) {
    roomName.innerText = room;
}

//Add users to DOM
function outputUsers(users) {
    usersCount.innerHTML = `<strong>${users.length}</strong>`;
    userList.innerHTML = `
        <li>${username}<strong>(you)</strong></li>
        ${users.map(user => user.username === username ?  '' : `<li>${user.username}</li>`).join('')}
    `;
}