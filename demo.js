<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title></title>
    <script type="text/javascript" src="external/jquery-2.1.4.min.js"></script>
    <script type="text/javascript" src="external/jquery-ui.min.js"></script>
    <script type="text/javascript" src="library/aui.ui/DynamicTree.js"></script>
    <link rel="Stylesheet" type="text/css" href="resources/css/aui.ui/DynamicTree.css" />
</head>
<body>
    <div id="ap">
    </div>
</body>
<script type="text/javascript">

    window.onload = function () {

        //var pie = new GradientPie();
        //pie.render(document.getElementById("ap"));
        //pie.setValue(0.4);

        var tempData = [], tempData1 = [], tempData2 = [], tempData3 = [], tempData4 = [], tempData5 = [];
        var max = 10;

        for (var i = 1; i <= max; i++) {
            tempData3.push({ value: "3" + i, text: "deepth 3 - index" + i, type: "aa", children: tempData2.slice(0) });
        }
        for (var i = 1; i <= max; i++) {
            tempData4.push({ value: "4" + i, text: "deepth 2 - index" + i, type: "bb", children: tempData3.slice(0) });
        }
        for (var i = 1; i <= max; i++) {
            var $t = $("<div/>").text("@").css({ "background-color": "red", "width": 20, "display": "inline-block" });
            tempData5.push({ value: "5" + i, text: "deepth 1 - indexindexindexindexindexindex" + i, type: "cc", children: tempData4.slice(0), dom: $t });
        }
        var node1 = new DynamicTree({ data: tempData5, filter: false /*[{value: 1, text: 1, children: [{value: 11, text: 11}]}, {value: 2, text: 2}]*/ });
        node1.render(document.getElementById("ap"));     
    }
    window.onresize = function () {

    }

</script>
</html>
