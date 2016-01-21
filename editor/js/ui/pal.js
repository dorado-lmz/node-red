RED.palette = (function() {

    var exclusion = ['config', 'unknown', 'deprecated'];
    var canvas_height='38',canvas_width='120';
    var platte;
    function init() {
       platte = new PaletteView();
    }

    function addNodeType(node_type, def) {
        var nodeTypeId = escapeNodeType(node_type);
        if ($("#palette_node_" + nodeTypeId).length) {
            return;
        }
        if (exclusion.indexOf(def.category) === -1) {
            var node_model = new NodeTypeModel({
                category: def.category,
                node_type: node_type,
                def: def,
                nodeTypeId: nodeTypeId

            });
            var node_view = new NodeTypeView({
                model: node_model,
                paletteView:platte
            });
        }
    }

    function removeNodeType() {

    }

    function hideNodeType() {

    }

    function showNodeType() {

    }

    function refreshNodeTypes() {

    }

    function escapeNodeType(nt) {
        return nt.replace(" ", "_").replace(".", "_").replace(":", "_");
    }



    var CategoryModel = Backbone.Model.extend({
        defaults: {
            category: '',
            label: '',
            status: 1, //open or close
        },
        idAttribute: "category",
        close: function(){this.set({status:0})},
        open: function(){this.set({status:1})},
        toggle: function() {
            if (this.get('status')) {
                this.set({
                    status: 0
                })
            } else {
                this.set({
                    status: 1
                })
            }
        },
        initialize: function() {
            var label = this.get('label');
            if (!label) {
                this.set({
                    label: this.get('category').replace("_", " ")
                });
            }
        }
    });

    var CategoryContainerList = Backbone.Collection.extend({
        model: CategoryModel,
        allOpen: function() {
            for (var cat in this.models) {
                this.models[cat].open();
            }
        },
        allClose: function() {
            for (var cat in this.models) {
                this.models[cat].close();
            }
        }
    });

    var CategoryContainerView = Backbone.View.extend({
        core: ['basic', 'subflows', 'input', 'output', 'function', 'social', 'mobile', 'storage', 'analysis', 'advanced'],
        template: _.template($('#category-container').html()),
        initialize: function(ns) {
            var category = this.model.get('category');

            if ($("#palette-base-category-" + category).length === 0) {

                this.listenTo(this.model, 'change:status', this.toggle);

                if (this.core.indexOf(category) !== -1) {
                    this.model.set('label', RED._("node-red:palette.label." + category, {
                        defaultValue: category
                    }))
                } else {
                    this.model.set('label', RED._(ns + ":node-red:palette.label." + category, {
                        defaultValue: category
                    }))
                }
                this.render();
                var model = this.model;
                this.category_header = $("#palette-header-" + category);
                this.category_content = $("#palette-base-category-" + category);
                $("#palette-header-" + category).on('click', function(e) {
                    model.toggle();
                });
            }
        },
        render: function() {
            var catDiv = this.template(this.model.toJSON());
            $("#palette-container").append(catDiv);
            this.$el = $("#palette-container-" + this.model.get('category'));
            this.$el.show();

            return catDiv;
        },
        toggle: function() {
            if (this.model.get('status')) {
                this.$el.addClass("palette-open");
                this.$el.removeClass("palette-closed");
                this.category_content.slideDown();
                this.category_header.addClass("expanded");

            } else {
                this.$el.removeClass("palette-open");
                this.$el.addClass("palette-closed");
                this.category_content.slideUp();
                this.category_header.removeClass("expanded");
            }
        }
    });

    var NodeTypeModel = Backbone.Model.extend({
        defaults: {
            node_type: '',
            nodeTypeId: '',
            rootCategory: '',
            category: '',
            def: {}
        },
        initialize: function() {
            var def = this.get('def');
            var category = def.category.replace(" ", "_");
            this.set({
                category: category
            });
            this.set({
                rootCategory: category.split("-")[0]
            });
        }

    });

    // var nodeTypeList = Backbone.Collection.extend({
    //     initialize: function(models, option) {
    //         this.on('add', option.view.addNodeType, option.view)
    //     }
    // });

    var NodeTypeView = Backbone.View.extend({
        initialize: function(option) {
            _.bindAll(this,"canvas_redraw");
            var rootCategory = this.model.get('rootCategory');
            var category = this.model.get('category');
            var nodeTypeId = this.model.get('nodeTypeId');
            this.platte = option.paletteView; //the instance of PaletteApp

            var ns = this.model.get('def').set.id;
            if(!platte.categoryContainers.get(rootCategory)){
                var category_model = new CategoryModel({
                    category: rootCategory
                });
                var categoryView = new CategoryContainerView({
                    model: category_model
                }, ns);
                platte.categoryContainers.add(category_model)
            }

            this.id = "palette_node_" + nodeTypeId;

            if ($("#palette-" + category).length === 0) {
                $("#palette-base-category-" + rootCategory).append('<div id="palette-' + category + '"></div>');
            }
            this.render();
        },
        render: function() {
            var def = this.model.get('def');
            var nodeTypeId = this.model.get('nodeTypeId');
            var category = this.model.get('category');
            var div_node = document.createElement('div');
            this.el = div_node;
            div_node.id = "palette_node_" + this.model.get('nodeTypeId');
            div_node.type = this.model.get('node_type');

            if (def.canvas) {
                div_node.def = def;
                this.canvas_flow(div_node,def);
            } else {
                div_node.style.backgroundColor = def.color;
                div_node.classList.add("palette_node");
                $('<div/>', {
                    class: "palette_label" + (def.align == "right" ? " palette_label_right" : "")
                }).appendTo(div_node);
                if (def.icon) {
                    var icon_url = (typeof def.icon === "function" ? def.icon.call({}) : def.icon);
                    var iconContainer = $('<div/>', {
                        class: "palette_icon_container" + (def.align == "right" ? " palette_icon_container_right" : "")
                    }).appendTo(div_node);
                    $('<div/>', {
                        class: "palette_icon",
                        style: "background-image: url(icons/" + icon_url + ")"
                    }).appendTo(iconContainer);
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
            div_node.onmousedown = function(e) {
                e.preventDefault();
            };
            $(div_node).click(function() {
                RED.view.focus();
                var helpText;
                if (nt.indexOf("subflow:") === 0) {
                    helpText = marked(RED.nodes.subflow(nt.substring(8)).info || "");
                } else {
                    helpText = $("script[data-help-name|='" + d.type + "']").html() || "";
                }
                var help = '<div class="node-help">' + helpText + "</div>";
                RED.sidebar.info.set(help);
            });
            var canvas_redraw = this.canvas_redraw;
            $(div_node).draggable({
                helper: 'clone',
                appendTo: 'body',
                revert: true,
                revertDuration: 50,
                start: function() {
                    RED.view.focus();
                },
                drag:function(event,ui){if(category == 'basic'){canvas_redraw(event,ui)}}
            });

            if ($("#palette_node_" + nodeTypeId).length === 0) {
               $("#palette-" + category).append(this.el);
            }
            this.setLabel();
        },
        setLabel: function() {
            RED.popover.create({
                target: $(this.el),
                content: "hi",
                delay: {
                    show: 750,
                    hide: 50
                }
            });
            var def = this.model.get('def');
            var type = this.model.get('node_type')
            var el = $(this.el);
            var info = null;
            if (def.category == "subflows") {
                $(d).dblclick(function(e) {
                    RED.workspaces.show(nt.substring(8));
                    e.preventDefault();
                });
                info = marked(def.info || "");
            }
            var label;
            if (typeof def.paletteLabel === "undefined") {
                label = /^(.*?)([ -]in|[ -]out)?$/.exec(type)[1];
            } else {
                label = (typeof def.paletteLabel === "function" ? def.paletteLabel.call(def) : def.paletteLabel) || "";
            }

            var nodeWidth = 82;
            var nodeHeight = 25;
            var lineHeight = 20;
            var portHeight = 10;

            var words = label.split(" ");

            var displayLines = [];

            var currentLine = words[0];
            var currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);

            for (var i = 1; i < words.length; i++) {
                var newWidth = RED.view.calculateTextWidth(currentLine + " " + words[i], "palette_label", 0);
                if (newWidth < nodeWidth) {
                    currentLine += " " + words[i];
                    currentLineWidth = newWidth;
                } else {
                    displayLines.push(currentLine);
                    currentLine = words[i];
                    currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);
                }
            }
            displayLines.push(currentLine);

            var lines = displayLines.join("<br/>");
            var multiLineNodeHeight = 8 + (lineHeight * displayLines.length);
            el.css({
                height: multiLineNodeHeight + "px"
            });

            var labelElement = el.find(".palette_label");
            labelElement.html(lines);

            el.find(".palette_port").css({
                top: (multiLineNodeHeight / 2 - 5) + "px"
            });

            var popOverContent;
            try {
                var l = "<p><b>" + label + "</b></p>";
                if (label != type) {
                    l = "<p><b>" + label + "</b><br/><i>" + type + "</i></p>";
                }
                popOverContent = $(l + (info ? info : $("script[data-help-name|='" + type + "']").html() || "<p>" + RED._("palette.noInfo") + "</p>").trim())
                    .filter(function(n) {
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
        },
        canvas_redraw: function (event, ui) {
            var div_node = event.target;
            var fun = eval(div_node.type);

            var $node = ui.helper[0];
            var ctx = $("canvas", $node)[0].getContext("2d");
            fun(ctx, div_node.def);
        },
        canvas_flow: function (div_node, def) {
            div_node.classList.add("palette_symbol");
            var canvas = document.createElement("canvas");
            canvas.setAttribute("width", canvas_width);
            canvas.setAttribute('height', canvas_height);
            div_node.appendChild(canvas);
            var ctx = canvas.getContext("2d");

            var fun = eval(this.model.get('node_type'));
            fun(ctx, def);
        }
    });

    var PaletteView = Backbone.View.extend({
        el: $("#palette"),
        initialize: function() {
            this.categoryContainers = new CategoryContainerList();

            this.spinner = $(".palette-spinner");
            this.search = $("#palette-search-input");
            this.clear = $("#palette-search-clear");

            this.spinner.show();
            //todo:RED.settings
            this.search.val("");
        },
        events: {
            'focus #palette-search-input': () => RED.keyboard.disable(),
            'blur #palette-search-input': () => RED.keyboard.enable(),
            'click #palette-search-clear': 'searchClear',
            'keyup #palette-search-input': 'filterChange',
            'focus #palette-search-input': 'searchFocus',
            'click #palette-collapse-all': "collapseAll",
            'click #palette-expand-all':"expandAll"
        },
        collapseAll:function(e){
             e.preventDefault();
             this.categoryContainers.allOpen()
        },
        expandAll:function(e){
            e.preventDefault();
            this.categoryContainers.allClose()
        },
        searchClear:function(e){
            e.preventDefault();
            this.search.val("");
            this.filterChange();
            this.search.focus();
        },
        searchFocus:function(){
            $("body").one("mousedown", function() {
                this.search.blur();
            });
        },
        filterChange:function(){
            var val = this.search.val();
            if (val === "") {
                this.clear.hide();
            } else {
                this.clear.show();
            }

            var re = new RegExp(val, 'i');
            $(".palette_node").each(function (i, el) {
                var currentLabel = $(el).find(".palette_label").text();
                if (val === "" || re.test(el.id) || re.test(currentLabel)) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });

            this.categoryContainers.each(function(cc){
                var category = cc.get('category');
                if ($("#palette-container-"+category)
                        .find(".palette_node")
                        .filter(function () {
                            return $(this).css('display') !== 'none'
                        }).length === 0) {
                    cc.close();
                } else {
                    cc.open();
                }

            });

        }
    });

    return {
        init: init,
        add: addNodeType,
        remove: removeNodeType,
        hide: hideNodeType,
        show: showNodeType,
        refresh: refreshNodeTypes
    };

})();
