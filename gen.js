function sleep(t){for(var e=(new Date).getTime();;)if((new Date).getTime()-e>t)break}state.console=console;var _m8272d=new state.StateMachine("_m8272d"),_sbadbe=new state.PseudoState("_sbadbe",_m8272d,state.PseudoStateKind.Initial),_s4c103=new state.State("_s4c103",_m8272d).entry(function(t){setTimeout(function(){events.emit("status-changed","_s4c103",{fill:"red",shape:"ring",text:"now..."})},3e3)}).exit(function(t){setTimeout(function(){events.emit("status-changed","_s4c103",{})},3e3)}),_s6f1bb=new state.State("_s6f1bb",_m8272d).entry(function(t){setTimeout(function(){events.emit("status-changed","_s6f1bb",{fill:"red",shape:"ring",text:"now..."})},3e3)}).exit(function(t){setTimeout(function(){events.emit("status-changed","_s6f1bb",{})},3e3)}),_s9d77f=new state.State("_s9d77f",_m8272d).entry(function(t){setTimeout(function(){events.emit("status-changed","_s9d77f",{fill:"red",shape:"ring",text:"now..."})},3e3)}).exit(function(t){setTimeout(function(){events.emit("status-changed","_s9d77f",{})},3e3)});_sbadbe.to(_s4c103),_s4c103.to(_s6f1bb),_s6f1bb.to(_s9d77f);var instance=new state.StateMachineInstance("instance");state.initialise(_m8272d,instance);