var NameSpace = require("../index.js");

exports.joinRoom = function(roomName, onFileAnnounce, onMessage){
  window.room = new NameSpace(roomName)
  room.join(2, function(err, faceID){
    console.log("new peer connection in the room", err, faceID)
  })
  .setDataType("json")
  .subscribe(function(err, data){
    if(!err){
      onMessage(data)
      console.log(data)
    } else {
      console.log(err)
    }
  })

  window.fileBox = room.IO("files")
  console.log(room, fileBox)
  fileBox.setDataType("file")
         .listen(function(err, fileName){
           console.log("got file announce", fileName)
           window.fileName = fileName
           onFileAnnounce(fileName)
         })
}

exports.shareFile = function(file){
  fileBox.publish(file.name, file)
}

exports.getFile = function(fileName, callback){
  fileBox.fetch(fileName, function(err, file){
    console.log("got file?", err, file)
    callback(err, file)
  })
}

exports.chat = function(message){
  room.publish("" + Math.random(), {
    handle: window.handle
    , message: message
    , id : Date.now()
  })
}
module.exports = exports;
