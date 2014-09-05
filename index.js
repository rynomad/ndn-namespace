var IO = require("ndn-io")
var Forwarder = require("ndn-gremlin")
var DataBase = require("ndn-repo/src/database.js");
var RepoEntry = require("ndn-repo/src/repoEntry.js")

var ms = new MessageChannel();
var gremlin = new Forwarder({
  ws: 1337,
  tcp : 1338
});
var ndn = Forwarder.ndn;

IO.installContrib(Forwarder.contrib);
DataBase.installNDN(Forwarder.ndn);

gremlin.io = new IO("MessageChannelTransport", ms.port1);


gremlin.addConnection(ms.port2)
       .addConnection("ws://" + location.hostname + ":1338")




gremlin.repo = new DataBase(new Forwarder.contrib.ContentStore(new Forwarder.contrib.NameTree(), RepoEntry), {path: "np"}, function(){
  RepoEntry.installDatabase(gremlin.repo);
});

function NameSpace(prefix){
  this.prefix = new ndn.Name(prefix);
  this.connectionRequestSuffix = new ndn.Name("requestPeerConnection")
  this.announcementSuffix = new ndn.Name("announceNewData")
  gremlin.addRegisteredPrefix(this.prefix.toUri(), 0)
  console.log(this.prefix.toUri(), gremlin.interfaces.Faces[0])
  return this;
};


NameSpace.prototype.IO = function(suffix){
  var suf = new ndn.Name(suffix);
  return new NameSpace(this.prefix.toUri() + suf.toUri());
}

NameSpace.prototype.join = function(maxPeers){
  var Self = this;

  var onFace = function(err, firstFaceID){
    if (!err){
      gremlin.addRegisteredPrefix(Self.prefix, firstFaceID)
    }
  };

  var onFaceClosed = function(closedFaceID){
    gremlin.requestConnection(this.prefix.toUri() + Self.connectionRequestSuffix.toUri(), onFace )
  }

  gremlin
  .registerPrefix(this.prefix.toUri(), 1)
  .addRegisteredPrefix(this.prefix.toUri(), 1)
  .requestConnection(this.prefix.toUri() + Self.connectionRequestSuffix.toUri() ,onFace , onFaceClosed)
  .addConnectionListener(Self.prefix.toUri() + Self.connectionRequestSuffix.toUri() , maxPeers, onFace, onFaceClosed)

  return this;
}

NameSpace.prototype.listen = function(onAnnounce){
  var Self = this;
  var awares = []

  gremlin.addListener(Self.prefix.toUri() + Self.announcementSuffix.toUri(), function(interest, faceID){
    for (var i = 0 ; i < awares.length - 1; i++){
      if (awares[i] === interest.name.toUri()){
        return;
      };
    }
    awares.push(interest.name.toUri());
    onAnnounce(null, interest.name.getSubName((Self.prefix.size() * 2) + Self.announcementSuffix.size()).toUri());
  })
}

NameSpace.prototype.subscribe = function(onAppData){
  var Self = this;
  gremlin.addListener(Self.prefix.toUri() + Self.announcementSuffix.toUri(), function(interest, faceID){
    gremlin.io.fetcher.setName(interest.name.getSubName(Self.prefix.size() + Self.announcementSuffix.size()).toUri())
              .setInterestLifetimeMilliseconds(400)
              .setType(Self.dataType)
              .get(onAppData)
  })
  return this;
}

NameSpace.prototype.steward = function(){
  gremlin.addListener(Self.prefix.toUri() + Self.announcementSuffix.toUri(), function(interest, faceID){
    gremlin.io.fetchAllSegments(interest.getSubName(Self.prefix.size() + Self.announcementSuffix.size()), function(element, data, finalBlockID){
      gremlin.repo.insert(element, data, function(err, success){
        console.log("is there even a callback here?")
      })
    }, function(){
      console.log("timeout when trying to steward announced data")
    });
  })
  .addListener({
    prefix : Self.prefix.toUri()
    , blocking : true
  }, function(interest, faceID, unblock){
    gremlin.repo.check(interest, function(element){
      if (!element){
        unblock();
      } else {
        gremlin.dispatch(element, 0 | (1 << faceID)) // DOUBLE CHECK THIS!!!!!!!!!!!
      }
    })
  });

  return this;
}

NameSpace.prototype.announce = function() {
  var Self = this;
  return function(firstData){
    console.log("announcing data ", firstData.name.toUri() )
    var announceInterest = new ndn.Interest(new ndn.Name(Self.prefix.toUri() + Self.announcementSuffix.toUri() + firstData.name.getPrefix(-1).toUri()));

    gremlin.handleInterest(announceInterest.wireEncode().buffer, 0);
  }

  return this;
};

NameSpace.prototype.publish = function(name, toPublish) {
  var Self = this;
  var ndnName = new ndn.Name(name)
  gremlin
  .io
  .publisher.setName(this.prefix.toUri() + ndnName.toUri())
  .setFreshnessPeriod(60 * 60 * 1000)
  .setToPublish(toPublish)
  .publish(Self.announce());
  return this;
};

NameSpace.prototype.fetch = function(name, onAppData){
  var Self = this;
  var ndnName = new ndn.Name(name)
  gremlin
  .io
  .fetcher.setName(this.prefix.toUri() + ndnName.toUri())
  .setInterestLifetimeMilliseconds(400)
  .setType(this.dataType)
  .get(onAppData);
  return this;
}

NameSpace.prototype.setConnectionRequestSuffix = function(suffix){
  this.connectionRequestSuffix = new ndn.Name(suffix);
  return this;
};

NameSpace.prototype.setAnnouncementSuffix = function(suffix){
  this.announcementSuffix = new ndn.Name(suffix)
  return this;
};

NameSpace.prototype.setDataType = function(type){
  this.dataType = type;
  return this;
};

module.exports = NameSpace;
