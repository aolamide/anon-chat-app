
const createForm = document.querySelector('form');
const errorBox = document.querySelector('.error');
const successBox = document.querySelector('.success');
const submitButton = document.querySelector('.btn');

const shareDetails = {
    title : '',
    text : '',
    url : ''
};

createForm.addEventListener('submit', e => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.innerText = '...';
    successBox.innerHTML = '';
    errorBox.innerHTML = ''
    const { roomName, maxUsers, roomStart } = e.target.elements;
    fetch('/room', {
        method : 'POST',
        headers : {
            'Content-Type' : 'application/json',
            'Accept' : 'application/json'
        },
        body : JSON.stringify({
            name : roomName.value,
            maxUsers : maxUsers.value,
            startTime : new Date(roomStart.value).toISOString()
        })
    })
    .then(res => res.json())
    .then(result => {
        if(!result.message) {
            displayError(result);
        }
        else {
            shareDetails.title = result.name;
            shareDetails.url = window.origin + `/join?code=${result.id}`;
            shareDetails.text = `Hey, let us chat anonymously about "${result.name}" on ${new Date(result.start)}.`
            displaySuccess(result);
            createForm.reset();
        }
    })
    .catch(() => {
        displayError('Error connecting to server.')
    })
    .finally(() =>{
        submitButton.disabled = false;
        submitButton.innerText = 'Create Room';
    })
})

function displayError(errorMessage) {
    errorBox.innerText = errorMessage;
}

function displaySuccess({id, start, message}) {
    successBox.innerHTML = `
        <p>${message}</p>
        <p>Room code : <span class='gameCode'>${id}</span></p>
        <p>Room starts ${new Date(start)}</p>
        <div class="shareContainer">
            <i title="Share link" onclick="share()" class="share fa-3x fas fa-share-alt-square"></i>
        </div>
    `
}


const share = () => {
    if (navigator.share) {
        navigator.share(shareDetails)
        .then(() => console.log('Successful share'))
        .catch((error) => console.log('Error sharing', error));
    } else {
        alert('Unable to share, please copy room code and share.')
    }
}