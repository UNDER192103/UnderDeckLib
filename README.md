Lib for Under Deck

How to install: npm i underdecklib

Example:

const UnderDeck = require('underdecklib');
const Client = new UnderDeck();

Client.on('ready', (data) => {
  console.log('Login successful!', data);
});

Client.on('SocketReady', () => {
  console.log('Socket connected successfully!');
});

Client.on('SocketClose', (data) => {
  console.error(data);
});

Client.on('SocketMessage', (data) => {
  console.error(data);
});

Client.on('error', (err) => {
  console.error('Login failed:', err);
});

Client.Login('token here');