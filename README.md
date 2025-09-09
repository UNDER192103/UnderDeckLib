Lib for Under Deck: https://undernouzen.shop

Install: npm i underdecklib

Example usage:

const UnderDeck = require('underdecklib');

const Client = new UnderDeck();

Client.on('Ready', () => {
  console.log(Client.user);
  Client.SendSocketMessage('Message Here or Json Object');
});

Client.on('Failed', (data) => {
  console.log(data);
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
  console.error('Auth failed:', err);
});

//Client.Login('User Name', 'User Password'); Or Client.Auth('User Token');