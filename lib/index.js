const { EventEmitter } = require('events');
const WebSocket = require('ws');
const _api = require('./api');

/**
 * Under Deck Lib.
 * @returns {string} Under Deck Class.
 */
class UnderDeck extends EventEmitter {
    Api = new _api();
    Token = null;
    Socket = null;
    constructor() { super(); }

    async SocketConnect(){
        return new Promise( resolve => {
            if(this.Socket && this.Socket.readyState === WebSocket.OPEN) return resolve();
            this.Socket = new WebSocket(`wss://wss-underdeck2-0.undernouzen.shop/${this.Token}/`);
            this.Socket.on('open', () => {
                this.emit('SocketReady', true);
                resolve();
            });
            this.Socket.on('message', (data) => { this.emit('SocketMessage', data.toString()); });
            this.Socket.on('close', (code, reason) => {
                this.emit('SocketClose', { code: code, reason: reason.toString() });
                setTimeout(() => this.SocketConnect(), 1000);
            });
            this.Socket.on('error', (error) => {
                this.Socket.close();
                this.emit('error', error);
            });
        });
    }

    /**
    * Under Deck Login.
    * Emits 'login' on success or 'error' on failure.
    * @param {string} Token - The authentication token.
    */
    async Login(Token){
        if(!Token || Token.length === 0){
            const err = new Error("Invalid token.");
            this.emit('error', err);
            throw err;
        }
        try {
            const response = await this.Api.Auth(Token);
            this.Token = Token;
            await this.SocketConnect();
            this.emit('ready', response.data);
        } catch (err) {
            this.emit('error', err);
        }
    }
}

module.exports = UnderDeck;