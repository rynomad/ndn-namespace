
var dropkick = require('dropkick');



var ndnFunc = require("../src.js")


dropkick(document.body)
  .on('file', function(file) {
    ndnFunc.shareFile(file)
  })


window.handle = prompt("choose a handle: ")
window.roomName = prompt("enter room name: ")



var input = document.getElementById("chatInput")
input.addEventListener("keydown", function(e) {
    if (!e) { var e = window.event; }
    if (e.keyCode == 13) { ndnFunc.chat(input.value); input.value = ""; }
}, false)

ndnFunc.joinRoom(roomName)


var makeSaveButton = function(line, fileName, file){
  var a = document.createElement("a")
  a.download = fileName;
  a.innerText = "save"
  a.href = URL.createObjectURL(file);
  line.appendChild(a)
}

var makeDownloadButton = function(line, fileName, io){
  var button = document.createElement("button")
  button.innerText = "download"
  button.onclick = function(){
    ndnFunc.getFile(fileName, function(err,file){
      makeSaveButton(line, fileName, file)
    })
  }
  line.appendChild(button)
}
module.exports.displayMessage = function(msg, io){
  var line = document.createElement("p")
  line.innerText = msg.handle + " : " + msg.message + "  ";
  document.getElementById("output").insertBefore(line, document.getElementById("output").firstChild)
  if (msg.message.indexOf("file://") === 0){
    console.log("msg is file announce",msg.message.substring(6))
    makeDownloadButton(line, msg.message, io)
  }
}
