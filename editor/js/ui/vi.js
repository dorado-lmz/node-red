/**
 * Created by y50-70 on 1/15/2016.
 */
RED.view = (function() {
    var ChartCanvas = null;

    var
        lasso = null,
        showStatus = false;

    var activeSubflow = null;
    var clickTime = 0;



    function init(){
        ChartCanvas = new ChartView({nodeview:new NodeView(),linkview:new LinkView()});
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
        ChartCanvas.focusView();
    }


    return {
        init: init,
        canvas:function(){
            return ChartCanvas
        },
        state:function(state) {
            if (state == null) {
                return mouse_mode
            } else {
                mouse_mode = state;
            }
        },

        redraw: function(updateActive) {
            //if (updateActive) {
            //    updateActiveNodes();
            //}
            //viewView.render();
        },
        focus: focusView,
        //importNodes: importNodes,
        //status: function(s) {
        //    if (s == null) {
        //        return showStatus;
        //    } else {
        //        showStatus = s;
        //        RED.nodes.eachNode(function(n) { n.dirty = true;});
        //        //TODO: subscribe/unsubscribe here
        //        redraw();
        //    }
        //},
        calculateTextWidth: calculateTextWidth,
        //select: function(selection) {
        //    if (typeof selection !== "undefined") {
        //        clearSelection();
        //        if (typeof selection == "string") {
        //            var selectedNode = RED.nodes.node(selection);
        //            if (selectedNode) {
        //                selectedNode.selected = true;
        //                selectedNode.dirty = true;
        //                moving_set = [{n:selectedNode}];
        //            }
        //        }
        //    }
        //    updateSelection();
        //    redraw();
        //},
        //selection: function() {
        //    var selection = {};
        //    if (moving_set.length > 0) {
        //        selection.nodes = moving_set.map(function(n) { return n.n;});
        //    }
        //    if (selected_link != null) {
        //        selection.link = selected_link;
        //    }
        //    return selection;
        //}
    };
})();