/**
 * Created by y50-70 on 1/19/2016.
 */


var space_width = 5000,
    space_height = 5000,
    scaleFactor = 1,
    node_width = 100,
    node_height = 30;


var ChartBaseView = Backbone.View.extend({
    el:$("#chart"),
    accept_drag:".palette_node,.palette_symbol",
    initialize:function() {

        var that = this;

        this.outer = d3.select("#chart")
            .append("svg:svg")
            .attr("width", space_width)
            .attr("height", space_height)
            .attr("tabindex", 1)
            .attr("pointer-events", "all")
            .style("cursor", "crosshair")
            .on("mousedown", function () {
                $(this).focus();
            });
        this.vis = this.outer
            .append('svg:g')
            .on("dblclick.zoom", null)
            .append('svg:g')
            .on("mousemove", function () {
                that.canvasMouseMove(this);
            })
            .on("mousedown", function () {
                that.canvasMouseDown(this);
            })
            .on("mouseup", function () {
                that.canvasMouseUp(this);
            })
            .on("touchend", function () {
                clearTimeout(touchStartTime);
                touchStartTime = null;
                if (RED.touch.radialMenu.active()) {
                    return;
                }
                if (lasso) {
                    outer_background.attr("fill", "#fff");
                }
                canvasMouseUp.call(this);
            })
            .on("touchcancel", function () {
                self.canvasMouseUp(this);
            })
            .on("touchstart", function () {
                var touch0;
                if (d3.event.touches.length > 1) {
                    clearTimeout(touchStartTime);
                    touchStartTime = null;
                    d3.event.preventDefault();
                    touch0 = d3.event.touches.item(0);
                    var touch1 = d3.event.touches.item(1);
                    var a = touch0['pageY'] - touch1['pageY'];
                    var b = touch0['pageX'] - touch1['pageX'];

                    var offset = $("#chart").offset();
                    var scrollPos = [$("#chart").scrollLeft(), $("#chart").scrollTop()];
                    startTouchCenter = [
                        (touch1['pageX'] + (b / 2) - offset.left + scrollPos[0]) / scaleFactor,
                        (touch1['pageY'] + (a / 2) - offset.top + scrollPos[1]) / scaleFactor
                    ];
                    moveTouchCenter = [
                        touch1['pageX'] + (b / 2),
                        touch1['pageY'] + (a / 2)
                    ]
                    startTouchDistance = Math.sqrt((a * a) + (b * b));
                } else {
                    var obj = d3.select(document.body);
                    touch0 = d3.event.touches.item(0);
                    var pos = [touch0.pageX, touch0.pageY];
                    startTouchCenter = [touch0.pageX, touch0.pageY];
                    startTouchDistance = 0;
                    var point = d3.touches(this)[0];
                    touchStartTime = setTimeout(function () {
                        touchStartTime = null;
                        showTouchMenu(obj, pos);
                        //lasso = vis.append('rect')
                        //    .attr("ox",point[0])
                        //    .attr("oy",point[1])
                        //    .attr("rx",2)
                        //    .attr("ry",2)
                        //    .attr("x",point[0])
                        //    .attr("y",point[1])
                        //    .attr("width",0)
                        //    .attr("height",0)
                        //    .attr("class","lasso");
                        //outer_background.attr("fill","#e3e3f3");
                    }, touchLongPressTimeout);
                }
            })
            .on("touchmove", function () {
                if (RED.touch.radialMenu.active()) {
                    d3.event.preventDefault();
                    return;
                }
                var touch0;
                if (d3.event.touches.length < 2) {
                    if (touchStartTime) {
                        touch0 = d3.event.touches.item(0);
                        var dx = (touch0.pageX - startTouchCenter[0]);
                        var dy = (touch0.pageY - startTouchCenter[1]);
                        var d = Math.abs(dx * dx + dy * dy);
                        if (d > 64) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                        }
                    } else if (lasso) {
                        d3.event.preventDefault();
                    }
                    canvasMouseMove.call(this);
                } else {
                    touch0 = d3.event.touches.item(0);
                    var touch1 = d3.event.touches.item(1);
                    var a = touch0['pageY'] - touch1['pageY'];
                    var b = touch0['pageX'] - touch1['pageX'];
                    var offset = $("#chart").offset();
                    var scrollPos = [$("#chart").scrollLeft(), $("#chart").scrollTop()];
                    var moveTouchDistance = Math.sqrt((a * a) + (b * b));
                    var touchCenter = [
                        touch1['pageX'] + (b / 2),
                        touch1['pageY'] + (a / 2)
                    ];

                    if (!isNaN(moveTouchDistance)) {
                        oldScaleFactor = scaleFactor;
                        scaleFactor = Math.min(2, Math.max(0.3, scaleFactor + (Math.floor(((moveTouchDistance * 100) - (startTouchDistance * 100))) / 10000)));

                        var deltaTouchCenter = [                             // Try to pan whilst zooming - not 100%
                            startTouchCenter[0] * (scaleFactor - oldScaleFactor),//-(touchCenter[0]-moveTouchCenter[0]),
                            startTouchCenter[1] * (scaleFactor - oldScaleFactor) //-(touchCenter[1]-moveTouchCenter[1])
                        ];

                        startTouchDistance = moveTouchDistance;
                        moveTouchCenter = touchCenter;

                        $("#chart").scrollLeft(scrollPos[0] + deltaTouchCenter[0]);
                        $("#chart").scrollTop(scrollPos[1] + deltaTouchCenter[1]);
                        redraw();
                    }
                }
            });
        this.droppable();
        this.keymap();
    },
    events:{
        'click #btn-zoom-out':"zoomOut",
        'click #btn-zoom-zero':"zoomZero",
        'click #btn-zoom-in':"zoomIn",
        'mousewheel #chart':"",
    },
    droppable: function () {
        var that  = this;
        $(this.el).droppable({
            accept:this.accept_drag,
            drop: function( event, ui ) {

                d3.event = event;
                var selected_tool = ui.draggable[0].type;

                var m = /^subflow:(.+)$/.exec(selected_tool);

                //if (activeSubflow && m) {
                //    var subflowId = m[1];
                //    if (subflowId === activeSubflow.id) {
                //        RED.notify(RED._("notification.error",{message: RED._("notification.errors.cannotAddSubflowToItself")}),"error");
                //        return;
                //    }
                //    if (RED.nodes.subflowContains(m[1],activeSubflow.id)) {
                //        RED.notify(RED._("notification.error",{message: RED._("notification.errors.cannotAddCircularReference")}),"error");
                //        return;
                //    }
                //
                //}

                var mousePos = d3.touches(this)[0]||d3.mouse(this);

                mousePos[1] += this.scrollTop;
                mousePos[0] += this.scrollLeft;
                mousePos[1] /= scaleFactor;
                mousePos[0] /= scaleFactor;

                //var nn = { id:(1+Math.random()*4294967295).toString(16),x: mousePos[0],y:mousePos[1],w:node_width,z:RED.workspaces.active()};
                var def = RED.nodes.getType(selected_tool);
                var newNode  = new NodeModel({
                    type: selected_tool,
                    x: mousePos[0],
                    y: mousePos[1],
                    w:node_width,
                    _def: def,
                });
                that.nodes.add(newNode);
                that.nodeview.moving_set.push(newNode);

                //nn.type = selected_tool;
                //nn._def = RED.nodes.getType(nn.type);


                //if (!m) {
                //    nn.inputs = nn._def.inputs || 0;
                //    nn.outputs = nn._def.outputs;
                //
                //    for (var d in nn._def.defaults) {
                //        if (nn._def.defaults.hasOwnProperty(d)) {
                //            nn[d] = nn._def.defaults[d].value;
                //        }
                //    }
                //
                //    if (nn._def.onadd) {
                //        nn._def.onadd.call(nn);
                //    }
                //} else {
                //    var subflow = RED.nodes.subflow(m[1]);
                //    nn.inputs = subflow.in.length;
                //    nn.outputs = subflow.out.length;
                //}
                //
                //nn.changed = true;
                //nn.h = Math.max(node_height,(nn.outputs||0) * 15);
                //
                //nn.bbox = g.rect(nn.x,nn.y,nn.w,nn.h);
                //
                //containsRect(nn);


                //var historyEvent = {
                //    t:'add',
                //    nodes:[nn.id],
                //    dirty:RED.nodes.dirty()
                //}
                //if (activeSubflow) {
                //    var subflowRefresh = RED.subflow.refresh(true);
                //    if (subflowRefresh) {
                //        historyEvent.subflow = {
                //            id:activeSubflow.id,
                //            changed: activeSubflow.changed,
                //            instances: subflowRefresh.instances
                //        }
                //    }
                //}

                //RED.history.push(historyEvent);
                //RED.nodes.add(nn);
                //RED.editor.validateNode(nn);
                //RED.nodes.dirty(true);
                // auto select dropped node - so info shows (if visible)
                that.clearSelection();
                //nn.selected = true;
                //moving_set.push({n:nn});
                //updateActiveNodes();
                that.updateSelection();


                //redraw();

                //if (def.autoedit) {
                //    RED.editor.edit(nn);
                //}
            }
        });
    },
    keymap: function () {
        var that = this;
        RED.keyboard.add(/* z */ 90,{ctrl:true},function(){RED.history.pop();});
        RED.keyboard.add(/* a */ 65,{ctrl:true},function(){that.selectAll();d3.event.preventDefault();});
        RED.keyboard.add(/* = */ 187,{ctrl:true},function(){that.zoomIn();d3.event.preventDefault();});
        RED.keyboard.add(/* - */ 189,{ctrl:true},function(){that.zoomOut();d3.event.preventDefault();});
        RED.keyboard.add(/* 0 */ 48,{ctrl:true},function(){that.zoomZero();d3.event.preventDefault();});
        RED.keyboard.add(/* v */ 86,{ctrl:true},function(){importNodes(clipboard);d3.event.preventDefault();});
    },
    zoomOut:function(){

    },
    zoomZero: function () {

    },
    zoomIn: function () {

    },
});