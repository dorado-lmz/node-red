/**
 * Created by lmz on 16/4/16.
 */

RED.view = (function() {
    var space_width = 5000,
        space_height = 5000,
        scaleFactor = 1,
        node_width = 100,
        node_height = 30;

    var nameMapModel = {
      end_state:org.dedu.draw.shape.uml.EndState,
      start_state:org.dedu.draw.shape.uml.StartState,
      state:org.dedu.draw.shape.uml.State
    };

    var graph = new org.dedu.draw.Graph;



    function getModelByName(){
        "use strict";

    }

    function init() {
        var chart = new org.dedu.draw.Chart({
            el: $('#chart'),
            width: 5000,
            height: 5000,
            tabindex: 1,
            gridSize: 1,
            model: graph,
            style: {}
        });
        droppable($('#chart'));
    }

    function droppable ($el) {
        var that  = this;
        $el.droppable({
            accept:this.accept_drag,
            drop: function( event, ui ) {

                d3.event = event;
                var selected_tool = ui.draggable[0].type;

                var m = /^subflow:(.+)$/.exec(selected_tool);

                var mousePos = d3.touches(this)[0]||d3.mouse(this);

                mousePos[1] += this.scrollTop;
                mousePos[0] += this.scrollLeft;
                mousePos[1] /= scaleFactor;
                mousePos[0] /= scaleFactor;

                var def = RED.nodes.getType(selected_tool);
                console.log(def);

                //TODO:校验node_name是否存在
                var node_name = def.set.name;

                graph.addCell(new nameMapModel[node_name]({
                    position: { x: mousePos[0], y: mousePos[1] },
                    size: { width: def.w, height: def.h }
                }));


            }
        });
    }

    function calculateTextWidth(str, className, offset) {
        var sp = document.createElement("span");
        sp.className = className;
        sp.style.position = "absolute";
        sp.style.top = "-1000px";
        sp.innerHTML = (str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        document.body.appendChild(sp);
        var w = sp.offsetWidth;
        document.body.removeChild(sp);
        return offset+w;
    }

    function focusView() {
      
    }

    return {
        init:init,
        calculateTextWidth: calculateTextWidth,
        focus: focusView,
    }

})();