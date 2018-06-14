var stream = require('stream')
  , escea_udp = require('./escea_udp') 
  , util = require('util');

// Give our device a stream interface
util.inherits(escea_switch,stream);

// Export it
module.exports=escea_switch;
/*
 *
 * @property {Boolean} readable Whether the device emits data
 * @property {Boolean} writable Whether the data can be actuated
 *
 * @property {Number} G - the channel of this device
 * @property {Number} V - the vendor ID of this device
 * @property {Number} D - the device ID of this device
 *
 * @property {Function} write Called when data is received from the Ninja Platform
 *
 * @fires data - Emit this when you wish to send data to the Ninja Platform
 */
function escea_switch(serial,em,escea_comms) {

  var self = this;
  this.comms = escea_comms;
  this.em = em;
  this.serial = serial;
  this.state = false; 
  this.em = em;
  
   
};

escea_switch.prototype.write = function(data) {
    var self = this;
      
     self.comms.controlfire(self.serial, 1, data);
 
};
  
     
