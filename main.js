import { API_KEY } from './config.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(API_KEY);
const selectedGenre = getQueryParameter('genre');

async function generateResponse(prompt) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
        history: [
            { role: "user", parts: [{ text: `You are a storyteller in ${selectedGenre}. You give part of the story and let the user
                decide the course of the story with detailed options that you provide.
                Continue the story based on the user's choice to make it into a continuous single story. Options must be JSON array format, e.g., '["option1", "option2", "option3"]'.
                Make the story interesting with good continuation and dialogues. When asked to end the story, describe the entire story up to then and provide
                a conclusion to the story.
                when asked to end the story, explain the entire story up to then with great detail and end it with a proper conclusion.` }] },
            { role: "model", parts: [{ text: "Alright, I will give part of the story and options in JSON array always then the user will select an option that i provide to instruct me what he would do next and I will continue the same story further." }] },
        ],
    });
    const result = await chat.sendMessage(prompt);
    return result.response.text();
}

document.getElementById('chat-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const userInput = document.getElementById('user-input').value;
    hidePreviousChats();
    addMessageToChat('Player', userInput);
    document.getElementById('user-input').value = '';
    showLoadingSpinner(true);
    const botResponse = await generateResponse(userInput);
    showLoadingSpinner(false);
    addMessageToChat('Narrator', botResponse);
    addOptionsToChat(botResponse);
    // Show the end story button after an option has been selected
    document.getElementById('end-story-button').style.display = 'block';
});

function addMessageToChat(sender, message) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    const cleanMessage = message.replace(/\[.*?\]/g, '').trim().replace(/```[^`]*```/g, '').replace(/\*/g, '');
    messageElement.innerHTML = `<strong>${sender}:</strong> ${cleanMessage.trim()}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = 0;
}

function addOptionsToChat(response) {
    const chatBox = document.getElementById('chat-box');
    const optionsElement = document.createElement('div');
    optionsElement.classList.add('chat-options');
    const options = JSON.parse(extractJsonFromText(response, '[', ']'));

    if (Array.isArray(options)) {
        options.forEach((text, index) => {
            const label = document.createElement('label');
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = 'story-option';
            radioInput.value = index;
            radioInput.addEventListener('change', async () => {
                hidePreviousChats();
                addMessageToChat('Player', text);
                showLoadingSpinner(true);
                const botResponse = await generateResponse(`Option ${index} selected: ${text}`);
                showLoadingSpinner(false);
                addMessageToChat('Narrator', botResponse);
                addOptionsToChat(botResponse);

                // Show the end story button after an option has been selected
                document.getElementById('end-story-button').style.display = 'block';
            });
            label.appendChild(radioInput);
            label.appendChild(document.createTextNode(` ${text}`));
            optionsElement.appendChild(label);
        });
    }
    chatBox.appendChild(optionsElement);
    chatBox.scrollTop = 0;
}


function showLoadingSpinner(show) {
    document.getElementById('loading-spinner').style.display = show ? 'block' : 'none';
}

function hidePreviousChats() {
    const chatBox = document.getElementById('chat-box');
    chatBox.querySelectorAll('.chat-message').forEach(message => message.style.display = 'none');
    const options = chatBox.querySelector('.chat-options');
    if (options) options.remove();
}

function extractJsonFromText(text, startDelimiter, endDelimiter) {
    const startIndex = text.indexOf(startDelimiter) + startDelimiter.length;
    const endIndex = text.indexOf(endDelimiter, startIndex);
    const arraySubstring = text.substring(startIndex, endIndex).trim();
    return `[${arraySubstring}]`;
}

document.addEventListener('DOMContentLoaded', async () => {
    showLoadingSpinner(true);
    const botResponse = await generateResponse('start');
    showLoadingSpinner(false);
    addMessageToChat('Narrator', botResponse);
    addOptionsToChat(botResponse);
});

document.getElementById('end-story-button').addEventListener('click', async () => {
    hidePreviousChats();
    showLoadingSpinner(true);
    const botResponse = await generateResponse(`
        End the story
    `);
    showLoadingSpinner(false);
    addMessageToChat('Narrator', botResponse);

    // Hide the text box and submit button
    document.getElementById('user-input').style.display = 'none';
    document.getElementById('chat-form').querySelector('button[type="submit"]').style.display = 'none';
    document.getElementById('end-story-button').style.display = 'none'; // Hide the button after story ends
});
