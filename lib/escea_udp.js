var stream = require('stream')
  , dgram = require('dgram')
  , util = require('util');

// Give our device a stream interface
util.inherits(Escea_udp, stream);

// Export it
module.exports = Escea_udp;

var FIRE_CONTROL = 1
var FLAME_EFFECT_CONTROL = 2

var I_AM_A_FIRE = 0x90;
var STATUS = 0x80;
var POWER_ON_ACK = 0x8D;
var POWER_OFF_ACK = 0x8F;
var FLAME_EFFECT_ON_ACK = 0x61;
var FLAME_EFFECT_OFF_ACK = 0x60;

var STATUS_PLEASE = 0x31; 
var POWER_ON = 0x39;
var POWER_OFF = 0x3A;
var SEARCH_FOR_FIRES =  0x50;
var FLAME_EFFECT_ON = 0x56;
var FLAME_EFFECT_OFF =  0x55;
var NEW_SET_TEMP = 0x57;

var ROOM_TEMP = 8
var TARGET_TEMP = 7
var FIRE_STATUS = 4
var FLAME_EFFECT_STATUS = 6
var MSG_START = 0x47
var MSG_END = 0x46 

var ON = 1
var OFF = 0
var NULL = 0x0

function Escea_udp(notify) {
  var self = this;
  this.notifier = notify
  this.client = dgram.createSocket('udp4');
  firelist = new Array();
  this.firelist = firelist;
  this.client.bind(3300, function() {

    self.client.setBroadcast(true);

    self.client.on("message", function(msg, rinfo) {
        var serial = NULL;
               
        self.firelist.forEach(function(entry) {
                if (entry.ipaddress == rinfo.address) { serial = entry.serial };
        });
        
        switch(msg[1]){
          
           case I_AM_A_FIRE:  
              var item = {ipaddress:rinfo.address , serial:msg.readUInt32BE(3,false),
                                    pin:msg.readUInt16BE(7,false) };
              if (serial == NULL) {
        	   	 firelist.push(item); 
                 self.notifier.emit("Fireplace",item.serial);     
              }
              else
              {
                   self.firelist.forEach(function(entry) {
                      if (entry.serial == msg.readUInt32BE(3,false)){
                            if (entry.ipaddress != rinfo.address){
                                 entry.ipaddress = rinfo.ipaddress ;     
                            };                        
                         };
                      });
              }                   
              break;
     
          case STATUS: 
              
              self.notifier.emit(serial+"Roomtemp",msg[ROOM_TEMP]);
              self.notifier.emit(serial+"Targettemp",msg[TARGET_TEMP]); 
              self.notifier.emit(serial+"State",msg[FIRE_STATUS]); 
              self.notifier.emit(serial+"Flameeffect",msg[FLAME_EFFECT_STATUS]);  

              var fireState =  {Foreeffect: msg[FLAME_EFFECT_STATUS] ,
                                Roomtemp: msg[ROOM_TEMP],
                                State: msg[FIRE_STATUS],
                                Targettemp: msg[TARGET_TEMP]};

              self.notifier.emit(serial+"Update",fireState);

              break;
              
          case POWER_ON_ACK:
          
              self.notifier.emit(serial+"State",true);
              break;
          
           case POWER_OFF_ACK:
          
              self.notifier.emit(serial+"State", false);
              break;
                  
            case FLAME_EFFECT_ON_ACK:
          
              self.notifier.emit(serial+"Flameeffect",true);
              break;
          
           case FLAME_EFFECT_OFF_ACK:
          
              self.notifier.emit(serial+"Flameeffect", false);
              
              break;    
         }        

    });
  });


}

Escea_udp.prototype.processMessage = function(ipa, message) {
 
  this.client.send(message, 0, message.length, 3300, ipa, function(err, bytes) {
    if (err) throw err;
  });

};

buildmessage = function(action, value)
{
  var message = new Buffer(16);
  var crc = NULL // most message only contain action

  message[0] = MSG_START;
  message[1] = action;
  for (var i = 2; i < 14; i++) {
    message[i] = NULL;
  }
  if (action == NEW_SET_TEMP){ message[2] = 1; message[3] = value;}
  for (var i = 1; i < 14; i++) {
     crc += message[i];
  }
  message[14] = crc;
  message[15] = MSG_END;
  
  return(message)
}
  
Escea_udp.prototype.discover = function() {
  var self = this;
  var broadcastip = "255.255.255.255";
  
  this.processMessage(broadcastip, buildmessage(SEARCH_FOR_FIRES));
  
};


Escea_udp.prototype.queryfire = function(fire) {
 
  var self = this;
 
  this.firelist.forEach(function(entry) {
      if (entry.serial == fire)
           { self.processMessage(entry.ipaddress, buildmessage(STATUS_PLEASE));};
   });


};

Escea_udp.prototype.setTemp = function(fire, setTemp) {
  var self = this;
  var fs;

  this.firelist.forEach(function(entry) {
        if (entry.serial == fire)
                { self.processMessage(entry.ipaddress, buildmessage(NEW_SET_TEMP,setTemp));
                  self.processMessage(entry.ipaddress, buildmessage(STATUS_PLEASE));}
  });
}  

Escea_udp.prototype.controlfire = function(fire, mode, state) {

  var self = this;
  var fs;
 
  if (mode == FIRE_CONTROL && state == ON) {  fs = POWER_ON; } 
  if (mode == FIRE_CONTROL && state == OFF) {  fs = POWER_OFF; }
  if (mode == FLAME_EFFECT_CONTROL && state == ON) {  fs = FLAME_EFFECT_ON; }
  if (mode == FLAME_EFFECT_CONTROL && state == OFF) {  fs = FLAME_EFFECT_OFF; }
  
  this.firelist.forEach(function(entry) {
        if (entry.serial == fire)
                { self.processMessage(entry.ipaddress, buildmessage(fs));}
  });

};

