import { URLSearchParams } from 'url';
import axios, { Axios } from 'axios';
import credentials from './credentials.js';
import Models from './models.js';

/** @typedef {import('./models.js').default.User} User */

class Api {
    app = this.app = axios.create({
        baseURL: `https://undernouzen.shop`,
        headers: { 'Authorization': `Bearer ${credentials.ApiToken}` }
    });

    /**
    * Under Deck User Login.
    * @param {string} Username - The username.
    * @param {string} Email - The user email.
    * @param {string} Password - The user password.
    * @returns {Promise<User|boolean|null>} A Promise that resolves to a User object, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async UserLogin(Username = String(), Password = String()){
        const response = await this.app.post('/?ng=api.underdecklib', new URLSearchParams({ Method: 'UserLogin', Username: Username, Password: Password }));
        return response?.data?.user && response.data.user.id ? new Models.User(response.data.user) : null;
    }

    /**
    * Under Deck User Login.
    * @param {string} tOKEN - The user token.
    * @returns {Promise<User|boolean|null>} A Promise that resolves to a User object, `false` from the API, or `null` if an error occurs or the client is not authenticated.
    */
    async UserAuth(Token = String()){
        const response = await this.app.post('/?ng=api.underdecklib', new URLSearchParams({ Method: 'UserAuth', Token: Token }));
        return response?.data?.user && response.data.user.id ? new Models.User(response.data.user) : null;
    }

    /**
    * Under Deck Request To Api.
    * @returns {Promise<Axios>} Return object by axios;
    */
    async Request(Data = Object()){
        const formData = new FormData();
        for (const key in Data) {
          if (Object.hasOwnProperty.call(Data, key)) {
            const value = Data[key];
            formData.append(key, value);
          }
        }
        const response = await this.app.post('/?ng=api.underdecklib', formData);
        return response;
    }
}

export default Api;