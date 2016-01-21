/**
 * Copyright 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
var clone = require("clone");
var redUtil = require("../../util");
var subflowInstanceRE = /^subflow:(.+)$/;
var typeRegistry = require("../registry");
var statejs = require("state.js");
var uglify = require("uglify-js");
var fs = require('fs');
var events = require("../../events");
var comms = require("../../comms");


function diffNodes(oldNode,newNode) {
    if (oldNode == null) {
        return true;
    }
    var oldKeys = Object.keys(oldNode).filter(function(p) { return p != "x" && p != "y" && p != "wires" });
    var newKeys = Object.keys(newNode).filter(function(p) { return p != "x" && p != "y" && p != "wires" });
    if (oldKeys.length != newKeys.length) {
        return true;
    }
    for (var i=0;i<newKeys.length;i++) {
        var p = newKeys[i];
        if (!redUtil.compareObjects(oldNode[p],newNode[p])) {
            return true;
        }
    }

    return false;
}
events.on('status-changed',function(state_id,style) {
    chageStatus(state_id,style);
});

var chageStatus = function(state_id,style){
    console.log(state_id);
    var id = state_id.substring(2);
    var node = getNode(id);
    comms.publish("status/" + node.id, style, true);

  //  setTimeout(function(){comms.publish("status/" + node.id, {}, true);},Math.random()*10000);
    //new Node(node).status({fill:"red",shape:"ring",text:"now..."});
};

var getNode = function (id) {
    var node;

    for (var flowId in flow.flows) {
        if (flow.flows.hasOwnProperty(flowId)) {
            var nodes = flow.flows[flowId].nodes;
            for(var index in nodes){
                if(nodes[index].id.indexOf(id)!=-1){
                    node = nodes[index];
                }
            }

            //node = flow.flows[flowId].nodes[id];
            if (node) {
                return node;
            }
        }
    }
    return null;
};
var flow = {};
module.exports = {

    diffNodes: diffNodes,

    parseConfig: function(config) {

        flow.allNodes = {};
        flow.subflows = {};
        flow.configs = {};
        flow.flows = {};
        flow.missingTypes = [];

        config.forEach(function(n) {
            flow.allNodes[n.id] = clone(n);
            if (n.type === 'tab') {
                flow.flows[n.id] = n;
                flow.flows[n.id].subflows = {};
                flow.flows[n.id].configs = {};
                flow.flows[n.id].nodes = {};
            }
        });

        config.forEach(function(n) {
            if (n.type === 'subflow') {
                flow.subflows[n.id] = n;
                flow.subflows[n.id].configs = {};
                flow.subflows[n.id].nodes = {};
                flow.subflows[n.id].instances = [];
            }
        });

        config.forEach(function(n) {
            if (n.type !== 'subflow' && n.type !== 'tab') {
                var subflowDetails = subflowInstanceRE.exec(n.type);

                if ( (subflowDetails && !flow.subflows[subflowDetails[1]]) || (!subflowDetails && !typeRegistry.get(n.type)) ) {
                    if (flow.missingTypes.indexOf(n.type) === -1) {
                        flow.missingTypes.push(n.type);
                    }
                } else {
                    var container = null;
                    if (flow.flows[n.z]) {
                        container = flow.flows[n.z];
                    } else if (flow.subflows[n.z]) {
                        container = flow.subflows[n.z];
                    }
                    if (n.hasOwnProperty('x') && n.hasOwnProperty('y')) {
                        if (subflowDetails) {
                            var subflowType = subflowDetails[1]
                            n.subflow = subflowType;
                            flow.subflows[subflowType].instances.push(n)
                        }
                        if (container) {
                            container.nodes[n.id] = n;
                        }
                    } else {
                        if (container) {
                            container.configs[n.id] = n;
                        } else {
                            flow.configs[n.id] = n;
                            flow.configs[n.id]._users = [];
                        }
                    }
                }
            }
        });
        config.forEach(function(n) {
            if (n.type !== 'subflow' && n.type !== 'tab') {
                for (var prop in n) {
                    if (n.hasOwnProperty(prop) && prop !== 'id' && prop !== 'wires' && prop !== '_users' && flow.configs[n[prop]]) {
                        // This property references a global config node
                        flow.configs[n[prop]]._users.push(n.id)
                    }
                }
            }
        });

        return flow;
    },

    diffConfigs: function(oldConfig, newConfig) {
        var id;
        var node;
        var nn;
        var wires;
        var j,k;

        var changedSubflows = {};

        var added = {};
        var removed = {};
        var changed = {};
        var wiringChanged = {};

        var linkMap = {};

        for (id in oldConfig.allNodes) {
            if (oldConfig.allNodes.hasOwnProperty(id)) {
                node = oldConfig.allNodes[id];
                // build the map of what this node was previously wired to
                if (node.wires) {
                    linkMap[node.id] = linkMap[node.id] || [];
                    for (j=0;j<node.wires.length;j++) {
                        wires = node.wires[j];
                        for (k=0;k<wires.length;k++) {
                            linkMap[node.id].push(wires[k]);
                            nn = oldConfig.allNodes[wires[k]];
                            if (nn) {
                                linkMap[nn.id] = linkMap[nn.id] || [];
                                linkMap[nn.id].push(node.id);
                            }
                        }
                    }
                }
                // This node has been removed
                if (!newConfig.allNodes.hasOwnProperty(id)) {
                    removed[id] = node;
                    // Mark the container as changed
                    if (newConfig.allNodes[removed[id].z]) {
                        changed[removed[id].z] = newConfig.allNodes[removed[id].z];
                        if (changed[removed[id].z].type === "subflow") {
                            changedSubflows[removed[id].z] = changed[removed[id].z];
                            delete removed[id];
                        }
                    }
                } else {
                    // This node has a material configuration change
                    if (diffNodes(node,newConfig.allNodes[id]) || newConfig.allNodes[id].credentials) {
                        changed[id] = newConfig.allNodes[id];
                        if (changed[id].type === "subflow") {
                            changedSubflows[id] = changed[id];
                        }
                        // Mark the container as changed
                        if (newConfig.allNodes[changed[id].z]) {
                            changed[changed[id].z] = newConfig.allNodes[changed[id].z];
                            if (changed[changed[id].z].type === "subflow") {
                                changedSubflows[changed[id].z] = changed[changed[id].z];
                                delete changed[id];
                            }
                        }
                    }
                    // This node's wiring has changed
                    if (!redUtil.compareObjects(node.wires,newConfig.allNodes[id].wires)) {
                        wiringChanged[id] = newConfig.allNodes[id];
                        // Mark the container as changed
                        if (newConfig.allNodes[wiringChanged[id].z]) {
                            changed[wiringChanged[id].z] = newConfig.allNodes[wiringChanged[id].z];
                            if (changed[wiringChanged[id].z].type === "subflow") {
                                changedSubflows[wiringChanged[id].z] = changed[wiringChanged[id].z];
                                delete wiringChanged[id];
                            }
                        }
                    }
                }
            }
        }
        // Look for added nodes
        for (id in newConfig.allNodes) {
            if (newConfig.allNodes.hasOwnProperty(id)) {
                node = newConfig.allNodes[id];
                // build the map of what this node is now wired to
                if (node.wires) {
                    linkMap[node.id] = linkMap[node.id] || [];
                    for (j=0;j<node.wires.length;j++) {
                        wires = node.wires[j];
                        for (k=0;k<wires.length;k++) {
                            if (linkMap[node.id].indexOf(wires[k]) === -1) {
                                linkMap[node.id].push(wires[k]);
                            }
                            nn = newConfig.allNodes[wires[k]];
                            if (nn) {
                                linkMap[nn.id] = linkMap[nn.id] || [];
                                if (linkMap[nn.id].indexOf(node.id) === -1) {
                                    linkMap[nn.id].push(node.id);
                                }
                            }
                        }
                    }
                }
                // This node has been added
                if (!oldConfig.allNodes.hasOwnProperty(id)) {
                    added[id] = node;
                    // Mark the container as changed
                    if (newConfig.allNodes[added[id].z]) {
                        changed[added[id].z] = newConfig.allNodes[added[id].z];
                        if (changed[added[id].z].type === "subflow") {
                            changedSubflows[added[id].z] = changed[added[id].z];
                            delete added[id];
                        }
                    }
                }
            }
        }

        for (id in newConfig.allNodes) {
            if (newConfig.allNodes.hasOwnProperty(id)) {
                node = newConfig.allNodes[id];
                for (var prop in node) {
                    if (node.hasOwnProperty(prop) && prop != "z" && prop != "id" && prop != "wires") {
                        // This node has a property that references a changed/removed node
                        // Assume it is a config node change and mark this node as
                        // changed.
                        if (changed[node[prop]] || removed[node[prop]]) {
                            if (!changed[node.id]) {
                                changed[node.id] = node;
                                if (newConfig.allNodes[node.z]) {
                                    changed[node.z] = newConfig.allNodes[node.z];
                                    if (changed[node.z].type === "subflow") {
                                        changedSubflows[node.z] = changed[node.z];
                                        delete changed[node.id];
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }


        // Recursively mark all instances of changed subflows as changed
        var changedSubflowStack = Object.keys(changedSubflows);
        while(changedSubflowStack.length > 0) {
            var subflowId = changedSubflowStack.pop();
            for (id in newConfig.allNodes) {
                if (newConfig.allNodes.hasOwnProperty(id)) {
                    node = newConfig.allNodes[id];
                    if (node.type === 'subflow:'+subflowId) {
                        if (!changed[node.id]) {
                            changed[node.id] = node;
                            if (!changed[changed[node.id].z] && newConfig.allNodes[changed[node.id].z]) {
                                changed[changed[node.id].z] = newConfig.allNodes[changed[node.id].z];
                                if (newConfig.allNodes[changed[node.id].z].type === "subflow") {
                                    // This subflow instance is inside a subflow. Add the
                                    // containing subflow to the stack to mark
                                    changedSubflowStack.push(changed[node.id].z);
                                    delete changed[node.id];
                                }
                            }
                        }
                    }
                }
            }
        }

        var diff = {
            added:Object.keys(added),
            changed:Object.keys(changed),
            removed:Object.keys(removed),
            rewired:Object.keys(wiringChanged),
            linked:[]
        }

        // Traverse the links of all modified nodes to mark the connected nodes
        var modifiedNodes = diff.added.concat(diff.changed).concat(diff.removed).concat(diff.rewired);
        var visited = {};
        while(modifiedNodes.length > 0) {
            node = modifiedNodes.pop();
            if (!visited[node]) {
                visited[node] = true;
                if (linkMap[node]) {
                    if (!changed[node] && !added[node] && !removed[node] && !wiringChanged[node]) {
                        diff.linked.push(node);
                    }
                    modifiedNodes = modifiedNodes.concat(linkMap[node]);
                }
            }
        }
        // for (id in newConfig.allNodes) {
        //     console.log(
        //         (added[id]?"+":(changed[id]?"!":" "))+(wiringChanged[id]?"w":" ")+(diff.linked.indexOf(id)!==-1?"~":" "),
        //         id,
        //         newConfig.allNodes[id].type,
        //         newConfig.allNodes[id].name||newConfig.allNodes[id].label||""
        //     );
        // }
        // for (id in removed) {
        //     console.log(
        //         "- "+(diff.linked.indexOf(id)!==-1?"~":" "),
        //         id,
        //         oldConfig.allNodes[id].type,
        //         oldConfig.allNodes[id].name||oldConfig.allNodes[id].label||""
        //     );
        // }

        return diff;
    },

    generateCode:function(config){

        var stateMachine = {};
        stateMachine.allStates = {};
        stateMachine.allTransition = {};
        stateMachine.flows = {};

        var flows = config.flows;

        for(var prop in flows){
            if(flows.hasOwnProperty(prop)){
                var flow = flows[prop];
                stateMachine.flows[prop] = flow;
                flow.model = {
                    name:'_m'+prop.substring(0,5),
                    code:function(){return 'var '+this.name+'=new state.StateMachine("'+ this.name +'");';}
                };
                flow.states = {};
                flow.transitions = {};
                for(var key in flow.nodes){

                    var node = flow.nodes[key];

                    if(node.type.indexOf('state')!=-1){
                        stateMachine.allStates[node.id] = node;
                        switch (node.type){
                            case 'state':
                                node.varname = this.genVarName(node);
                                node.code = 'var '+ node.varname+'=new state.State("'+node.varname+'",'+flow.model.name+');';
                                break;
                            case 'end_state':
                                node.varname = this.genVarName(node);
                                node.code = 'var '+ node.varname+'=new state.State("'+node.varname+'",'+flow.model.name+');';
                                break;
                            case 'start_state':
                                node.varname = this.genVarName(node);
                                node.code = 'var '+ node.varname +'=new state.PseudoState("'+node.varname+'",'+flow.model.name+',state.PseudoStateKind.Initial);';
                                node.start = true;
                                break;

                        }
                        flow.states[node.id] = node;

                    }
                }
                var states = flow.states;
                for(var prop in states) {
                    var node;
                    if (states.hasOwnProperty(prop)) {
                        var state = states[prop];
                        var numOutputs = state.wires.length;
                        if(numOutputs>0){
                            for (var i = 0; i < numOutputs; i++) {
                                var wires = state.wires[i];
                                for (var j = 0; j < wires.length; j++) {
                                    node = stateMachine.allStates[wires[j]];
                                    if(node){
                                        var trasition = {
                                            start:prop,
                                            end:node.id,
                                            'guard-condition':'',
                                            event:'',
                                            action:[],
                                            code:state.varname+'.to'+'('+node.varname+');'
                                        };
                                        stateMachine.allTransition[prop +'-'+ node.id] = trasition;
                                        flow.transitions[prop +'-'+ node.id] = trasition;
                                    }
                                }
                            }
                        }
                    }
                }


            }
        }

    //    console.log(stateMachine.allStates);
      //  console.log(stateMachine.allTransition);

        this.runCode(stateMachine);
    },

    runCode:function(stateMachine){
        var header = 'state.console = console;';
        var stateAnnounce = '';
        var trasitionAnnouce = '';
        var exec = '';
        var code;
        for(var prop in stateMachine.flows) {
            var flow;
            if (stateMachine.flows.hasOwnProperty(prop)) {
                flow = stateMachine.flows[prop];
                var states = flow.states;
               
                var transitions = flow.transitions;

                stateAnnounce += flow.model.code();
                for(var prop in states) {
                    var state;
                    if (states.hasOwnProperty(prop)) {
                        state = states[prop];
                        code = state.code;
                        if(!state.start){
                            if(code.charAt(code.length-1) === ';'){
                                code = code.substring(0,code.length-1);
                            }
                            var entry = this.createEntryAction(this.genVarName(state));
                            var exit = this.createExitAction(this.genVarName(state));

                            code += '.entry('+entry.toString() + ')';
                            code += '.exit('+exit.toString()+');';
                        }

                        stateAnnounce += code;
                    }
                }

                for(var prop in transitions) {
                    var transition;
                    if (transitions.hasOwnProperty(prop)) {
                        transition = transitions[prop].code;

                        //if(transition.charAt(transition.length-1) === ';'){
                        //    transition = transition.substring(0,transition.length-1);
                        //}

                     //   var action = this.createAction(transitions[prop].end);

                     //   transition += '.effect('+action.toString() + ');';
                        trasitionAnnouce += transition;

                    }
                }

            }
            exec += 'var instance = new state.StateMachineInstance("instance");';
            exec += 'state.initialise('+flow.model.name+', instance);';
//            exec += 'state.evaluate('+flow.model.name+', instance, "move");';

            code = header+stateAnnounce+trasitionAnnouce+exec;
            console.log(code);



            code += "function sleep(n) {var start = new Date().getTime();while(true)  if(new Date().getTime()-start > n) break;};";



            console.log(uglify.minify(code,{fromString: true}).code);

            fs.writeFile('gen.js',uglify.minify(code,{fromString: true}).code);
            new Function('state','events',uglify.minify(code,{fromString: true}).code)(statejs,events);

        }

    },


    //TODO:will delete after statejs
    createEntryAction:function(stateId){
        console.log(stateId);
        console.log(1111);
        return 'function (message) {setTimeout(function(){events.emit("status-changed","'+stateId+'",{fill:"red",shape:"ring",text:"now..."});},3000);}'

    },
    createExitAction:function(stateId){
        console.log(stateId);
        return 'function (message) {setTimeout(function(){events.emit("status-changed","'+stateId+'",{});},3000);}'

    },


    genVarName: function (node) {
        var name = '';
        if(node.name && node.name.lengh>0){
            name +=  node.name;
        }else{
            name += '_s';
        }

        name += node.id.substring(0,5);

        return name;

    },


    then:function(callback){

    }
}
