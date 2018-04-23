/* Custom Extension Method */
(function($){
    
    $.customEvent = function (type, target) {
        var cache = {};
        
        return {
            fire: function(){
                var args = arguments;
                cache[type] && $.each(cache[type], function(idx){
                    
                    cache[type][idx].f.apply(cache[type][idx].c, args);

                });
            },
            subscribe: function(callback){
                
                if(!cache[type]) cache[type] = [];
                
                cache[type].push({f:callback, c:target});
            },
            unsubscribe: function(listener){
                cache[type] && $.each(cache[type], function(idx){
                        cache[type].splice(idx, 1);
                });
            }
        }
    };
	
})(jQuery);

TreeViewIndex = 1;

DynamicTree = function (options) {
    var me = this;
    var opts = $.extend(true, {
        className: 'DynamicTree',
        dragNode: true,
        dropNode: false,
        width: 200,
        height: 400,
        data: null, //[{value: "", text: "", children: [{value: "", text: ""}, dom: null], sortLevel: 0}]
        filter: false,
        keepExpandSpace: false,
        paddingTopHeight: 6
    }, options || {});

    this.onDrag = new $.customEvent("onDrag", this);
    this.onDragged = new $.customEvent("onDragged", this);
    this.onDrop = new $.customEvent("onDrop", this);
    this.onExpand = new $.customEvent("onExpand", this);
    this.onSelect = new $.customEvent("onSelect", this);
    this.onDoubleClick = new $.customEvent("onDoubleClick", this);
    this.onClick = new $.customEvent("onClick", this);

    /* private property */
    var id = "DynamicTree" + TreeViewIndex,
          data = null,
          nodeList = [], //All node
          tempList = [], //only showing node
          parent = null,
          currentNode,
          draggedNode,
          $scrollHeightDiv = null, //virtual scroll height
          $nodes = null,
          $filter = null,
          $container = null,
          $content = null,
          filterText = "",
          nodeHeight = 22,
          paddingTopHeight = opts.paddingTopHeight,//6,
          fiterHeight = nodeHeight + 6, //margin top
          visibleNum = Math.ceil((opts.height - (opts.filter ? nodeHeight : 0)) / nodeHeight),
          virtualNum = 0,
          scrollTop = 0,
          lastScrollTop = 0,
          scrollDivs = [],
          scrollNumber = 1,
          scrollMaxHeight = 100000;

    /* private methods */
    var _analyze = function (_data, _deep, _expand, _root) {
        /// <summary>
        /// put data into node List 
        /// </summary>
        /// <param name="_data">array</param>
        /// <param name="_deep">int</param>
        /// <param name="_expand">boolean</param
        /// <param name="_root">object</param>
        /// <param name="_drag">object</param>
        /// <returns type="">array</returns>

        var children = [];
        for (var i in _data) {
            children.push(nodeList.length);
            var temp = {
                index: nodeList.length,
                deepth: _deep || 1,
                expand: true,
                root: _root
            };
            for (var param in _data[i]) {
                temp[param] = _data[i][param];
            }
            nodeList.push(temp);

            if (_expand) {
                tempList.push(temp);
                virtualNum++;
            }
            temp.childrenIndex = _analyze(temp.children, temp.deepth + 1, temp.expand, temp);
        }
        return children;
    };
    var _setTempList = function () {
        /// <summary>
        /// create temp list by expand status
        /// </summary>
        var i = 0, l = nodeList.length, lastChildIndex = -1;

        tempList.length = 0;

        while (i < l) {
            if (!nodeList[i].hide) tempList.push(nodeList[i]);
            if (nodeList[i].expand) {
                i++;
            } else {
                getLastChildIndex(nodeList[i]);
                if (lastChildIndex > -1) {
                    i = lastChildIndex + 1;
                }
            }
        }
        virtualNum = tempList.length;

        function getLastChildIndex(node) {
            if (node.childrenIndex.length) {
                lastChildIndex = node.childrenIndex[node.childrenIndex.length - 1];
                getLastChildIndex(nodeList[node.childrenIndex[node.childrenIndex.length - 1]]);
            }
        }
    };
    var _rebulit = function () {
        /// <summary>
        /// bulit node by temp list
        /// </summary>
        var startIndex = Math.ceil(scrollTop / nodeHeight),
            endIndex = Math.min(tempList.length - 1, startIndex + visibleNum),
            index = Math.max(0, startIndex);

        $nodes.children().detach();

        while (index >= startIndex && index <= endIndex) {

            var node = new DynamicTree.Node({
                drag: (tempList[index].drag != undefined) ? tempList[index].drag : opts.dragNode,
                drop: (tempList[index].drop != undefined) ? tempList[index].drop : opts.dropNode,
                select: (tempList[index].select != undefined) ? tempList[index].select : true,
                hover: (tempList[index].hover != undefined) ? tempList[index].hover : true,
                data: tempList[index],
                id: id + ".Node" + tempList[index].index,
                index: tempList[index].index,
                expand: tempList[index].expand,
                keepExpandSpace: opts.keepExpandSpace
            });

            node.setStyle({ "padding-left": 20 * (tempList[index].deepth - 1) });
            if (currentNode && currentNode.getIndex() == node.getIndex()) {
                node.select();
                currentNode = node;
            }
            if (tempList[index].disable != undefined) {
                node.setEnable(!tempList[index].disable);
            }
            if (tempList[index].style != undefined) {
                node.setTextStyle(tempList[index].style);
            }
            node.onDrag.subscribe(function () {
                me.onDrag.fire(this);
            });
            node.onDragged.subscribe(function () {
                me.onDragged.fire(this);
            });
            node.onDrop.subscribe(function () {
                me.onDrop.fire(this);
            });
            node.onSelect.subscribe(function () {
                if (currentNode && currentNode != this) currentNode.unselect();
                currentNode = this;
                me.onSelect.fire(this);
            });
            node.onDoubleClick.subscribe(function () {
                if (currentNode && currentNode != this) currentNode.unselect();
                currentNode = this;
                me.onDoubleClick.fire(this);
            });
            node.onExpand.subscribe(function () {
                var idx = this.getIndex();
                nodeList[idx].expand = !nodeList[idx].expand;
                _setTempList();
                _rebulit();
                _createScrollHeight();
                me.onExpand.fire();
            });
            node.onClick.subscribe(function () {
                me.onClick.fire(this);
            });
            node.render($nodes);
            index++;
        }
    };
    var _createScrollHeight = function () {
        /// <summary>
        ///  redner serveral virtual scroll because div has maxnum height of the limitation.  
        /// </summary>
        for (var i in scrollDivs) {
            scrollDivs[i].detach();
        }
        scrollDivs.length = 0;
        var remaining = virtualNum * nodeHeight;
        do {
            var scrollDiv = $("<div/>")
                .css({ "width": 1, "height": Math.min(scrollMaxHeight, remaining) /*, "position": "relative", "float": "right", "background-color": "blue"*/ })
                .appendTo($content);
            scrollDivs.push(scrollDiv);
            remaining = remaining - scrollMaxHeight;
        } while (remaining > 0);
    };
    var _createFilter = function () {
        $filter = $("<div/>")
            .css({ "width": opts.width - 6 * 2 }) //margin left and right
            .addClass("filter")
            .insertBefore($content);
    };
    var _initailize = function () {
        data = opts.data;

        $container = $("<div/>")
            .attr("id", id)
            .css({ "width": opts.width, "height": opts.height })
            .addClass(opts.className);

        $content = $("<div/>")
            .css({ "width": opts.width, "height": opts.height - (opts.filter ? fiterHeight : 0) })
            .addClass("content")
            .on("scroll", onScroll)
            .appendTo($container);

        $nodes = $("<div/>")
            .css({ "margin-top": 0, "float": "left", "width": "" })
            .appendTo($content);

        if (opts.filter) {
            _createFilter();
        }
        _analyze(data, 1, true);
        _rebulit();
        _createScrollHeight();

        TreeViewIndex++;
    }();

    function onScroll(e) {
        scrollTop = $content.scrollTop();
        if (lastScrollTop == scrollTop) return;

        $nodes.css({ "margin-top": scrollTop });
        _rebulit();
        lastScrollTop = scrollTop;
    }
    /* public methods */
    $.extend(this, {

        setData: function (d, clearScrollTop) {
            if (clearScrollTop) {
                scrollTop = 0;
                lastScrollTop = 0;
                $nodes.css({ "margin-top": scrollTop });
            }

            data = d;
            virtualNum = 0;
            nodeList.length = 0
            tempList.length = 0;
            _analyze(data, 1, true);
            _rebulit();
            _createScrollHeight();

            if (opts.filter) {
                me.search([{ text: filterText, operator: "like" }]);
            }
        },

        getData: function () {
            return data;
        },

        getSelectedNode: function () {
            return currentNode;
        },

        getParent: function () {
            return parent;
        },

        render: function (node) {
            if (!node) return $.error("no dom to append");
            parent = node;
            $container.appendTo($(parent));
        },

        unrender: function () {
            $container.detach();
        },

        setEnable: function (b) {
            $container[b ? "removeClass" : "addClass"]("disable").attr("disabled", b ? "" : "disabled");
        },

        hide: function () {
            $container.hide();
        },

        show: function () {
            $container.show();
        },

        getValuePath: function (n) {
            /// <summary>
            /// get node's value path.
            /// </summary>
            /// <param name="n">DynamicTree.Node</param>
            /// <returns type="array"></returns>
            var node, rootArray = [];
            if (n instanceof DynamicTree.Node) {
                node = nodeList[n.getIndex()];
            } else if (currentNode instanceof DynamicTree.Node) {
                node = nodeList[currentNode.getIndex()];
            }
            if (node) {
                rootArray.push(node.value);
                var getRoot = function getRoot(n) {
                    if (n.root) {
                        rootArray.push(n.root.value);
                        getRoot(n.root);
                    }
                }(node);
            }
            return rootArray.reverse();
        },

        selecteNodeByValuePath: function (v, isSilent) {
            /// <summary>
            /// select node by value path.
            /// </summary>
            /// <param name="v">Array or String (ex:a,b,c)</param>
            /// <returns type="boolean"></returns>
            var path, node;
            if (v instanceof Array) {
                path = v;
            } else {
                path = v.toString().split(",");
            }
            for (var i in nodeList) {
                if (nodeList[i].value == path[0]) {
                    node = nodeList[i];
                    node.expand = true;
                    path.shift();
                    break;
                }
            }
            if (node) {
                while (path.length) {
                    for (var i in node.childrenIndex) {
                        if (nodeList[node.childrenIndex[i]].value == path[0]) {
                            node = nodeList[node.childrenIndex[i]];
                            node.expand = true;
                            break;
                        }
                    }
                    path.shift();
                }
                currentNode = new DynamicTree.Node({ index: node.index, data: node });
                _setTempList();

                var i = 0;
                for (i in tempList) {
                    if (tempList[i].index == node.index) {
                        break;
                    }
                }
                var targetScrollTop = nodeHeight * i;
                if (targetScrollTop < lastScrollTop || targetScrollTop > lastScrollTop + visibleNum * nodeHeight) {
                    $content.scrollTop(nodeHeight * i);
                } else {
                    _rebulit();
                }
                _createScrollHeight();

                if (!isSilent) this.onSelect.fire(currentNode);
                return true;
            } else {
                return false;
            }
        },

        selecteNodeByValue: function (v, isSilent) {
            /// <summary>
            /// select node by value.
            /// </summary>
            /// <param name="v">String</param>
            /// <returns type="boolean"></returns>
            var node;
            for (var i in nodeList) {
                if (nodeList[i].value == v) {
                    node = nodeList[i];
                    break;
                }
            }
            if (node) {
                var setRoot = function setRoot(d) {
                    if (d.root) {
                        d.root.expand = true;
                        setRoot(d.root);
                    }
                }(node);

                currentNode = new DynamicTree.Node({ index: node.index, data: node });
                _setTempList();

                var i = 0;
                for (i in tempList) {
                    if (tempList[i].index == node.index) {
                        break;
                    }
                }
                var targetScrollTop = nodeHeight * i;
                if (targetScrollTop < lastScrollTop || targetScrollTop > lastScrollTop + visibleNum * nodeHeight) {
                    $content.scrollTop(nodeHeight * i);
                } else {
                    _rebulit();
                }
                _createScrollHeight();

                if (!isSilent) this.onSelect.fire(currentNode);
                return true;
            } else {
                return false;
            }
        },

        getNodeByValue: function (v) {
            var node = null;
            for (var i in nodeList) {
                if (nodeList[i].value == v) {
                    node = nodeList[i];
                    break;
                }
            }

            return node;
        },

        unselecteNode: function (n) {
            var node = null;
            if (n instanceof DynamicTree.Node) {
                node = nodeList[n.getIndex()];
            } else if (currentNode instanceof DynamicTree.Node) {
                node = nodeList[currentNode.getIndex()];
            }
            if (node) {
                currentNode = null;
                _rebulit();
            }
        },

        enableNodesFuction: function (func, attr, value, enable) {
            /// <summary>
            ///  eanble / disable nodes drag status.
            /// </summary>
            /// <param name="func">array (disable, drag, select, hover)</param>
            /// <param name="attr">string</param>
            /// <param name="value">string</param>
            /// <param name="enable">boolean</param>
            if ($.inArray("disable", func) > -1) func = ["disable", "drag", "select", "hover"];
            for (var i in nodeList) {
                if (nodeList[i][attr] && nodeList[i][attr] == value) {
                    for (var j in func) {
                        nodeList[i][func[j]] = enable || false;
                    }
                }
            }
            _setTempList();
            _rebulit();
        },

        setNodesTextStyle: function (attr, value, style) {
            /// <summary>
            ///  set Nodes style
            /// </summary>
            /// <param name="attr">string</param>
            /// <param name="value">string</param>
            /// <param name="style">object</param>
            for (var i in nodeList) {
                if (nodeList[i][attr] && nodeList[i][attr] == value) {
                    nodeList[i].style = style;
                }
            }
            _setTempList();
            _rebulit();
        },

        search: function (attrs) {
            /// <summary>
            /// search node by attributes
            /// </summary>
            /// <param name="attrs">array [{type: "xxx", operator: "like"}, {id: "ooo", operator: "equal"}]</param>
            var setRoot = function setRoot(d) {
                if (d.root) {
                    d.root.expand = true;
                    d.root.hide = false;
                    setRoot(d.root);
                }
            };
            for (var i in nodeList) {
                for (var j in attrs) {
                    var op = attrs[j].operator || "equal";
                    for (var k in attrs[j]) {
                        if (k == "operator") continue;
                        if (attrs[j][k] == "" || nodeList[i][k] && (op == "equal" ? nodeList[i][k] == attrs[j][k] : (op == "like" ? nodeList[i][k].toString().toLowerCase().indexOf(attrs[j][k].toLowerCase()) > -1 : false))) {
                            setRoot(nodeList[i]);
                            nodeList[i].hide = false;
                        } else {
                            nodeList[i].hide = true;
                        }
                    }
                }
                if (!attrs || !attrs.length) {
                    nodeList[i].hide = false;
                }
            }
            _setTempList();
            _rebulit();
            _createScrollHeight();
        },

        reset: function (resetZero) {
            /// <summary>
            ///  IE need to reset scrollbar after set "display" to "none".
            /// </summary>
            if (resetZero) {
                $content.scrollTop(0);

                if (lastScrollTop == 0) return;

                scrollTop = 0;
                $nodes.css({ "margin-top": scrollTop });
                _rebulit();
                lastScrollTop = 0;
            } else {
                $content.scrollTop(lastScrollTop);
            }
        },

        enableFilter: function (b) {
            opts.filter = b;
            if (!$filter) {
                _createFilter();
            }
            $filter[b ? "show" : "hide"]();
            $content.css({ "height": opts.height - (opts.filter ? fiterHeight : 0) - paddingTopHeight });
            visibleNum = Math.ceil((opts.height - (opts.filter ? fiterHeight : 0)) / nodeHeight);
            _rebulit();
            _createScrollHeight();
        },

        setHeight: function (h) {
            opts.height = h;
            $container.css({ "height": opts.height });
            $content.css({ "height": opts.height - (opts.filter ? fiterHeight : 0) - paddingTopHeight });
            visibleNum = Math.ceil((opts.height - (opts.filter ? fiterHeight : 0)) / nodeHeight);
            _rebulit();
        },

        setWidth: function (w) {
            opts.width = w;
            $container.css({ "width": opts.width });
            $content.css({ "width": opts.width });
            if ($filter) $filter.css({ "width": opts.width });
            _rebulit();
        }
    });
};

DynamicTree.Node = function (options) {
    var me = this;
    var opts = $.extend(true, {
        className: 'DynamicTree-Node',
        drag: true,
        drop: false,
        data: null,  //{value: "", text: "", children: [{value: "", text: ""}]}
        index: 0,
        id: "",
        expand: true,
        select: true,
        hover: true,
        keepExpandSpace: false
    }, options || {});

    this.onSelect = new $.customEvent("onSelect", this);
    this.onDrag = new $.customEvent("onDrag", this);
    this.onDragged = new $.customEvent("onDragged", this);
    this.onDrop = new $.customEvent("onDrop", this);
    this.onExpand = new $.customEvent("onExpand", this);
    this.onDoubleClick = new $.customEvent("onDoubleClick", this);
    this.onClick = new $.customEvent("onClick", this);

    var data = null,
         $dom = null,
         $text = null,
         $container = null,
         $icon = null,
         parent = null;

    /* private methods */
    var initailize = function () {
        data = opts.data;

        $container = $("<div/>")
                                .attr("id", opts.id)
                                .addClass(opts.className);

        if (data.children instanceof Array) {

            $icon = $("<div/>").addClass("icon").appendTo($container);

            $icon.addClass(opts.expand ? "expand" : "collapse")
                    .data("expand", opts.expand)

            if (data.children.length > 0) {
                $icon.addClass("enable")
                        .on("click", onExpand)
                        .on("mousedown", onMousedown)
                        .on("mouseup", onMouseup);
            } else {
                $icon.addClass("disable")
            }
        } else {
            if (opts.keepExpandSpace) {
                $icon = $("<div/>").addClass("icon").addClass("blank").appendTo($container);
            }
        }

        if (data.dom) {
            $dom = $("<div/>")
                            .addClass("dom")
                            .data("value", data.value)
                            .append(data.dom)
                            .appendTo($container);
        }

        if (typeof data.text == "string") {
            $text = $("<div/>")
                            .addClass(opts.hover ? "text hover" : "text")
                            .text(data.text)
                            .on("mousedown", onMouseDown)
                            .on("click", onClick)
                            .on("dblclick", onDoubleClick)
                            .draggable({
                                helper: function () {
                                    var dragging = $("<div/>").addClass("dragging").data("value", data.value);
                                    var element = $(this).clone().addClass("dragging-bgcolor").text(data.text);
                                    var frame = $("<iframe/>").addClass("dragging-frame");

                                    dragging.append(frame).append(element);

                                    return dragging;
                                },
                                drag: function (event, ui) {

                                    // Keep the left edge of the element
                                    // at least 100 pixels from the container

                                    ui.position.left = event.pageX;
                                    ui.position.top = event.pageY - 65;
                                },
                                iframeFix: true,
                                disabled: !opts.drag,
                                start: onDrag,
                                stop: onDragged
                            }).droppable({
                                disabled: !opts.drop,
                                drop: onDrop
                            })
                            .appendTo($container);

        }
    }();

    function onMouseDown(e) {
        AttachEvent(document.body, "mouseup", mouseup, true);

        function mouseup() {
            DetachEvent(document.body, "mouseup", mouseup, true);
        }
    };
    function onClick(e) {
        if (me.select()) me.onSelect.fire();

        if ($container.attr("disabled") != "disabled") me.onClick.fire();
    };
    function onDoubleClick(e) {
        if (me.select()) me.onDoubleClick.fire();
    };
    function onDrag(e, ui) {
        me.onDrag.fire();
    };
    function onDragged(e, ui) {
        me.onDragged.fire();
    }
    function onDrop(e, ui) {
        me.onDrop.fire();
    };
    function onExpand(e) {
        opts.expand = $icon.data("expand");
        $icon.data("expand", !opts.expand);
        if (opts.expand) {
            $icon.toggleClass("collapse").toggleClass("expand");
        } else {
            $icon.toggleClass("expand").toggleClass("collapse");
        }
        me.onExpand.fire();
    };
    function onMousedown() {
        $icon.toggleClass("md");
    };
    function onMouseup() {
        $icon.toggleClass("md");
    };
    $.extend(this, {

        getIndex: function () {
            return opts.index;
        },

        setData: function (d) {
            data = d;
        },

        getData: function () {
            return data;
        },

        getValue: function () {
            return data.value;
        },

        getParent: function () {
            return parent;
        },

        render: function (node) {
            if (!node) return $.error("no dom to append");
            parent = node;
            $container.appendTo($(parent));
        },

        unrender: function () {
            $container.detach();
        },

        select: function () {
            if ($container.attr("disabled") != "disabled" && opts.select) {
                $container.data("select", true).addClass("selected");
                return true;
            }
            return false;
        },

        unselect: function () {
            $container.data("select", false).removeClass("selected");
        },

        isSelected: function () {
            return ($container.data("select"));
        },

        isExpanded: function () {
            return ($icon && $icon.data("expand"));
        },

        setStyle: function (s) {
            $container.css(s);
        },

        setTextStyle: function (s) {
            $text && $text.css(s);
        },

        setEnable: function (b) {
            $container[b ? "removeClass" : "addClass"]("disable").attr("disabled", b ? "" : "disabled");
        },

        hide: function () {
            $container.hide();
        },

        show: function () {
            $container.show();
        }
    });
};
