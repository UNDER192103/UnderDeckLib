'use strict';

import { EventEmitter } from 'events';
import ReconnectingWebSocket from 'reconnecting-websocket';
import WS from 'ws';
import _api from './api.js';
import credentials from './credentials.js';
import macaddress from 'macaddress';
import Models from './models.js';
import ProcessFC from './processFC.js';

/** @typedef {Models.User} User */



/**
 * Under Deck Lib.
 * @returns {string} Under Deck Class.
 */
class UnderDeck extends EventEmitter {
    Api = new _api();
    Socket = null;
    #EnableOthersConnectThisClient = false;
    #LanguageId = 'en_us';

    /**
    * User data.
    */
    User = null;
    MyMac = null;
    Pc = null;

    constructor() {
        super();
        this.GetMyMac();
        this.on('Ready', async () => {
            await this.RegisterThisPc();
        });
        this.on('SocketMessage', (DTO) => {
            ProcessFC.ProcessWebSocketMessages(this, DTO);
        });
    }

    async SocketConnect(){
        return new Promise(async (resolve) => {
            if (this.Socket && this.Socket.readyState === WS.OPEN) {
                return resolve(true);
            }
            if (this.Socket && this.Socket.readyState !== WS.CLOSED) {
                this.Socket.close();
            }   
            const url = `wss://wss-underdeck2-0.undernouzen.shop/${credentials.WsToken}/`;
            const options = {
                WebSocket: WS,
                // maxReconnectionDelay: 10000,
                // minReconnectionDelay: 1000,
                // connectionTimeout: 4000,
            };  
            this.Socket = new ReconnectingWebSocket(url, [], options);  
            this.Socket.onopen = () => {
                this.emit('SocketReady');
                if (this.Pc && this.Pc.id) {
                    this.SendSocketMessage({ Method: 'Ready', Id: this.Pc.id });
                }   
            };  
            this.Socket.onmessage = (event) => {
                try {
                    const data = event.data.toString();
                    let obj = JSON.parse(data);
                    this.emit('SocketMessage', {
                        string: null,
                        object: obj,
                        reply: (Message) => {
                            return this.SendSocketMessage({ Method: 'Reply', Data: Message, to: obj.from });
                        }
                    });
                } catch (error) {
                    this.emit('SocketMessage', {
                        string: event.data.toString(),
                        object: null,
                        reply: (Message) => {
                            return this.SendSocketMessage(Message);
                        }
                    });
                }
            };  
            this.Socket.onclose = (event) => {
                this.emit('SocketClose', { code: event.code, reason: event.reason });
            };
            this.Socket.onerror = (error) => {
                this.emit('SocketError', error);
            };
            resolve(true);
        });
    }

    /**
    * Function return your mac address.
    */
    async GetMyMac(){
        if(!this.MyMac) this.MyMac = await macaddress.one();
        return this.MyMac;
    }

    /**
    * Language for response message
    */
     set LanguageId(value) {
        this.#LanguageId = value;
        this.Api.LanguageId = value;
    }

    /**
    * Enable others clients connect to this client
    */
     set EnableOthersConnectThisClient(value) {
        this.#EnableOthersConnectThisClient = value == true ? true : false;
    }

    /**
    * Function to register this pc to clients connect
    */
    async RegisterThisPc(){
        try {
            if(!this.User || this.User && !this.User.id) return false;
            let mac = await this.GetMyMac()
            let osInfo = {
                os: {
                    os: process.platform,
                    os_version: process.version,
                    os_arch: process.arch,
                    os_hostname: process.env.COMPUTERNAME,
                    os_platform: process.env.OS,
                    os_type: process.env.PROCESSOR_ARCHITECTURE,
                    os_cpu: process.env.PROCESSOR_IDENTIFIER,
                }
            };
            let response = await this.Api.Request({ Method: 'UpdatePcData', ClientToken: this.User.token, Name: process.env.COMPUTERNAME, Mac: mac, Enabled: this.#EnableOthersConnectThisClient, JsonOsInfo: JSON.stringify(osInfo)});
            if(response && response.data && response.data.pc){
                this.Pc = new Models.PC(response.data.pc);
                if(this.Pc && this.Pc.id) await this.SendSocketMessage({ Method: 'Ready', Id: this.Pc.id });
                return this.Pc;
            } else {
                return null;
            }
        } catch (error) {
            this.emit('UndError', error);
            throw error;
        }
    }

    /**
    * Send message or object to Under Deck Socket.
    * @returns Will be returned in client.on('SocketMessage') or client.on('UndError') for errors to send message
    */
    async SendSocketMessage(Message){
        try {
            let json;
            try {
                json = JSON.stringify(Message);
            } catch (error) {
                json = Message;
            }
            if (this.Socket && this.Socket.readyState === WS.OPEN) {
                this.Socket.send(json);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            this.emit('UndError', error);
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
                if(!this.User) resolve(false);
                await this.SocketConnect();
                this.User = await this.Api.UserAuth(this.User.token);
                if(this.User){
                    resolve(this.User);
                } else {
                    resolve(false);
                }
            } catch (err) {
                resolve(null);
            }
        });
    }

    /**
    * Get My Friends.
    * @returns {Promise<Map<User, User>} A Promise that resolves to a Map Users object, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async GetMyFriends(){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(new Models.UsersList([]));
                await this.SocketConnect();
                this.User = await this.Api.UserAuth(this.User.token);
                if(this.User){
                    resolve(this.User.friends);
                } else {
                    resolve(new Models.UsersList([]));
                }
            } catch (err) {
                resolve(new Models.UsersList([]));
            }
        });
    }

    /**
    * Get Find User By Name.
    * @returns {Promise<User>} A Promise that resolves to a User object, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async FindUserByName(Name = String){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'FindUserByName', ClientToken: this.User.token, Name: Name });
                try {
                    if(Array.isArray(response.data.users)){
                        resolve(new Models.UsersList(response.data.users));
                    }
                    else resolve(new Models.UsersList([]));
                } catch (error) {
                    this.emit('UndError', error);
                    resolve(new Models.UsersList([]));
                }
            } catch (error) {
                this.emit('UndError', error);
                resolve(null);
            }
        });
    }

    /**
    * Get List Themes for app and user.
    * @returns {Promise<Boolean>} A Promise that resolves to a `true`, `false` from the API, or `false` if an error occurs or the client is not authenticated.
    */
    async UpdateUser(ObjectToUpdate = Object){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'UpdateUserData', ClientToken: this.User.token, JSON: JSON.stringify(ObjectToUpdate) });
                await this.GetAccount();
                resolve(response.data.result);
            } catch (error) {
                this.emit('UndError', error);
                resolve(false);
            }
        });
    }

    /**
    * Get List Themes for app and user.
    * @returns {Promise<Object>} A Promise that resolves to a object, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async GetThemes(){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'GetThemes' });
                resolve({
                    appThemes: response.data.appThemes,
                    userNamePlates: response.data.userNamePlates,
                    userBackgrounds: response.data.userBackgrounds,
                });
            } catch (error) {
                this.emit('UndError', error);
                resolve(null);
            }
        });
    }

    /**
    * Define your user theme, NamePlate and Background.
    * @returns {Promise<Object>} A Promise that resolves to a `true`, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async DefineMyTheme(namePlateId = null, backgroundId = null){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'DefineUserTheme', ClientToken: this.User.token, NamePlateId: namePlateId, BackgroundId: backgroundId });
                await this.GetAccount();
                resolve(response.data.result);
            } catch (error) {
                this.emit('UndError', error);
                resolve(null);
            }
        });
    }

    /**
    * Change your user avatar.
    * @returns {Promise<Boolean>} A Promise that resolves to a `true`, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async ChangeAvatar(file, Width = null, Height = null, Left = null, Top = null){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'ChangeUserAvatar', ClientToken: this.User.token, Avatar: file, Width: Width, Height: Height, Left: Left, Top: Top });
                await this.GetAccount();
                resolve(response.data.result);
            } catch (error) {
                this.emit('UndError', error);
                resolve(false);
            }
        });
    }

    /**
    * Send to user friend request.
    * @returns {Promise<Boolean>} A Promise that resolves to a `true`, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async SendFriendRequest(UserId){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'RequestToFriend', ClientToken: this.User.token, UserId: UserId });
                await this.GetAccount();
                resolve(response.data.result);
            } catch (error) {
                this.emit('UndError', error);
                resolve(false);
            }
        });
    }

    /**
    * Send to user friend request.
    * @returns {Promise<Boolean>} A Promise that resolves to a `true`, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async RequestUnFriend(RequestId){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'RequestUnFriend', ClientToken: this.User.token, RequestId: RequestId });
                await this.GetAccount();
                resolve(response.data.result);
            } catch (error) {
                this.emit('UndError', error);
                resolve(false);
            }
        });
    }

    /**
    * Accept Friend Request.
    * @returns {Promise<Boolean>} A Promise that resolves to a `true`, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async AcceptFriendRequest(RequestId){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'AcceptFriendRequest', ClientToken: this.User.token, RequestId: RequestId });
                await this.GetAccount();
                resolve(response.data.result);
            } catch (error) {
                this.emit('UndError', error);
                resolve(false);
            }
        });
    }

    /**
    * Reject Friend Request.
    * @returns {Promise<Boolean>} A Promise that resolves to a `true`, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async RejectFriendRequest(RequestId){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'RejectFriendRequest', ClientToken: this.User.token, RequestId: RequestId });
                await this.GetAccount();
                resolve(response.data.result);
            } catch (error) {
                this.emit('UndError', error);
                resolve(false);
            }
        });
    }

    /**
    * Resend Friend Request.
    * @returns {Promise<Boolean>} A Promise that resolves to a `true`, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async ResendFriendRequest(RequestId){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'ResendFriendRequest', ClientToken: this.User.token, RequestId: RequestId });
                await this.GetAccount();
                resolve(response.data.result);
            } catch (error) {
                this.emit('UndError', error);
                resolve(false);
            }
        });
    }

    /**
    * Remove All outhers Users permission to connect to this pc.
    * @returns {Promise<User|boolean|null>} A Promise that resolves to a `true`, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async RevokeAllPermissionForPC(){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                if(this.Pc){
                    let response = await this.Api.Request({ Method: 'RevokeAllPermissionForPC', ClientToken: this.User.token, PcId: this.Pc.id });
                    try {
                        resolve(response.data.result);
                    } catch (error) {
                        this.emit('UndError', error);
                        resolve(null);
                    }
                }
                else{
                    resolve(false);
                }
            } catch (error) {
                this.emit('UndError', error);
                resolve(null);
            }
        });
    }

    /**
    * List All users has permissions access this pc.
    * @returns {Promise<Map>} A Promise that resolves to a `true`, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async ListAllUsersThisPCPermissions(){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                if(this.Pc){
                    let response = await this.Api.Request({ Method: 'ListAllUsersThisPCPermissions', ClientToken: this.User.token, PcId: this.Pc.id });
                    try {
                        if(response.data && response.data.result && Array.isArray(response.data.result)){
                            resolve(new Models.UsersPcPermissionsList(response.data.result));
                        }
                        else resolve(new Models.UsersPcPermissionsList([]));
                    } catch (error) {
                        this.emit('UndError', error);
                        resolve(null);
                    }
                }
                else{
                    resolve(false);
                }
            } catch (error) {
                this.emit('UndError', error);
                resolve(null);
            }
        });
    }

    /**
    * Revoce user permission connect this pc.
    * @returns {Promise<Map>} A Promise that resolves to a `true`, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async RevockUserPermisionThisPc(UserId){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                if(this.Pc){
                    let response = await this.Api.Request({ Method: 'RevockUserPermisionThisPc', ClientToken: this.User.token, PcId: this.Pc.id, UserId: UserId });
                    try {
                        resolve(response.data.result);
                    } catch (error) {
                        this.emit('UndError', error);
                        resolve(null);
                    }
                }
                else{
                    resolve(false);
                }
            } catch (error) {
                this.emit('UndError', error);
                resolve(null);
            }
        });
    }

    /**
    * Get List Themes for app and user.
    * @returns {Promise<boolean>} A Promise that resolves to a User object, `false` from the API, or `false` if an error occurs or the client is not authenticated.
    */
    async SendMsgConfirmEmail(){
        return new Promise(async (resolve) => {
            try {
                if(!this.User) resolve(false);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'SendMsgConfirmEmail', ClientToken: this.User.token, });
                await this.GetAccount();
                resolve(response.data);
            } catch (error) {
                this.emit('UndError', error);
                resolve(false);
            }
        });
    }

    /**
    * Get List Themes for app and user.
    * @param {string} UserData - The object user, containing: name, username, email, password, cpassword for confirmation password.
    * @returns {Promise<User||null||boolean>} A Promise that resolves to a User object, `false` from the API, or `false` if an error occurs or the client is not authenticated.
    */
    async UserRegister(UserData = Object){
        return new Promise(async (resolve) => {
            try {
                if(typeof UserData !== 'object') resolve(null);
                await this.SocketConnect();
                let response = await this.Api.Request({ Method: 'UserRegister', ...UserData });
                if(response?.data?.user && response.data.user.id){
                    this.User = new Models.User(response.data.user);
                    response.data.user = this.User;
                    this.emit('Ready');
                }
                resolve(response.data);
            } catch (error) {
                this.emit('UndError', error);
                resolve(false);
            }
        });
    }

    /**
    * Under Deck User Logout.
    * Emits 'Logout' on success or 'Failed' on failure.
    * @returns {Promise<boolean>} A Promise that resolves to a User object, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async Logout(){
        return new Promise(async (resolve) => {
            try {
                await this.SendSocketMessage({ Method: 'Logout', ClientId: this.User.id });
                this.Pc = null;
                this.User = null;
                this.emit('Logout');
                resolve(true);
            } catch (err) {
                this.emit('Failed', err);
                resolve(false);
            }
        });
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
                this.User = await this.Api.UserLogin(Username, Password);
                if(this.User){
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
                this.User = await this.Api.UserAuth(Token);
                if(this.User){
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