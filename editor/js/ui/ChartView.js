/**
 * Created by y50-70 on 1/19/2016.
 */

var ChartView = ChartBaseView.extend({
    mouse_position:null,
    mouse_offset:null,
    initialize: function (option) {
        this.nodeview = option.nodeview;
        this.nodes = this.nodeview.nodelist;
        ChartBaseView.prototype.initialize.apply(this);


        _.bindAll(this,"canvasMouseMove","canvasMouseDown","canvasMouseUp");

        var that = this;

        var outer_background = this.vis.append('svg:rect')
            .attr('width', space_width)
            .attr('height', space_height)
            .attr('fill','#fff');

        this.drag_line = this.vis.append("svg:path").attr("class", "drag_line");
        var debug_line = this.vis.append("svg:path").attr("class", "debug_line");

    },

    endKeyboardMove: function () {
        var ns = [];
        for (var i = 0; i < moving_set.length; i++) {
            ns.push({n: moving_set[i].n, ox: moving_set[i].ox, oy: moving_set[i].oy});
            delete moving_set[i].ox;
            delete moving_set[i].oy;
        }
        RED.history.push({t: 'move', nodes: ns, dirty: RED.nodes.dirty()});
    },

    focusView: function () {
        $("svg",this.$el).focus();
    },
    selectAll: function () {
        var moving_set = this.nodeview.moving_set;
        RED.nodes.eachNode(function(n) {
            if (n.z == RED.workspaces.active()) {
                if (!n.selected) {
                    n.selected = true;
                    n.dirty = true;
                    moving_set.push({n:n});
                }
            }
        });
        this.updateSelection(moving_set)
    },
    drawLasso: function (nodeview, self) {
        if (nodeview.mouse_mode === 0) {
            if (nodeview.lasso) {
                nodeview.lasso.remove();
                nodeview.lasso = null;
            }
            var point = d3.mouse(self);
            nodeview.lasso = this.vis.append('rect')
                .attr("ox", point[0])
                .attr("oy", point[1])
                .attr("rx", 1)
                .attr("ry", 1)
                .attr("x", point[0])
                .attr("y", point[1])
                .attr("width", 0)
                .attr("height", 0)
                .attr("class", "lasso");
        }
    },
    updateSelection: function () {
        var moving_set = this.nodeview.moving_set;
        if (moving_set.length === 0 ) {
            RED.keyboard.remove(/* backspace */ 8);
            RED.keyboard.remove(/* delete */ 46);
            RED.keyboard.remove(/* c */ 67);
            RED.keyboard.remove(/* x */ 88);
        } else {
            RED.keyboard.add(/* backspace */ 8, function () {
                this.deleteSelection();
                d3.event.preventDefault();
            });
            RED.keyboard.add(/* delete */ 46, function () {
                this.deleteSelection();
                d3.event.preventDefault();
            });
            RED.keyboard.add(/* c */ 67, {ctrl: true}, function () {
                this.copySelection();
                d3.event.preventDefault();
            });
            RED.keyboard.add(/* x */ 88, {ctrl: true}, function () {
                this.copySelection();
                this.deleteSelection();
                d3.event.preventDefault();
            });
        }
        if (moving_set.length === 0) {
            RED.keyboard.remove(/* up   */ 38);
            RED.keyboard.remove(/* down */ 40);
            RED.keyboard.remove(/* left */ 37);
            RED.keyboard.remove(/* right*/ 39);
        } else {
            RED.keyboard.add(/* up   */ 38, function () {
                if (d3.event.shiftKey) {
                    moveSelection(0, -20)
                } else {
                    moveSelection(0, -1);
                }
                d3.event.preventDefault();
            }, this.endKeyboardMove);
            RED.keyboard.add(/* down */ 40, function () {
                if (d3.event.shiftKey) {
                    this.moveSelection(0, 20)
                } else {
                    this.moveSelection(0, 1);
                }
                d3.event.preventDefault();
            }, this.endKeyboardMove);
            RED.keyboard.add(/* left */ 37, function () {
                if (d3.event.shiftKey) {
                    this.moveSelection(-20, 0)
                } else {
                    this.moveSelection(-1, 0);
                }
                d3.event.preventDefault();
            }, this.endKeyboardMove);
            RED.keyboard.add(/* right*/ 39, function () {
                if (d3.event.shiftKey) {
                    this.moveSelection(20, 0)
                } else {
                    this.moveSelection(1, 0);
                }
                d3.event.preventDefault();
            }, this.endKeyboardMove);
        }

        var selection = {};

        if (moving_set.length > 0) {
            selection.nodes = moving_set.map(function (n) {
                return n;
            });
        }
        //if (selected_link != null) {
        //    selection.link = selected_link;
        //}
        RED.events.emit("view:selection-changed", selection);
    },
    deleteSelection: function () {
        var moving_set = this.nodeview.moving_set;
        if (moving_set.length > 0) {
            for (var i=0;i<moving_set.length;i++) {
                var node = moving_set[i].n;
                node.selected = false;
                //if (node.type != "subflow") {
                //    if (node.x < 0) {
                //        node.x = 25
                //    }
                //    var removedEntities = RED.nodes.remove(node.id);
                //    removedNodes.push(node);
                //    removedNodes = removedNodes.concat(removedEntities.nodes);
                //    removedLinks = removedLinks.concat(removedEntities.links);
                //} else {
                //    if (node.direction === "out") {
                //        removedSubflowOutputs.push(node);
                //    } else if (node.direction === "in") {
                //        removedSubflowInputs.push(node);
                //    }
                //    node.dirty = true;
                //}
            }

        }
    },
    clearSelection: function () {
        var moving_set = this.nodeview.moving_set;
        for (var i=0;i<moving_set.length;i++) {
            var n = moving_set[i];
            n.dirty = true;
            n.selected = false;
        }
        this.nodeview.moving_set = [];
    },
    canvasMouseDown: function (self) {
        var nodeview = this.nodeview;//绘制node的View类,用于绘制svg画布上的node节点
        if(nodeview.anyBeMouseDowned()){
            this.updateSelection();
        }
        this.drawLasso(nodeview, self);
        d3.event.preventDefault();
    },
    canvasMouseMove: function (self) {
        this.mouse_position = d3.touches(self)[0]||d3.mouse(self);
        var lasso =this.nodeview.lasso;
        var mouse_position = this.mouse_position;
        var mouse_offset = this.nodeview.mouse_offset;
        var mouse_mode = this.nodeview.mouse_mode;
        var mousedown_node = this.nodeview.mousedown_node;

        if (lasso) {
            var ox = parseInt(lasso.attr("ox"));
            var oy = parseInt(lasso.attr("oy"));
            var x = parseInt(lasso.attr("x"));
            var y = parseInt(lasso.attr("y"));
            var w;
            var h;
            if (mouse_position[0] < ox) {
                x = mouse_position[0];
                w = ox-x;
            } else {
                w = mouse_position[0]-x;
            }
            if (mouse_position[1] < oy) {
                y = mouse_position[1];
                h = oy-y;
            } else {
                h = mouse_position[1]-y;
            }
            lasso
                .attr("x",x)
                .attr("y",y)
                .attr("width",w)
                .attr("height",h);
            return;
        }

        if (mouse_mode != RED.state.IMPORT_DRAGGING && !mousedown_node /*&& selected_link == null*/) {
            return;
        }

        var mousePos;
        if (mouse_mode == RED.state.MOVING) {
            mousePos = d3.mouse(document.body);
            if (isNaN(mousePos[0])) {
                mousePos = d3.touches(document.body)[0];
            }
            var d = (mouse_offset[0]-mousePos[0])*(mouse_offset[0]-mousePos[0]) + (mouse_offset[1]-mousePos[1])*(mouse_offset[1]-mousePos[1]);
            if (d > 3) {
                this.nodeview.changeMoveActiveModel();
                // clickElapsed = 0;
            }

        }
        else if (mouse_mode == RED.state.MOVING_ACTIVE || mouse_mode == RED.state.IMPORT_DRAGGING) {
            var moving_set = this.nodeview.moving_set;
            mousePos = mouse_position;
            var node;
            var i;
            var minX = 0;
            var minY = 0;
            for (var index = 0; index<moving_set.length; index++) {
                node = moving_set[index];
                if (d3.event.shiftKey) {
                    node.ox = node.x;
                    node.oy = node.y;
                }
                node.x = mousePos[0]+node.dx||0;
                node.y = mousePos[1]+node.dy||0;

                node.dirty = true;

                //if(node.n.childNodes){
                //    for(index in node.n.childNodes){
                //        movingNodeOffset({n:RED.nodes.node(node.n.childNodes[index])}, mousePos);
                //    }
                //}
                //
                //
                //if(node.n.parentNode){
                //    var parent = RED.nodes.node(node.n.parentNode);
                //    if(parent){
                //        if(parent.bbox.containsPoint(node.n.bbox.origin()) &&
                //            parent.bbox.containsPoint(node.n.bbox.topRight()) &&
                //            parent.bbox.containsPoint(node.n.bbox.corner()) &&
                //            parent.bbox.containsPoint(node.n.bbox.bottomLeft())){
                //
                //            node.n.priviousBbox = {x:node.n.bbox.x,y:node.n.bbox.y};
                //            movingNodeOffset(node, mousePos);
                //
                //        }else{
                //            console.log("out....");
                //            node.n.x = node.n.priviousBbox.x;
                //            node.n.y = node.n.priviousBbox.y;
                //            node.n.bbox.x = node.n.x;
                //            node.n.bbox.y = node.n.y;
                //        }
                //    }
                //}else{
                //
                //    //mousedown_node.mouseoffsetx = mouse_offset[0]-mousedown_node.x;
                //    //mousedown_node.mouseoffsety = mouse_offset[1]-mousedown_node.y;//mouse position relate to the origin of node(x,y)
                //    movingNodeOffset(node, mousePos);
                //
                //}


                // containsRect(node.n);


                minX = Math.min(node.x-node.w/2-5,minX);//node move border'x
                minY = Math.min(node.y-node.h/2-5,minY);//node move border'y
            }
            if (minX !== 0 || minY !== 0) {
                for (i = 0; i<moving_set.length; i++) {
                    node = moving_set[i];
                    node.x -= minX;
                    node.y -= minY;
                }
            }
            if (d3.event.shiftKey && moving_set.length > 0) {
                var gridOffset =  [0,0];
                node = moving_set[0];
                gridOffset[0] = node.n.x-(20*Math.floor((node.n.x-node.n.w/2)/20)+node.n.w/2);
                gridOffset[1] = node.n.y-(20*Math.floor(node.n.y/20));
                if (gridOffset[0] !== 0 || gridOffset[1] !== 0) {
                    for (i = 0; i<moving_set.length; i++) {
                        node = moving_set[i];
                        node.x -= gridOffset[0];
                        node.y -= gridOffset[1];
                        if (node.x == node.ox && node.y == node.oy) {
                            node.dirty = false;
                        }
                    }
                }
            }
        }

        if (mouse_mode !== 0) {
            this.nodeview.render();
        }

    },
    canvasMouseUp: function (self) {
        var lasso =this.nodeview.lasso;
        var mouse_mode = this.nodeview.mouse_mode;
        var mousedown_node = this.nodeview.mousedown_node;
        var moving_set = this.nodeview.moving_set;
        if (mousedown_node && mouse_mode == RED.state.JOINING) {
            this.drag_line.attr("class", "drag_line_hidden");
        }
        if (lasso) {
            var x = parseInt(lasso.attr("x"));
            var y = parseInt(lasso.attr("y"));
            var x2 = x+parseInt(lasso.attr("width"));
            var y2 = y+parseInt(lasso.attr("height"));
            if (!d3.event.ctrlKey) {
                this.clearSelection();
            }
            RED.nodes.eachNode(function(n) {
                if (n.z == RED.workspaces.active() && !n.selected) {
                    n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
                    if (n.selected) {
                        n.dirty = true;
                        moving_set.push(n);
                    }
                }
            });
            //if (activeSubflow) {
            //    activeSubflow.in.forEach(function(n) {
            //        n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
            //        if (n.selected) {
            //            n.dirty = true;
            //            moving_set.push({n:n});
            //        }
            //    });
            //    activeSubflow.out.forEach(function(n) {
            //        n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
            //        if (n.selected) {
            //            n.dirty = true;
            //            moving_set.push({n:n});
            //        }
            //    });
            //}
            this.updateSelection();
            lasso.remove();
            this.nodeview.lasso = null;
        } else if (mouse_mode == RED.state.DEFAULT  && !d3.event.ctrlKey ) {
            this.clearSelection();
            this.updateSelection();
        }

        //if (mouse_mode == RED.state.MOVING_ACTIVE) {
        //    if (moving_set.length > 0) {
        //        var ns = [];
        //        for (var j=0;j<moving_set.length;j++) {
        //            ns.push({n:moving_set[j].n,ox:moving_set[j].ox,oy:moving_set[j].oy});
        //        }
        //        RED.history.push({t:'move',nodes:ns,dirty:RED.nodes.dirty()});
        //    }
        //}
        if (mouse_mode == RED.state.MOVING || mouse_mode == RED.state.MOVING_ACTIVE) {
            for (var i=0;i<moving_set.length;i++) {
                delete moving_set[i].ox;
                delete moving_set[i].oy;
            }
        }
        this.nodeview.resetMouseVars();

    },
    insertDebugRect: function (id) {
        this.vis.insert('rect','.debug_line').attr('id',id);
    }
});