var stream = require('stream')
  , escea_udp = require('./escea_udp') 
  , util = require('util');

// Give our device a stream interface
util.inherits(escea_switch,stream);

// Export it
module.exports=escea_switch;

function escea_switch(escea_comms,em,serial,fireState) {

  var self = this;
  this.comms = escea_comms;
  this.em = em;
  this.serial = serial;
  this.state = false; 
  this.em = em;
  
     
  this.em.on(serial+'Foreeffect', function(temp){
        fireState.Foreeffect = temp
        console.log("Am i updated "+temp)
  });
   
};

escea_switch.prototype.write = function(data) {
    var self = this;
      
     self.comms.controlfire(self.serial, 2, data);
 
};
  
     
