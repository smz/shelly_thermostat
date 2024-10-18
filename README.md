This script creates a local virtual thermostat (for heating) using Shelly devices.
By "local" I mean that there is no need for internet/cloud connection, nor integration into any home automation hub.
The thermostat is meant to run as a script on a Sheely device (tested on a Mini 1 G3) whose relay
will be used to turn on/off the heating system.
Besides a Shelly +H&T G3 will be used to measure the ambient temperature.

The implementation is done through the use of three virtual components (possiblly grouped toghether):
   1) a "boolean" to control the state (ON/OFF) of the virtual thermostat (thermostat_control_component)
   2) a "number" (slider) used to set the target tmperature (target_t_component)
   3) a number (label) updated by the Shelly +H&T G3 with current ambient temperature (measeured_t_component)

Hysteresis is implemented as a time constant (in seconds) controlling the minimum time chnages of state

On the Shelly +H&T G3 an action must be defined to act on temperature changes:
     http://<thermostat_IP_address>/rpc/Number.Set?id=<measeured_t_component_ID>&value=$temperature
         such as:
     http://192.168.0.100/rpc/Number.Set?id=201&value=$temperature

Schedules can be implemented as local schedules modifying the state of the thermostat_control_component and/or
the value of the target_t_component.
