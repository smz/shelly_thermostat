// thermostat.js
//
// Copyright (c) 2024 Sergio Manzi
// 
// This script creates a local virtual thermostat (for heating) using Shelly devices.
// By "local" I mean that there is no need for internet/cloud connection, nor integration into any home automation hub.
// The thermostat is meant to run as a script on a Sheely device (tested on a Mini 1 G3) whose relay
// will be used to turn on/off the heating system.
// Besides a Shelly +H&T G3 will be used to measure the ambient temperature.
//
// The implementation is done through the use of three virtual components (possiblly grouped toghether):
//    1) a "boolean" to control the state (ON/OFF) of the virtual thermostat (thermostat_control_component)
//    2) a "number" (slider) used to set the target tmperature (target_t_component)
//    3) a "number" (label) updated by the Shelly +H&T G3 with current ambient temperature (measeured_t_component)
//
// Hysteresis is implemented as a time constant (in seconds) controlling the minimum time chnages of state
//
// On the Shelly +H&T G3 an action must be defined to act on temperature changes:
//      http://<thermostat_IP_address>/rpc/Number.Set?id=<measeured_t_component_ID>&value=$temperature
//          such as:
//      http://192.168.0.100/rpc/Number.Set?id=201&value=$temperature
//
// Schedules can be implemented as local schedules modifying the state of the thermostat_control_component and/or
// the value of the target_t_component.
//
// License:
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice (including the next paragraph)
// shall be included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

 
const thermostat_control_component = "boolean:200";
const target_t_component = "number:200";
const measeured_t_component = "number:201";
const time_hysteresis = 60;

let last_action_time = Shelly.getComponentStatus("sys").uptime - time_hysteresis;
let waiting = false;

function thermostat(reason) {
    thermostat_status = Virtual.getHandle(thermostat_control_component).getValue();
    measured_t = Virtual.getHandle(measeured_t_component).getValue();
    target_t = Virtual.getHandle(target_t_component).getValue();

    print(reason,
	      "- Thermostat is", thermostat_status ? "ON" : "OFF", 
	      ", Measured temperature is", measured_t, "C°",
		  ", Target temperature is", target_t, "C°");

    current_relay_status = Shelly.getComponentStatus("switch:0").output;
    print("Current relay status is", current_relay_status ? "ON" : "OFF");

    new_relay_status = thermostat_status && (target_t > measured_t);

    if (new_relay_status != current_relay_status) {
        print("Turning relay", new_relay_status ? "ON" : "OFF");
        current_time = Shelly.getComponentStatus("sys").uptime;
        elapsed_time = current_time - last_action_time;
        if (elapsed_time >= time_hysteresis) {
            Shelly.call("Switch.Set", {id:0, on:new_relay_status});
            last_action_time = Shelly.getComponentStatus("sys").uptime;
            waiting = false;
        } else {
            if (waiting) {
                print("Already waiting...");
            } else {
                time_to_wait = time_hysteresis - elapsed_time;
                print("Changed to soon: delaying for", time_to_wait, "seconds");
                Timer.set(time_to_wait * 1000, false, thermostat, "Delayed action");
                waiting = true;
            }
         }
    } else {
        print("New relay status == current relay status, skipping");
    }
}

Virtual.getHandle(thermostat_control_component).on("change", function(ev_info){thermostat("Status changed");});

Virtual.getHandle(target_t_component).on("change", function(ev_info){thermostat("Target T changed");});

Virtual.getHandle(measeured_t_component).on("change", function(ev_info){thermostat("Measured T changed");});

thermostat("Initialization");
