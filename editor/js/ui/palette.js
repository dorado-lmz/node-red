/**
 * Copyright 2013, 2015 IBM Corp.
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

RED.palette = (function() {

    var exclusion = ['config','unknown','deprecated'];
    var core = ['basic','subflows', 'input', 'output', 'function', 'social', 'mobile', 'storage', 'analysis', 'advanced'];
    var canvas_height='38',canvas_width='120';
    var categoryContainers = {};

    function createCategoryContainer(category, label){
        label = label || category.replace("_", " ");
        var catDiv = $('<div id="palette-container-'+category+'" class="palette-category palette-close hide">'+
            '<div id="palette-header-'+category+'" class="palette-header"><i class="expanded fa fa-angle-down"></i><span>'+label+'</span></div>'+
            '<div class="palette-content" id="palette-base-category-'+category+'">'+
            '<div id="palette-'+category+'-input"></div>'+
            '<div id="palette-'+category+'-output"></div>'+
            '<div id="palette-'+category+'-function"></div>'+
            '</div>'+
            '</div>').appendTo("#palette-container");

        categoryContainers[category] = {
            container: catDiv,
            close: function() {
                catDiv.removeClass("palette-open");
                catDiv.addClass("palette-closed");
                $("#palette-base-category-"+category).slideUp();
                $("#palette-header-"+category+" i").removeClass("expanded");
            },
            open: function() {
                catDiv.addClass("palette-open");
                catDiv.removeClass("palette-closed");
                $("#palette-base-category-"+category).slideDown();
                $("#palette-header-"+category+" i").addClass("expanded");
            },
            toggle: function() {
                if (catDiv.hasClass("palette-open")) {
                    categoryContainers[category].close();
                } else {
                    categoryContainers[category].open();
                }
            }
        };

        $("#palette-header-"+category).on('click', function(e) {
            categoryContainers[category].toggle();
        });
    }

    function popOverContent(label, type, info, el) {
        var popOverContent;
        try {
            var l = "<p><b>" + label + "</b></p>";
            if (label != type) {
                l = "<p><b>" + label + "</b><br/><i>" + type + "</i></p>";
            }
            popOverContent = $(l + (info ? info : $("script[data-help-name|='" + type + "']").html() || "<p>" + RED._("palette.noInfo") + "</p>").trim())
                .filter(function (n) {
                    return (this.nodeType == 1 && this.nodeName == "P") || (this.nodeType == 3 && this.textContent.trim().length > 0)
                }).slice(0, 2);
        } catch (err) {
            // Malformed HTML may cause errors. TODO: need to understand what can break
            // NON-NLS: internal debug
            console.log("Error generating pop-over label for ", type);
            console.log(err.toString());
            popOverContent = "<p><b>" + label + "</b></p><p>" + RED._("palette.noInfo") + "</p>";
        }

        el.data('popover').setContent(popOverContent);
    }

    function setLabel(type, el,label, info) {
        var nodeWidth = 82;
        var nodeHeight = 25;
        var lineHeight = 20;
        var portHeight = 10;

        if(!label){
            return;
        }
        var words = label.split(" ");

        var displayLines = [];

        var currentLine = words[0];
        var currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);

        for (var i=1;i<words.length;i++) {
            var newWidth = RED.view.calculateTextWidth(currentLine+" "+words[i], "palette_label", 0);
            if (newWidth < nodeWidth) {
                currentLine += " "+words[i];
                currentLineWidth = newWidth;
            } else {
                displayLines.push(currentLine);
                currentLine = words[i];
                currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);
            }
        }
        displayLines.push(currentLine);

        var lines = displayLines.join("<br/>");
        var multiLineNodeHeight = 8+(lineHeight*displayLines.length);
        el.css({height:multiLineNodeHeight+"px"});

        var labelElement = el.find(".palette_label");
        labelElement.html(lines);

        el.find(".palette_port").css({top:(multiLineNodeHeight/2-5)+"px"});

    }

    function escapeNodeType(nt) {
        return nt.replace(" ","_").replace(".","_").replace(":","_");
    }


    function canvas_flow(div_node,def){
        div_node.classList.add("palette_symbol");
        var canvas = document.createElement("canvas");
        canvas.setAttribute("width",canvas_width);
        canvas.setAttribute('height',canvas_height);
        div_node.appendChild(canvas);
        var ctx = canvas.getContext("2d");

        var fun = eval(div_node.type);
        fun(ctx,def);
    }

    function canvas_redraw(event,ui){
        var div_node = event.target;
        var fun = eval(div_node.type);

        var $node = ui.helper[0];
        var ctx = $("canvas",$node)[0].getContext("2d");
        fun(ctx,div_node.def);
    }

    function addNodeType(nt,def) {
        var nodeTypeId = escapeNodeType(nt);
        if ($("#palette_node_"+nodeTypeId).length) {
            return;
        }
        if (exclusion.indexOf(def.category)===-1) {

            var category = def.category.replace(" ","_");
            var rootCategory = category.split("-")[0];

            var div_node = document.createElement("div");

            div_node.id = "palette_node_"+nodeTypeId;
            div_node.type = nt;

            if ($("#palette-base-category-"+rootCategory).length === 0) {
                if(core.indexOf(rootCategory) !== -1){
                    createCategoryContainer(rootCategory, RED._("node-red:palette.label."+rootCategory, {defaultValue:rootCategory}));
                } else {
                    var ns = def.set.id;
                    createCategoryContainer(rootCategory, RED._(ns+":palette.label."+rootCategory, {defaultValue:rootCategory}));
                }
            }
            $("#palette-container-"+rootCategory).show();

            if ($("#palette-"+category).length === 0) {
                $("#palette-base-category-"+rootCategory).append('<div id="palette-'+category+'"></div>');
            }

            $("#palette-"+category).append(div_node);

            var label;

            if (typeof def.paletteLabel === "undefined") {
                label = /^(.*?)([ -]in|[ -]out)?$/.exec(nt)[1];
            } else {
                label = (typeof def.paletteLabel === "function" ? def.paletteLabel.call(def) : def.paletteLabel)||"";
            }

            if(def.canvas) {
                //var div_node =  $(def.display)[0];
                div_node.def = def;
                canvas_flow(div_node,def);

            }else{
                div_node.style.backgroundColor = def.color;
                div_node.classList.add("palette_node");


                $('<div/>',{class:"palette_label"+(def.align=="right"?" palette_label_right":"")}).appendTo(div_node);



                if (def.icon) {
                    var icon_url = (typeof def.icon === "function" ? def.icon.call({}) : def.icon);
                    var iconContainer = $('<div/>',{class:"palette_icon_container"+(def.align=="right"?" palette_icon_container_right":"")}).appendTo(div_node);
                    $('<div/>',{class:"palette_icon",style:"background-image: url(icons/"+icon_url+")"}).appendTo(iconContainer);
                }

                if (def.outputs > 0) {
                    var portOut = document.createElement("div");
                    portOut.className = "palette_port palette_port_output";
                    div_node.appendChild(portOut);
                }

                if (def.inputs > 0) {
                    var portIn = document.createElement("div");
                    portIn.className = "palette_port palette_port_input";
                    div_node.appendChild(portIn);
                }
            }

            div_node.onmousedown = function(e) { e.preventDefault(); };

            RED.popover.create({
                target:$(div_node),
                content: "hi",
                delay: { show: 750, hide: 50 }
            });

            // $(d).popover({
            //     title:d.type,
            //     placement:"right",
            //     trigger: "hover",
            //     delay: { show: 750, hide: 50 },
            //     html: true,
            //     container:'body'
            // });
            $(div_node).click(function() {
                RED.view.focus();
                var helpText;
                if (nt.indexOf("subflow:") === 0) {
                    helpText = marked(RED.nodes.subflow(nt.substring(8)).info||"");
                } else {
                    helpText = $("script[data-help-name|='"+div_node.type+"']").html()||"";
                }
                var help = '<div class="node-help">'+helpText+"</div>";
                RED.sidebar.info.set(help);
            });
            $(div_node).draggable({
                helper: 'clone',
                appendTo: 'body',
                revert: true,
                revertDuration: 50,
                start: function() {RED.view.focus();},
                drag:function(event,ui){if(category !== 'basic'){return;}else{canvas_redraw(event,ui)}}
            });

            var nodeInfo = null;
            if (def.category == "subflows") {
                $(div_node).dblclick(function(e) {
                    RED.workspaces.show(nt.substring(8));
                    e.preventDefault();
                });
                nodeInfo = marked(def.info||"");
            }
            if(!def.canvas) {
                setLabel(nt,$(div_node),label,nodeInfo);
            }
            popOverContent(label, nt, nodeInfo, $(div_node));

            var categoryNode = $("#palette-container-"+category);
            if (categoryNode.find(".palette_node").length === 1) {
                categoryContainers[category].open();
            }

        }
    }

    function removeNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        var paletteNode = $("#palette_node_"+nodeTypeId);
        var categoryNode = paletteNode.closest(".palette-category");
        paletteNode.remove();
        if (categoryNode.find(".palette_node").length === 0) {
            if (categoryNode.find("i").hasClass("expanded")) {
                categoryNode.find(".palette-content").slideToggle();
                categoryNode.find("i").toggleClass("expanded");
            }
        }
    }
    function hideNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        $("#palette_node_"+nodeTypeId).hide();
    }

    function showNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        $("#palette_node_"+nodeTypeId).show();
    }

    function refreshNodeTypes() {
        RED.nodes.eachSubflow(function(sf) {
            var paletteNode = $("#palette_node_subflow_"+sf.id.replace(".","_"));
            var portInput = paletteNode.find(".palette_port_input");
            var portOutput = paletteNode.find(".palette_port_output");

            if (portInput.length === 0 && sf.in.length > 0) {
                var portIn = document.createElement("div");
                portIn.className = "palette_port palette_port_input";
                paletteNode.append(portIn);
            } else if (portInput.length !== 0 && sf.in.length === 0) {
                portInput.remove();
            }

            if (portOutput.length === 0 && sf.out.length > 0) {
                var portOut = document.createElement("div");
                portOut.className = "palette_port palette_port_output";
                paletteNode.append(portOut);
            } else if (portOutput.length !== 0 && sf.out.length === 0) {
                portOutput.remove();
            }
            setLabel(sf.type+":"+sf.id,paletteNode,sf.name,marked(sf.info||""));
        });
    }

    function filterChange() {
        var val = $("#palette-search-input").val();
        if (val === "") {
            $("#palette-search-clear").hide();
        } else {
            $("#palette-search-clear").show();
        }

        var re = new RegExp(val,'i');
        $(".palette_node").each(function(i,el) {
            var currentLabel = $(el).find(".palette_label").text();
            if (val === "" || re.test(el.id) || re.test(currentLabel)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        for (var category in categoryContainers) {
            if (categoryContainers.hasOwnProperty(category)) {
                if (categoryContainers[category].container
                        .find(".palette_node")
                        .filter(function() { return $(this).css('display') !== 'none'}).length === 0) {
                    categoryContainers[category].close();
                } else {
                    categoryContainers[category].open();
                }
            }
        }
    }

    function init() {
        $(".palette-spinner").show();
        // if (RED.settings.paletteCategories) {
        //     RED.settings.paletteCategories.forEach(function(category){
        //         createCategoryContainer(category, RED._("palette.label."+category,{defaultValue:category}));
        //     });
        // } else {
        //     core.forEach(function(category){
        //         createCategoryContainer(category, RED._("palette.label."+category,{defaultValue:category}));
        //     });
        // }

        $("#palette-search-input").focus(function(e) {
            RED.keyboard.disable();
        });
        $("#palette-search-input").blur(function(e) {
            RED.keyboard.enable();
        });

        $("#palette-search-clear").on("click",function(e) {
            e.preventDefault();
            $("#palette-search-input").val("");
            filterChange();
            $("#palette-search-input").focus();
        });

        $("#palette-search-input").val("");
        $("#palette-search-input").on("keyup",function() {
            filterChange();
        });

        $("#palette-search-input").on("focus",function() {
            $("body").one("mousedown",function() {
                $("#palette-search-input").blur();
            });
        });

        $("#palette-collapse-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categoryContainers) {
                if (categoryContainers.hasOwnProperty(cat)) {
                    categoryContainers[cat].close();
                }
            }
        });
        $("#palette-expand-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categoryContainers) {
                if (categoryContainers.hasOwnProperty(cat)) {
                    categoryContainers[cat].open();
                }
            }
        });
    }

    return {
        init: init,
        add:addNodeType,
        remove:removeNodeType,
        hide:hideNodeType,
        show:showNodeType,
        refresh:refreshNodeTypes
    };
})();
