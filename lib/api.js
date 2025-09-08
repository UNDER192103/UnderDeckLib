const axios = require('axios');
const { URLSearchParams } = require('url');
class Api {
    /**
    * Api Under Deck Login.
    * @param {string} Token The authentication token.
    * @returns {Promise<object>} The response from the API.
    */
    async Auth(token){
        if(!token || token.length === 0){ throw new Error("Invalid token."); }
        const app = axios.create({
            baseURL: `https://undernouzen.shop`,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return app.post('/?ng=api.underdecklib', new URLSearchParams({ method: 'Auth' }));
    }
}
module.exports = Api;