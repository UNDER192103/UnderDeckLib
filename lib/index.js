import { EventEmitter } from 'events';
import WebSocket from 'ws';
import _api from './api.js';
import credentials from './credentials.js';

/** @typedef {import('./models.js').default.User} User */

/**
 * Under Deck Lib.
 * @returns {string} Under Deck Class.
 */
class UnderDeck extends EventEmitter {
    Api = new _api();
    Socket = null;
    user = null;

    constructor() {
        super();
    }

    async SocketConnect(){
        return new Promise(async (resolve) => {
            if(this.Socket && this.Socket.readyState === WebSocket.OPEN) return resolve(true);
            this.Socket = new WebSocket(`wss://wss-underdeck2-0.undernouzen.shop/${credentials.WsToken}/`);
            this.Socket.on('open', () => {
                this.emit('SocketReady', true);
                resolve(true);
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
    * Send message or object to Under Deck Socket.
    * @returns Will be returned in client.on('SocketMessage') or client.on('error') for errors to send message
    */
    async SendSocketMessage(Message){
        try {
            try {
                return this.Socket.send(JSON.stringify(Message));
            } catch (error) {
                return this.Socket.send(Message);
            }
        } catch (error) {
            this.emit('error', error);
        }
        return false;
    }

    /**
    * Get User Account.
    * @returns {Promise<User|boolean|null>} A Promise that resolves to a User object, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async GetAccount(){
        return new Promise(async (resolve) => {
            try {
                await this.SocketConnect();
                this.user = await this.Api.UserAuth(this.user.token);
                if(this.user){
                    resolve(this.user);
                } else {
                    resolve(false);
                }
            } catch (err) {
                resolve(null);
            }
        });
    }

    async CheckToken(){
        if(!this.Token || this.Token.length === 0) return false;
        return true;
    }

    /**
    * Under Deck User Login.
    * Emits 'Ready' on success or 'Failed' on failure.
    * @param {string} Username - The username.
    * @param {string} Email - The user email.
    * @param {string} Password - The user password.
    * @returns {Promise<User|boolean|null>} A Promise that resolves to a User object, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async Login(Username = String(), Password = String()){
        return new Promise(async (resolve) => {
            if(!Username || Username.length === 0 || !Password || Password.length === 0){
                const err = new Error("Invalid user credentials.");
                this.emit('UserFailed', err);
                resolve(false);
            }
            try {
                await this.SocketConnect();
                this.user = await this.Api.UserLogin(Username, Password);
                if(this.user){
                    this.emit('Ready');
                    resolve(true);
                } else {
                    const err = new Error("Invalid user credentials.");
                    this.emit('UserFailed', err);
                    resolve(false);
                }
            } catch (err) {
                this.emit('Failed', err);
                resolve(false);
            }
        });
    }

    /**
    * Under Deck User Auth by Token.
    * Emits 'Ready' on success or 'Failed' on failure.
    * @param {string} Token - The authentication token.
    */
    async Auth(Token = String()){
        return new Promise(async (resolve) => {
            if(!Token || Token.length === 0){
                const err = new Error("Invalid user token.");
                this.emit('Failed', err);
                resolve(false);
            }
            try {
                await this.SocketConnect();
                this.user = await this.Api.UserAuth(Token);
                if(this.user){
                    this.emit('Ready');
                    resolve(true);
                } else {
                    const err = new Error("Invalid user credentials.");
                    this.emit('UserFailed', err);
                    resolve(false);
                }
            } catch (err) {
                this.emit('Failed', err);
                resolve(false);
            }
        });
    }
}

export default UnderDeck;