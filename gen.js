state.console=console;var _m1611e=new state.StateMachine("_m1611e"),_sbfb4c=new state.State("_sbfb4c",_m1611e),_sbfbc7=new state.PseudoState("_sbfbc7",_m1611e,state.PseudoStateKind.Initial);_sbfbc7.to(_sbfb4c).effect(function(e){console.log(e),console.log("********************")});var instance=new state.StateMachineInstance("instance");state.initialise(_m1611e,instance);