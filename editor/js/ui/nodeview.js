/**
 * Created by y50-70 on 1/19/2016.
 */
var NodeModel = Backbone.Model.extend({
    defaults:{
        id:'',
        type:'',
        _def:{},
        x:0,
        y:0,
        z:0,
        inputs:0,
        outputs:0,
        w:0,
        h:0,
        bbox:{},
        dirty:true,
        selected:true,
        highlighted:false,
        status:false,

    },
    initialize:function(){
        this.set({id:(1+Math.random()*4294967295).toString(16),z:RED.workspaces.active()});
        var def = this.get('_def');
        this.set({
            inputs:def.inputs || 0,
            outputs:def.outputs || 0
        });
        this.set({h:Math.max(node_height,(def.outputs||0) * 15)});
        this.set({
            bbox:g.rect(this.get('x'),this.get('y'),this.get('w'),this.get('h'))
        });
        for (var d in def.defaults) {
            if (def.defaults.hasOwnProperty(d)) {
                this[d] = def.defaults[d].value;
            }
        }
        for(var d in this.attributes){
            if (this.attributes.hasOwnProperty(d)) {
                this[d] = this.attributes[d];
            }
        }

    }
});

var NodeList = Backbone.Collection.extend({
    model:NodeModel,
});


var showStatus = false;

var NodeView = Backbone.View.extend({
    moving_set:[],
    mouse_mode: 0,
    mousedown_link:null,
    mousedown_node:null,
    lasso:null,
    initialize:function(){
        _.bindAll(this,"nodeMouseDown","nodeMouseUp");
        this.nodelist = new NodeList();
        this.listenTo(this.nodelist, 'add', this.addView);
    },
    addView:function(){
        var that = this;
        var lasso = this.lasso;
        var node = RED.view.canvas().vis.selectAll(".nodegroup").data(this.nodelist.models,function(d){return d.get('id')});

        node.exit().remove();

        var nodeEnter = node.enter().insert("svg:g").attr("class", "node nodegroup");

        nodeEnter.each(function(d,i) {
            d._def = d.get('_def');
            var node = d3.select(this);
            var vnode =  V(this);
            node.attr("id",d.get('id'));
            var l = d.get('label');
            l = (typeof l === "function" ? l.call(d.defaults) : l)||"";

            if(d._def.markup){
                d.w = d._def.w;
                d.h = d._def.h;
                d.circle = true;

            }else{
                d.w = Math.max(node_width,RED.view.calculateTextWidth(l, "node_label", 50)+(d._def.inputs>0?7:0) );
                d.h = Math.max(node_height,(d.outputs||0) * 15);
            }

            if (d._def.badge) {
                var badge = node.append("svg:g").attr("class","node_badge_group");
                var badgeRect = badge.append("rect").attr("class","node_badge").attr("rx",5).attr("ry",5).attr("width",40).attr("height",15);
                badge.append("svg:text").attr("class","node_badge_label").attr("x",35).attr("y",11).attr('text-anchor','end').text(d._def.badge());
                if (d._def.onbadgeclick) {
                    badgeRect.attr("cursor","pointer")
                        .on("click",function(d) { d._def.onbadgeclick.call(d);d3.event.preventDefault();});
                }
            }

            if (d._def.button) {
                var nodeButtonGroup = node.append('svg:g')
                    .attr("transform",function(d) { return "translate("+((d._def.align == "right") ? 94 : -25)+",2)"; })
                    .attr("class",function(d) { return "node_button "+((d._def.align == "right") ? "node_right_button" : "node_left_button"); });
                nodeButtonGroup.append('rect')
                    .attr("rx",5)
                    .attr("ry",5)
                    .attr("width",32)
                    .attr("height",node_height-4)
                    .attr("fill","#eee");//function(d) { return d._def.color;})
                nodeButtonGroup.append('rect')
                    .attr("class","node_button_button")
                    .attr("x",function(d) { return d._def.align == "right"? 11:5})
                    .attr("y",4)
                    .attr("rx",4)
                    .attr("ry",4)
                    .attr("width",16)
                    .attr("height",node_height-12)
                    .attr("fill",function(d) { return d._def.color;})
                    .attr("cursor","pointer")
                    .on("mousedown",function(d) {if (!lasso && !d.changed) {RED.view.canvas().focusView();d3.select(this).attr("fill-opacity",0.2);d3.event.preventDefault(); d3.event.stopPropagation();}})
                    .on("mouseup",function(d) {if (!lasso && !d.changed) { d3.select(this).attr("fill-opacity",0.4);d3.event.preventDefault();d3.event.stopPropagation();}})
                    .on("mouseover",function(d) {if (!lasso && !d.changed) { d3.select(this).attr("fill-opacity",0.4);}})
                    .on("mouseout",function(d) {if (!lasso  && !d.changed) {
                        var op = 1;
                        if (d._def.button.toggle) {
                            op = d[d._def.button.toggle]?1:0.2;
                        }
                        d3.select(this).attr("fill-opacity",op);
                    }})
                    .on("click",that.nodeButtonClicked)
                    .on("touchstart",that.nodeButtonClicked)
            }

            RED.view.canvas().insertDebugRect('box'+ d.id.substring(0,5));

            if(d._def.markup){
                vnode.append(V(d._def.markup));
            }else{
                vnode.append(V("rect",{class:'node',rx:5,ry:5,fill: d._def.color}).toggleClass("node_unknown",d.type == "unknown"));
            }

            var main = node.select('.node');
            //node.style("cursor","se-resize");
            //
            //    .on("mousemove",function(d){
            //    if(d.resize){
            //        d.w = d.w + d3.event.clientX - d.grabx;
            //        d.h = d.h + d3.event.clientY - d.graby;
            //        d.dirty = true;
            //        redraw();
            //    }
            //
            //
            //}).on("mouseup",function(){
            //    d.resize = false;
            //
            //});

            main.on("mouseup", function (d) {
                    that.nodeMouseUp(d,this)
                })
                .on("mousedown", function (d) {
                    that.nodeMouseDown(d,this);
                })
                .on("touchstart", function (d) {
                    //var obj = d3.select(this);
                    //var touch0 = d3.event.touches.item(0);
                    //var pos = [touch0.pageX,touch0.pageY];
                    //startTouchCenter = [touch0.pageX,touch0.pageY];
                    //startTouchDistance = 0;
                    //touchStartTime = setTimeout(function() {
                    //    showTouchMenu(obj,pos);
                    //},touchLongPressTimeout);
                    //nodeMouseDown.call(this,d)
                })
                .on("touchend", function(d) {
                    //clearTimeout(touchStartTime);
                    //touchStartTime = null;
                    //if  (RED.touch.radialMenu.active()) {
                    //    d3.event.stopPropagation();
                    //    return;
                    //}
                    //nodeMouseUp.call(this,d);
                })
                .on("mouseover",function(d) {

                    if (this.mouse_mode === 0) {
                        var node = d3.select(this);
                        node.classed("node_hovered",true);
                    }
                })
                .on("mouseout",function(d) {
                    var node = d3.select(this);
                    node.classed("node_hovered",false);
                })
                .on("mousemove", function (d) {
                    var position = d3.mouse(RED.view.canvas().vis.node());
                    if (Math.abs(position[0] - d.get('w') - d.get('x')) < 10 && Math.abs(position[1] - d.get('h') - d.get('y')) < 10) {
                        d3.select(this).style("cursor", "se-resize");
                    } else {
                        //mouse_mode = RED.state.MOVING_ACTIVE;
                        d3.select(this).style("cursor", "move");
                    }

                    //console.log(position);
                });

            //node.append("rect").attr("class", "node-gradient-top").attr("rx", 6).attr("ry", 6).attr("height",30).attr("stroke","none").attr("fill","url(#gradient-top)").style("pointer-events","none");
            //node.append("rect").attr("class", "node-gradient-bottom").attr("rx", 6).attr("ry", 6).attr("height",30).attr("stroke","none").attr("fill","url(#gradient-bottom)").style("pointer-events","none");

            if (d._def.icon &&  d.type!=='state') {

                var icon_group = node.append("g")
                    .attr("class","node_icon_group")
                    .attr("x",0).attr("y",0);

                var icon_shade = icon_group.append("rect")
                    .attr("x",0).attr("y",0)
                    .attr("class","node_icon_shade")
                    .attr("width","30")
                    .attr("stroke","none")
                    .attr("fill","#000")
                    .attr("fill-opacity","0.05")
                    .attr("height",function(d){return Math.min(50,d.h-4);});

                var icon = icon_group.append("image")
                    .attr("xlink:href","icons/"+d._def.icon)
                    .attr("class","node_icon")
                    .attr("x",0)
                    .attr("width","30")
                    .attr("height","30");

                var icon_shade_border = icon_group.append("path")
                    .attr("d",function(d) { return "M 30 1 l 0 "+(d.h-2)})
                    .attr("class","node_icon_shade_border")
                    .attr("stroke-opacity","0.1")
                    .attr("stroke","#000")
                    .attr("stroke-width","1");

                if ("right" == d._def.align) {
                    icon_group.attr('class','node_icon_group node_icon_group_'+d._def.align);
                    icon_shade_border.attr("d",function(d) { return "M 0 1 l 0 "+(d.h-2)})
                    //icon.attr('class','node_icon node_icon_'+d._def.align);
                    //icon.attr('class','node_icon_shade node_icon_shade_'+d._def.align);
                    //icon.attr('class','node_icon_shade_border node_icon_shade_border_'+d._def.align);
                }

                //if (d.inputs > 0 && d._def.align == null) {
                //    icon_shade.attr("width",35);
                //    icon.attr("transform","translate(5,0)");
                //    icon_shade_border.attr("transform","translate(5,0)");
                //}
                //if (d._def.outputs > 0 && "right" == d._def.align) {
                //    icon_shade.attr("width",35); //icon.attr("x",5);
                //}

                var img = new Image();
                img.src = "icons/"+d._def.icon;
                img.onload = function() {
                    icon.attr("width",Math.min(img.width,30));
                    icon.attr("height",Math.min(img.height,30));
                    icon.attr("x",15-Math.min(img.width,30)/2);
                    //if ("right" == d._def.align) {
                    //    icon.attr("x",function(d){return d.w-img.width-1-(d.outputs>0?5:0);});
                    //    icon_shade.attr("x",function(d){return d.w-30});
                    //    icon_shade_border.attr("d",function(d){return "M "+(d.w-30)+" 1 l 0 "+(d.h-2);});
                    //}
                }

                //icon.style("pointer-events","none");
                icon_group.style("pointer-events","none");
            }
            var text = node.append('svg:text').attr('class','node_label').attr('x', 38).attr('dy', '.35em').attr('text-anchor','start');
            if (d._def.align) {
                text.attr('class','node_label node_label_'+d._def.align);
                if (d._def.align === "right") {
                    text.attr('text-anchor','end');
                }
            }

            var status = node.append("svg:g").attr("class","node_status_group").style("display","none");

            var statusRect = status.append("rect").attr("class","node_status")
                .attr("x",6).attr("y",1).attr("width",9).attr("height",9)
                .attr("rx",2).attr("ry",2).attr("stroke-width","3");

            var statusLabel = status.append("svg:text")
                .attr("class","node_status_label")
                .attr('x',20).attr('y',9);

            //node.append("circle").attr({"class":"centerDot","cx":0,"cy":0,"r":5});

            //node.append("path").attr("class","node_error").attr("d","M 3,-3 l 10,0 l -5,-8 z");
            node.append("image").attr("class","node_error hidden").attr("xlink:href","icons/node-error.png").attr("x",0).attr("y",-6).attr("width",10).attr("height",9);
            node.append("image").attr("class","node_changed hidden").attr("xlink:href","icons/node-changed.png").attr("x",12).attr("y",-6).attr("width",10).attr("height",10);
            node.select('.node_changed').on("mousedown",function(d) {
                mousedown_node = d;
                d.grabx = d3.event.clientX;
                d.graby = d3.event.clientY;
                mouse_mode = RED.state.RESIZE;
            });

        });

        this.render();

    },
    render: function () {
        var that = this;

        var node = RED.view.canvas().vis.selectAll(".nodegroup");

        node.each(function(d,i) {
            console.log(d);
            d.bbox = d.get('bbox');
            d._def = d.get('_def');
            d['_'] = d._def._;

            if(d.parentNode){
                if(isHiddenParentNode({id:d.parentNode})){
                    d3.select(this).attr("display",'none');
                    d.hidden = true;
                }else if(d.hidden){
                    d.hidden = false;
                    d3.select(this).attr("display",'block');
                }
            }

            if (d.dirty) {
                //dirtyNodes[d.id] = d;
                //if (d.x < -50) deleteSelection();  // Delete nodes if dragged back to palette
                if (d.resize) {
                    var l = d._def.label;
                    l = (typeof l === "function" ? l.call(d) : l)||"";
                    d.w = Math.max(node_width,calculateTextWidth(l, "node_label", 50)+(d._def.inputs>0?7:0) );
                    d.h = Math.max(node_height,(d.outputs||0) * 15);
                    d.resize = false;
                }
                var thisNode = d3.select(this);

                //thisNode.selectAll(".centerDot").attr({"cx":function(d) { return d.w/2;},"cy":function(d){return d.h/2}});
                //thisNode.attr("transform", function() { return "translate(" + (d.x-d.w/2) + "," + (d.y-d.h/2) + ")"; });
                that.translate(thisNode,d);
                that.nodeViewUpdate(d,thisNode);

                if (!showStatus || !d.status) {
                    thisNode.selectAll('.node_status_group').style("display","none");
                } else {
                    thisNode.selectAll('.node_status_group').style("display","inline").attr("transform","translate(3,"+(d.h+3)+")");
                    var fill = status_colours[d.status.fill]; // Only allow our colours for now
                    if (d.status.shape == null && fill == null) {
                        thisNode.selectAll('.node_status').style("display","none");
                    } else {
                        var style;
                        if (d.status.shape == null || d.status.shape == "dot") {
                            style = {
                                display: "inline",
                                fill: fill,
                                stroke: fill
                            };
                        } else if (d.status.shape == "ring" ){
                            style = {
                                display: "inline",
                                fill: '#fff',
                                stroke: fill
                            }
                        }
                        thisNode.selectAll('.node_status').style(style);
                    }
                    if (d.status.text) {
                        thisNode.selectAll('.node_status_label').text(d.status.text);
                    } else {
                        thisNode.selectAll('.node_status_label').text("");
                    }
                }

                d.dirty = false;
            }

            RED.view.canvas().vis.select("#box"+ d.id.substring(0,5)).attr('fill','none').attr('stroke-width',3).attr('stroke','red').attr("x", d.circle?d.bbox.x- d.w/2:d.bbox.x).attr('y', d.circle? d.bbox.y- d.h/2:d.bbox.y).attr('width', d.w).attr('height', d.h);
        });

    },
    translate: function (thisNode,d) {

        //当处于RED.state.MOVING时，node不可以move
        //处于RED.state.MOVING时，只有判断偏移量大于阈值时，进入RED.state.MOVING_ACTIVE时，才可以move
        if (this.mouse_mode != RED.state.MOVING) {
            thisNode.attr("transform", function () {
                return "translate(" + (d.x + (d.mouseoffsetx | 0)) + "," + (d.y + (d.mouseoffsety | 0)) + ")";
            });
        }
    },
    nodeViewUpdate: function (d,thisNode) {
        //当node在移动时，不改变样式
        if (this.mouse_mode != RED.state.MOVING_ACTIVE) {
            thisNode.selectAll(".node")
                .attr("width",function(d){return d.w})
                .attr("height",function(d){return d.h})
                .classed("node_selected",function(d) { return d.selected; })
                .classed("node_highlighted",function(d) { return d.highlighted; });
            //thisNode.selectAll(".node-gradient-top").attr("width",function(d){return d.w});
            //thisNode.selectAll(".node-gradient-bottom").attr("width",function(d){return d.w}).attr("y",function(d){return d.h-30});

            thisNode.selectAll(".node_icon_group_right").attr('transform', function(d){return "translate("+(d.w-30)+",0)"});
            thisNode.selectAll(".node_label_right").attr('x', function(d){return d.w-38});
            //thisNode.selectAll(".node_icon_right").attr("x",function(d){return d.w-d3.select(this).attr("width")-1-(d.outputs>0?5:0);});
            //thisNode.selectAll(".node_icon_shade_right").attr("x",function(d){return d.w-30;});
            //thisNode.selectAll(".node_icon_shade_border_right").attr("d",function(d){return "M "+(d.w-30)+" 1 l 0 "+(d.h-2)});

            this.inputViewUpdate(d,thisNode);

            this.outputViewUpdate(d,thisNode);

            thisNode.selectAll('text.node_label').text(function (d, i) {
                    if (d._def.label) {
                        if (typeof d._def.label == "function") {
                            return d._def.label.call(d);
                        } else {
                            return d._def.label;
                        }
                    }
                    return "";
                })
                .attr('y', function (d) {
                    return (d.h / 2) - 1;
                })
                .attr('class', function (d) {
                    return 'node_label' +
                        (d._def.align ? ' node_label_' + d._def.align : '') +
                        (d._def.labelStyle ? ' ' + (typeof d._def.labelStyle == "function" ? d._def.labelStyle.call(d) : d._def.labelStyle) : '');
                });


            if (d._def.button)  {
                icon = thisNode.select(".node_icon");
                var current_url = icon.attr("xlink:href");
                var icon_url;
                if (typeof d._def.icon == "function") {
                    icon_url = d._def.icon.call(d);
                } else {
                    icon_url = d._def.icon;
                }
                if ("icons/"+icon_url != current_url) {
                    icon.attr("xlink:href","icons/"+icon_url);
                    var img = new Image();
                    img.src = "icons/"+d._def.icon;
                    img.onload = function() {
                        icon.attr("width",Math.min(img.width,30));
                        icon.attr("height",Math.min(img.height,30));
                        icon.attr("x",15-Math.min(img.width,30)/2);
                    }
                }
            }


            thisNode.selectAll(".node_tools").attr("x",function(d){return d.w-35;}).attr("y",function(d){return d.h-20;});

            thisNode.selectAll(".node_changed")
                .attr("x",function(d){return d.circle? d.w-10- d.w/2:d.w-10})
                .attr('y',function(d){return d.circle? -d.h+10:-5})
                .classed("hidden",function(d) { return !d.changed; });

            thisNode.selectAll(".node_error")
                .attr("x",function(d){return d.w-10-(d.changed?13:0)})
                .classed("hidden",function(d) { return d.valid; });

            thisNode.selectAll(".port_input").each(function(d,i) {
                var port = d3.select(this);
                port.attr("transform",function(d){return "translate(-5,"+((d.h/2)-5)+")";})
            });

            thisNode.selectAll(".node_icon").attr("y",function(d){return (d.h-d3.select(this).attr("height"))/2;});
            thisNode.selectAll(".node_icon_shade").attr("height",function(d){return d.h;});
            thisNode.selectAll(".node_icon_shade_border").attr("d",function(d){ return "M "+(("right" == d._def.align) ?0:30)+" 1 l 0 "+(d.h-2)});

            thisNode.selectAll('.node_button').attr("opacity",function(d) {
                //return (activeSubflow||d.changed)?0.4:1
            });
            thisNode.selectAll('.node_button_button').attr("cursor",function(d) {
                //return (activeSubflow||d.changed)?"":"pointer";
            });
            thisNode.selectAll('.node_right_button').attr("transform",function(d){
                var x = d.w-6;
                if (d._def.button.toggle && !d[d._def.button.toggle]) {
                    x = x - 8;
                }
                return "translate("+x+",2)";
            });
            thisNode.selectAll('.node_right_button rect').attr("fill-opacity",function(d){
                if (d._def.button.toggle) {
                    return d[d._def.button.toggle]?1:0.2;
                }
                return 1;
            });

            //thisNode.selectAll('.node_right_button').attr("transform",function(d){return "translate("+(d.w - d._def.button.width.call(d))+","+0+")";}).attr("fill",function(d) {
            //         return typeof d._def.button.color  === "function" ? d._def.button.color.call(d):(d._def.button.color != null ? d._def.button.color : d._def.color)
            //});

            thisNode.selectAll('.node_badge_group').attr("transform",function(d){return "translate("+(d.w-40)+","+(d.h+3)+")";});
            thisNode.selectAll('text.node_badge_label').text(function(d,i) {
                if (d._def.badge) {
                    if (typeof d._def.badge == "function") {
                        return d._def.badge.call(d);
                    } else {
                        return d._def.badge;
                    }
                }
                return "";
            });
        }
    },
    inputViewUpdate: function (d,thisNode) {
        var inputPorts = thisNode.selectAll(".port_input");
        if (d.inputs === 0 && !inputPorts.empty()) {
            inputPorts.remove();
            //nodeLabel.attr("x",30);
        } else if (d.inputs === 1 && inputPorts.empty()) {
            var inputGroup = thisNode.append("g").attr("class","port_input");
            inputGroup.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10)
                .on("mousedown",function(d){portMouseDown(d,1,0);})
                .on("touchstart",function(d){portMouseDown(d,1,0);})
                .on("mouseup",function(d){portMouseUp(d,1,0);} )
                .on("touchend",function(d){portMouseUp(d,1,0);} )
                .on("mouseover",function(d) { var port = d3.select(this); port.classed("port_hovered",(this.mouse_mode!=RED.state.JOINING || mousedown_port_type != 1 ));})
                .on("mouseout",function(d) { var port = d3.select(this); port.classed("port_hovered",false);})
        }

    },
    outputViewUpdate: function (d,thisNode) {
        var numOutputs = d.outputs;
        var y = (d.h/2)-((numOutputs-1)/2)*13;
        d.ports = d.ports || d3.range(numOutputs);
        d._ports = thisNode.selectAll(".port_output").data(d.ports);
        var output_group = d._ports.enter().append("g").attr("class","port_output");

        output_group.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10)
            .on("mousedown",(function(){var node = d; return function(d,i){portMouseDown(node,0,i);}})() )
            .on("touchstart",(function(){var node = d; return function(d,i){portMouseDown(node,0,i);}})() )
            .on("mouseup",(function(){var node = d; return function(d,i){portMouseUp(node,0,i);}})() )
            .on("touchend",(function(){var node = d; return function(d,i){portMouseUp(node,0,i);}})() )
            .on("mouseover",function(d,i) { var port = d3.select(this); port.classed("port_hovered",(this.mouse_mode!=RED.state.JOINING || mousedown_port_type !== 0 ));})
            .on("mouseout",function(d,i) { var port = d3.select(this); port.classed("port_hovered",false);});

        d._ports.exit().remove();

        var w = d.w;
        var h = d.h;
        var circle = d.circle;

        if (d._ports) {
            numOutputs = d.outputs || 1;
            y = (d.h/2)-((numOutputs-1)/2)*13;
            var x = d.w - 5;

            d._ports.each(function(d,i) {
                var port = d3.select(this);
                //port.attr("y",(y+13*i)-5).attr("x",x);
                port.attr("transform", function(d) { return "translate("+(circle?x-w/2:x)+","+(circle?(y+13*i)-5-h/2:(y+13*i)-5)+")";});
            });
        }

    },
    nodeButtonClicked: function (d) {
        //if (!activeSubflow && !d.changed) {
        //    if (d._def.button.toggle) {
        //        d[d._def.button.toggle] = !d[d._def.button.toggle];
        //        d.dirty = true;
        //    }
        //    if (d._def.button.onclick) {
        //        d._def.button.onclick.call(d);
        //    }
        //    if (d.dirty) {
        //        redraw();
        //    }
        //} else if (d.changed) {
        //    RED.notify(RED._("notification.warning", {message: RED._("notification.warnings.undeployedChanges")}), "warning");
        //} else {
        //    RED.notify(RED._("notification.warning", {message: RED._("notification.warnings.nodeActionDisabled")}), "warning");
        //}

        d3.event.preventDefault();
    },
    nodeMouseUp: function (d) {

        //if (dblClickPrimed && mousedown_node == d && clickElapsed > 0 && clickElapsed < 750) {
        //    mouse_mode = RED.state.DEFAULT;
        //    if (d.type != "subflow") {
        //        RED.editor.edit(d);
        //    } else {
        //        RED.editor.editSubflow(activeSubflow);
        //    }
        //    clickElapsed = 0;
        //    d3.event.stopPropagation();
        //    return;
        //}
        //var direction = d._def ? (d.inputs > 0 ? 1 : 0) : (d.direction == "in" ? 0 : 1)
        //portMouseUp(d, direction, 0);
        //mouse_mode = RED.state.MOVING_ACTIVE;
    },
    nodeMouseDown: function (d,self) {
        var moving_set = this.moving_set;
        var position = d3.mouse(RED.view.canvas().vis.node());

        //判断是否处于resize区域(右下角)
        if (Math.abs(position[0] - d.w - d.x) < 10 && Math.abs(position[1] - d.h - d.y) < 10) {
            this.mousedown_node = d;
            d.grabx = d3.event.clientX;
            d.graby = d3.event.clientY;
            this.mouse_mode = RED.state.RESIZE;
            return;
        }

        RED.view.focus();
        var touch0 = d3.event;
        var pos = [touch0.pageX,touch0.pageY];
        //RED.touch.radialMenu.show(d3.select(this),pos);
        if (this.mouse_mode == RED.state.IMPORT_DRAGGING) {
            RED.keyboard.remove(/* ESCAPE */ 27);
            updateSelection();
            RED.nodes.dirty(true);
            redraw();
            resetMouseVars();
            d3.event.stopPropagation();
            return;
        }
        this.mousedown_node = d;
        //var now = Date.now();
        //clickElapsed = now - clickTime;
        //clickTime = now;
        //
        //dblClickPrimed = (lastClickNode == mousedown_node);
        //lastClickNode = mousedown_node;

        var i;
        //
        if (d.selected && d3.event.ctrlKey) {
            this.cancleSelected(d,moving_set);//ctrl+单击选中Node = 取消选中
        } else {
            if (d3.event.shiftKey) {
                //clearSelection();
                //var cnodes = RED.nodes.getAllFlowNodes(mousedown_node);
                //for (var n = 0; n < cnodes.length; n++) {
                //    cnodes[n].selected = true;
                //    cnodes[n].dirty = true;
                //    moving_set.push({n: cnodes[n]});
                //}
            } else if (!d.selected) {
                if (!d3.event.ctrlKey) {
                    RED.view.canvas().clearSelection();
                }
                this.mousedown_node.selected = true;
                this.moving_set.push(this.mousedown_node);
            }
            //this.selected_link = null;
            if (d3.event.button != 2) {
                this.mouse_mode = RED.state.MOVING;
                var mouse = d3.touches(self)[0] || d3.mouse(self);
                mouse[0] += d.x - d.w / 2;
                mouse[1] += d.y - d.h / 2;
                for (i = 0; i < moving_set.length; i++) {1
                    moving_set[i].ox = moving_set[i].x;
                    moving_set[i].oy = moving_set[i].y;
                    moving_set[i].dx = moving_set[i].x - mouse[0];
                    moving_set[i].dy = moving_set[i].y - mouse[1];
                }
                this.mouse_offset = d3.mouse(document.getElementById('chart'));
                if (isNaN(this.mouse_offset[0])) {
                    this.mouse_offset = d3.touches(document.body)[0];
                }
            }
        }
        //
        ////show hierarchy state
        //if (event.altKey) {
        //    d.hierarchy = true;
        //
        //    var index = isHiddenParentNode(d);
        //    if (index) {
        //        d.w = d.previousW;
        //        d.h = d.previousH;
        //        hiddenParentNode.splice(index, 1);
        //    } else {
        //        d.previousW = d.w;
        //        d.previousH = d.h
        //        d.w = 200;//TODO accoding to inside node to decide width and height
        //        d.h = 100;
        //
        //        hiddenParentNode.push(d.id);
        //    }
        //
        //}

        d.dirty = true;
        RED.view.canvas().updateSelection();

        d3.event.stopPropagation();
    },
    resizeMode: function () {

    },
    cancleSelected: function (d,moving_set) {
        d.selected = false;
        for (i = 0; i < moving_set.length; i += 1) {
            if (moving_set[i] === d) {
                moving_set.splice(i, 1);
                break;
            }
        }
    },
    anyBeMouseDowned: function() {
        return !this.mousedown_node && !this.mousedown_link;
    },
    changeMoveActiveModel: function() {
        this.mouse_mode = RED.state.MOVING_ACTIVE;
    },
    changeMoveModel: function() {
        this.mouse_mode = RED.state.MOVING;
    },
    resetMouseVars: function() {
        this.mousedown_node = null;
        this.mouseup_node = null;
        this.mouse_mode = 0;
    }


});