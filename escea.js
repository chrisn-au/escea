
var escea_udp = require('./lib/escea_udp')
  , escea_switch = require('./lib/escea_switch')
  , escea_room = require('./lib/escea_room')
  , escea_target = require('./lib/escea_target')
  , escea_flameeffect = require('./lib/escea_flameeffect')
  , util = require('util')
  , stream = require('stream')
  , events = require('events');

var mqtt = require('mqtt')
// var mqttclient  = mqtt.connect('mqtt://192.168.0.27')
var mqttclient  = mqtt.connect('mqtt://192.168.0.127')
 
mqttclient.on('connect', function () {
  mqttclient.subscribe('ESCEA-Thermostat')
  mqttclient.subscribe('ESCEA-Thermostat/+')
  mqttclient.subscribe('ESCEA-Thermostat/#')
  
  mqttclient.publish('gateway/connect', "INSIGHT Connected")
//  mqttclient.publish('gateway/publish', "INSIGHT Connected")
})


mqttclient.on('message', function (topic, message) {
  // message is Buffer
  console.log(topic)

  if (topic == "ESCEA-Thermostat/60300/control/control")
  {
      var temp = JSON.parse(message.toString());
      console.log(topic + " state "+ temp.d.State)   
      var controlState = (temp.d.State === 0) ? 0 : 1
      console.log("Control State " + controlState)
      ec.controlfire(fire_serial, 1, controlState);

  }  
  if (topic == "ESCEA-Thermostat/60300/control/settemp")
  {
      var temp = JSON.parse(message.toString()); 
      console.log(topic + " state "+ temp.d.Targettemp) 
      ec.setTemp(fire_serial, temp.d.Targettemp);
  }  
  if (topic == "ESCEA-Thermostat/60300/control/hass")
  {
      var controlState  = message.toString();
      console.log("Control State " + controlState)
      ec.controlfire(fire_serial, 1, controlState);
      mqttclient.publish("ESCEA-Thermostat/"+fire_serial+'/'+'state', controlState);
  }

/*
  if(commandName === "control") {
        console.log("control Off");
        var controlState = 0
        if (pl.d.state == true){controlState = 1}
        //function to be performed for this command
        ec.controlfire(fire_serial, 1, controlState);
 // client.end()
 */
})

var fireState = {Foreeffect:"" , Roomtemp:"", State:"", Targettemp:"" };

var payLoad = new Object()
payLoad.d = fireState


var ec = null

var fire_serial = "urk"
 
function escea() {

  var self = this;
  this.first = true;
  
   self.em  = new events.EventEmitter();
   self.escea_comms = new escea_udp(self.em);
   ec = self.escea_comms
   self.escea_comms.discover();     
  
   self.em.on('Fireplace', function(serial){
          console.log('Found a new Fireplace '+ serial);
          fire_serial = serial
          var lastComms = fireState
          var lastTime = Date.now()
          new escea_switch(serial, self.em, self.escea_comms,fireState);
          new escea_flameeffect(serial, self.em, self.escea_comms);
          new escea_room(serial, self.em);
          new escea_target(serial, self.em);
          self.escea_comms.queryfire(fire_serial); 
          
          self.em.on(fire_serial+'Update', function(v) {
             payLoad.d = v;
             now = new Date()
             currentTime = Date.now()
             
             var comms = { "DEVICE_TYPE" : "ESCEA-Thermostat",
                           "DEVICE_ID"   :  serial, 
                           "DATA"        :  payLoad}
               
              time = Date.now()

              mqttclient.publish(comms.DEVICE_TYPE+'/'+comms.DEVICE_ID+'/'+'status', JSON.stringify(payLoad))
              mqttclient.publish(comms.DEVICE_TYPE+'/'+comms.DEVICE_ID+'/'+'state', payLoad.d.State.toString()) 
              if (JSON.stringify(lastComms) != JSON.stringify(comms)){
                    console.log("Publishing state "+ payLoad.d.State + " - Comms " + now)
                    lastComms  = JSON.parse(JSON.stringify(comms));
                    mqttclient.publish('gateway/publish', JSON.stringify(comms))
                    
              }      
          //   console.log("zero")  
              if (currentTime - lastTime > 300000){
                    console.log("Publishing state "+ payLoad.d.State + " - Time " + now)
                    lastTime = currentTime
                    mqttclient.publish('gateway/publish', JSON.stringify(comms))
                   
               }
                
          })
          
    });
          
   this._interval = setInterval(function() {
        self.escea_comms.discover();     
   },300000);
   this._interval = setInterval(function() {
        self.escea_comms.queryfire(fire_serial);        
   },30000);

    
  
}

escea()



// Export it
module.exports = escea;
