/**
 * Created by y50-70 on 1/19/2016.
 */
var LinkModel = Backbone.Model.extend({
    defaults:{
        source:null,
        sourcePort:0,
        target:null
    },
    initialize: function () {

    }
});

var LinkList = Backbone.Collection.extend({
    model:LinkModel,
});

var LinkView = Backbone.View.extend({
    initialize:function(){
        this.linklist = new LinkList();
        this.listenTo(this.linklist, 'add', this.render);
    },
    render: function () {
        var link = vis.selectAll(".link").data(
            this.linklist.models,
            function(d) {
                return d.source.id+":"+d.sourcePort+":"+d.target.id+":"+d.target.i;
            }
        );
        var linkEnter = link.enter().insert("g",".node").attr("class","link");

        linkEnter.each(function(d,i) {
            var l = d3.select(this);
            d.added = true;
            l.append("svg:path").attr("class","link_background link_path")
                .on("mousedown",function(d) {
                    mousedown_link = d;
                    clearSelection();
                    selected_link = mousedown_link;
                    updateSelection();
                    redraw();
                    focusView();
                    d3.event.stopPropagation();
                })
                .on("touchstart",function(d) {
                    mousedown_link = d;
                    clearSelection();
                    selected_link = mousedown_link;
                    updateSelection();
                    redraw();
                    focusView();
                    d3.event.stopPropagation();

                    var obj = d3.select(document.body);
                    var touch0 = d3.event.touches.item(0);
                    var pos = [touch0.pageX,touch0.pageY];
                    touchStartTime = setTimeout(function() {
                        touchStartTime = null;
                        showTouchMenu(obj,pos);
                    },touchLongPressTimeout);
                });
            l.append("svg:path").attr("class","link_outline link_path");
            l.append("svg:path").attr("class","link_line link_path")
                .classed("link_subflow", function(d) { return activeSubflow && (d.source.type === "subflow" || d.target.type === "subflow") });
        });

        link.exit().remove();
        var links = vis.selectAll(".link_path");
        links.each(function(d) {
            var link = d3.select(this);
            if (d.added || d===selected_link || d.selected || dirtyNodes[d.source.id] || dirtyNodes[d.target.id]) {
                link.attr("d",function(d){
                    var numOutputs = d.source.outputs || 1;
                    var sourcePort = d.sourcePort || 0;
                    var y = -((numOutputs-1)/2)*13 +13*sourcePort;

                    var dy = d.target.y-(d.source.y+y);
                    var dx = (d.target.x-d.target.w/2)-(d.source.x+d.source.w/2);
                    var delta = Math.sqrt(dy*dy+dx*dx);
                    var scale = lineCurveScale;
                    var scaleY = 0;
                    if (delta < node_width) {
                        scale = 0.75-0.75*((node_width-delta)/node_width);
                    }

                    if (dx < 0) {
                        scale += 2*(Math.min(5*node_width,Math.abs(dx))/(5*node_width));
                        if (Math.abs(dy) < 3*node_height) {
                            scaleY = ((dy>0)?0.5:-0.5)*(((3*node_height)-Math.abs(dy))/(3*node_height))*(Math.min(node_width,Math.abs(dx))/(node_width)) ;
                        }
                    }

                    d.x1 = d.source.x+d.source.w/2;
                    d.y1 = d.source.y+y;
                    d.x2 = d.target.x-d.target.w/2;
                    d.y2 = d.target.y;



                    var source_circle_offsetx = d.source.circle?d.source.w/2:0;
                    var source_circle_offsety = d.source.circle?d.source.h/2:0;
                    var target_circle_offsetx = d.target.circle?d.target.w/2:0;
                    var target_circle_offsety = d.target.circle?d.target.h/2:0;
                    //return "M "+(d.source.x+d.source.w/2)+" "+(d.source.y+y)+
                    //    " C "+(d.source.x+d.source.w/2+scale*node_width)+" "+(d.source.y+y+scaleY*node_height)+" "+
                    //    (d.target.x-d.target.w/2-scale*node_width)+" "+(d.target.y-scaleY*node_height)+" "+
                    //    (d.target.x-d.target.w/2)+" "+d.target.y;
                    return "M "+(d.source.x+d.source.w-source_circle_offsetx)+" "+(d.source.y+d.source.h/2+y-source_circle_offsety)+
                        " C "+(d.source.x+d.source.w+scale*node_width)+" "+(d.source.y+d.source.h/2+y+scaleY*node_height)+" "+
                        (d.target.x-d.target.w-scale*node_width)+" "+(d.target.y+d.source.h/2-scaleY*node_height)+" "+
                        (d.target.x-target_circle_offsetx)+" "+(d.target.y+d.target.h/2-target_circle_offsety);
                });
            }
        })

        link.classed("link_selected", function(d) { return d === selected_link || d.selected; });
        link.classed("link_unknown",function(d) {
            delete d.added;
            return d.target.type == "unknown" || d.source.type == "unknown"
        });
    }
});