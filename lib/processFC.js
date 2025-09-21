
async function ProcessWebSocketMessages(Client, Dto) {
    try {
        if(Dto){
            if(Dto.object && Dto.object.from === 'broadcast'){
                switch (Dto.object.Method || null) {
                    case 'ClientUpdated':
                        await Client.GetAccount();
                        Client.emit('ClientUpdated');
                    break;
                
                    default:
                        Client.emit('SocketMessage', Dto);
                    break;
                }
            }
            else{
                switch (Dto.object.Method || null) {
                    
                    default:
                        Client.emit('SocketMessage', Dto);
                    break;
                }
            }
        }
    } catch (error) {
        Client.emit('SocketError', error);
    }
}

export default {ProcessWebSocketMessages};