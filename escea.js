
var escea_udp = require('./lib/escea_udp')
  , util = require('util')
  , stream = require('stream')
  , events = require('events');

var mqtt = require('mqtt')
// var mqttclient  = mqtt.connect('mqtt://192.168.0.27')
var mqttclient  = mqtt.connect('mqtt://192.168.0.127')

mqttclient.on('connect', function () {
     mqttclient.subscribe('ESCEA-Thermostat/control/#')
     mqttclient.publish('gateway/connect', "INSIGHT Connected")
//  mqttclient.publish('gateway/publish', "INSIGHT Connected")
})


mqttclient.on('message', function (topic, message) {
  // message is Buffer
  console.log(topic)

  if (topic == "ESCEA-Thermostat/60300/control/control")
  {
      var temp = JSON.parse(message.toString());
//      console.log(topic + " state "+ temp.d.State)
      var controlState = (temp.d.State === 0) ? 0 : 1
      console.log("Control State " + controlState)
      ec.controlfire(fire_serial, 1, controlState);

  }
  if (topic == "ESCEA-Thermostat/60300/control/settemp")
  {
      var temp = message.toString();
      console.log(" Set temperature "+ temp.d.Targettemp)
      ec.setTemp(fire_serial, temp.d.Targettemp);
  }
  if (topic == "ESCEA-Thermostat/60300/control/state")
  {
      var controlState  = message.toString();
      console.log("Control State " + controlState)
      ec.controlfire(fire_serial, 1, controlState);
      mqttclient.publish("ESCEA-Thermostat/"+fire_serial+'/'+'state', controlState);
  }
  if (topic == "ESCEA-Thermostat/60300/control/foreffect")
  {
      var controlState  = message.toString();
      console.log("Foreeffect State " + controlState)
      ec.controlfire(fire_serial, 2, controlState);
      mqttclient.publish("ESCEA-Thermostat/"+fire_serial+'/'+'foreffect', controlState);
  }

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
          self.escea_comms.queryfire(fire_serial);

          self.em.on(fire_serial+'State', function(v) {
               mqttclient.publish("ESCEA-Thermostat"+'/'+fire_serial+'/'+'state', v.toString())
          })
          self.em.on(fire_serial+'Roomtemp', function(v) {
               mqttclient.publish("ESCEA-Thermostat"+'/'+fire_serial+'/'+'roomtemp', v.toString())
          })
          self.em.on(fire_serial+'Targettemp', function(v) {
               mqttclient.publish("ESCEA-Thermostat"+'/'+fire_serial+'/'+'targettemp', v.toString())
          })
          self.em.on(fire_serial+'Foreeffect', function(v) {
               mqttclient.publish("ESCEA-Thermostat"+'/'+fire_serial+'/'+'foreeffect', v.toString())
          })

          self.em.on(fire_serial+'Update', function(payLoad) {

              mqttclient.publish("ESCEA-Thermostat"+'/'+fire_serial+'/'+'status', JSON.stringify(payLoad))
              mqttclient.publish("ESCEA-Thermostat"+'/'+fire_serial+'/'+'state', payLoad.State.toString())
              mqttclient.publish("ESCEA-Thermostat"+'/'+fire_serial+'/'+'foreeffect', payLoad.Foreeffect.toString())
              mqttclient.publish("ESCEA-Thermostat"+'/'+fire_serial+'/'+'roomtemp', payLoad.Roomtemp.toString())
              mqttclient.publish("ESCEA-Thermostat"+'/'+fire_serial+'/'+'targettemp', payLoad.Targettemp.toString())

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
