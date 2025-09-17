
async function ProcessWebSocketMessages(Client, Message) {
    try {
        if(Message && Message.object && Message.object.method == "SYS-UPDATE-ARR"){
            Client.GetAccount();
        }
    } catch (error) {
            
    }
}

export default {ProcessWebSocketMessages};