
const createForm = document.querySelector('form');
const errorBox = document.querySelector('.error');
const successBox = document.querySelector('.success');
const submitButton = document.querySelector('.btn');


createForm.addEventListener('submit', e => {
    e.preventDefault();
    submitButton.disabled = true;
    successBox.innerHTML = '';
    errorBox.innerHTML = ''
    const { gameName, maxUsers, gameStart } = e.target.elements;
    fetch('/game', {
        method : 'POST',
        headers : {
            'Content-Type' : 'application/json',
            'Accept' : 'application/json'
        },
        body : JSON.stringify({
            name : gameName.value,
            maxUsers : maxUsers.value,
            startTime : gameStart.value
        })
    })
    .then(res => res.json())
    .then(result => {
        if(!result.message) {
            displayError(result);
        }
        else {
            displaySuccess(result);
            createForm.reset();
        }
        submitButton.disabled = false;
    })
})

function displayError(errorMessage) {
    errorBox.innerText = errorMessage;
}

function displaySuccess({id, start, message}) {
    successBox.innerHTML = `
        <p>${message}</p>
        <p>Game code : <span class='bold'>${id}</span></p>
        <p>Games starts ${start}</p>
        <a href="whatsapp://send?text=Hey, join my last man standing game. Go to ${window.origin} and enter the code ${id}">Share game on Whatsapp</a>
    `
}