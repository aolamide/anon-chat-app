const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const chatLoader = document.querySelector('.chat-loader');
const chatContainer = document.querySelector('.chat-container');
const toggler = document.querySelector('.sideToggler');
const sideBar = document.querySelector('.chat-sidebar');
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
const { username, code } = Qs.parse(location.search, {
    ignoreQueryPrefix : true
});

window.onload = function () {
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
            window.location.href = '/';
        }
        else {
            chatLoader.style.display = 'none'
            chatContainer.style.display = 'block'
            initSocket(response.name)
        }
    });
}

let socket = '';

function initSocket(room) {
    socket = io();

    //Join chat room
    socket.emit('joinRoom', {username, room});

    //Get room and users
    socket.on('roomUsers', ({ room ,users }) => {
        outputRoomName(room);
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
        outputAdminMessage(message);
    })

    //rejectRemoval
    socket.on('rejectRemoval', msg => {
        alert(msg);
        outputAdminMessage(msg);
    })

    //when you are removed
    socket.on('removedYou', msg => {
        outputAdminMessage(msg);
        alert(msg);
    })

    socket.on('removalError', msg => {
        alert(msg);
    })

    //Message submit
    chatForm.addEventListener('submit', e => {
        e.preventDefault();

        //Get message text
        const msg = e.target.elements.msg.value;

        //Emit message to server
        socket.emit('chatMessage', msg);

        //Clear input
        e.target.elements.msg.value = '';
        e.target.elements.msg.blur();
    });
    window.addEventListener('beforeunload', () => socket.disconnect())
}

//Output message to DOM
function outputMessage(message){
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<p class="meta">${message.username} <span>${message.time}</span></p>
    <p class="text">
        ${message.text}
    </p>`; 
    document.querySelector('.chat-messages').appendChild(div);
    //scroll down
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function outputAdminMessage(message) {
    const div = document.createElement('div');
    div.classList.add(...['message', 'adminMessage']);
    div.innerHTML = `<p class="meta">${message}</p>`; 
    document.querySelector('.chat-messages').appendChild(div);
    //scroll down
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

//Add room name to DOM
function outputRoomName(room) {
    roomName.innerText = room;
}

//Add users to DOM
function outputUsers(users) {
    userList.innerHTML = `
        ${users.map(user => `<li>${user.username}<button id=${user.id} name=${user.username} class='btn-remove fas fa-user-times'></button></li>`).join('')}
    `;
    document.querySelectorAll('.fa-user-times').forEach(deletBtn => {
        deletBtn.addEventListener('click', e => {
            const id = e.target.getAttribute('id');
            const name = e.target.getAttribute('name');
            if(confirm(`Are you sure you want to remove ${name}?`)) {
               socket.emit('removal', {userToRemove : id}); 
            }
        });
    });
}