import fs from 'fs';
import path from 'path';

async function ProcessWebSocketMessages(Client, Dto) {
    try {
        if(Dto){
            if(Dto.object && Dto.object.From === 'broadcast'){
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

const UploadFilesToCloud = async (Client, Data, callBackpercent = null) => {
    return new Promise(async (resolve) => {
        if(Data.FilesToUpload.length > 0){
            let countTotalFiles = 0, countUploadedFiles = 0;
            Data.FilesToUpload.forEach(Item => {
                countTotalFiles += Item.files.length;
            });
            let storage_id = null;
            for (let index1 = 0; index1 < Data.FilesToUpload.length; index1++) {
                const Item = Data.FilesToUpload[index1];
                var filesUploadeds = new Object();
                if(Item.files.length > 0){
                    for (let index2 = 0; index2 < Item.files.length; index2++) {
                        const DataItem = Item.files[index2];
                        if(!filesUploadeds[DataItem.dirFile]){
                            try {
                                const fileBuffer = fs.readFileSync(DataItem.dirFile);
                                var result = await Client.Api.Request({
                                    Method: 'UploadFileToCloud',
                                    ClientToken: Client.User.token,
                                    file: {
                                        type: 'file',
                                        data: new Blob([fileBuffer]),
                                        name: path.basename(DataItem.dirFile),
                                    },
                                    StorageId: storage_id
                                });
                                if(result.data && result.data.success == true && result.data.url){
                                    if(result.data.storage_id) storage_id = result.data.storage_id;
                                    filesUploadeds[DataItem.dirFile] = result.data.url;
                                    Item.files[index2].url = result.data.url;
                                }
                                else{
                                    delete Item.files[index2];
                                }
                            } catch (error) {
                                console.log(error);
                                delete Data.FilesToUpload[index1];
                            }
                        }
                        else{
                            Item.files[index2].url = filesUploadeds[DataItem.dirFile];
                        }

                        if(callBackpercent){
                            countUploadedFiles++;
                            let percent1 = Math.round((index1 + 1) / Data.FilesToUpload.length * 100);
                            let percent2 = Math.round((countUploadedFiles + 1) / countTotalFiles * 100);
                            callBackpercent({
                                percent: parseFloat(percent2) > 100 ? 100 : parseFloat(percent2),
                                pos1: index1,
                                posMax1: Data.FilesToUpload.length,
                                pos2: index2,
                                posMax2: Item.files.length,
                            });
                        }
                    }
                }
                Data.FilesToUpload[index1] = Item;
            }
            resolve(Data.FilesToUpload);
        }
        else{
            resolve(Data.FilesToUpload);
        }
    })
}

export default {UploadFilesToCloud, ProcessWebSocketMessages};