
async function ProcessWebSocketMessages(Client, Message) {
    try {
        if(Message){
            if(Message.object && Message.object.from === 'broadcast'){
                switch (Message.object.Method || Message.object.method) {
                    case 'ClientUpdated':
                        await Client.GetAccount();
                        Client.emit('ClientUpdated');
                    break;
                
                    default:
                    break;
                }
            }
        }
    } catch (error) {
            
    }
}

export default {ProcessWebSocketMessages};