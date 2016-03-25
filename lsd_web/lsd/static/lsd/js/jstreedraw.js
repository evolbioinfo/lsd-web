var trees = []
var caches= []

function parse_newick(newick_str,curnode,pos,level){
    curnode.suc = [];
    curnode.tax = "";
    curnode.date_s = "";
    curnode.date_n = 0.0;
    curnode.brlen = 0.0;
    var children = 0;
    var match;
    while(pos < newick_str.length){
	var matchDate = newick_str.substr(pos).match(/^\[&date=(\d+(\.\d+){0,1})\]/);
	var matchBrlen = newick_str.substr(pos).match(/^\:(\d+(\.\d+){0,1}(e-\d+){0,1})/);
	if(newick_str.substr(pos,1) == "("){
	    //console.log("pos "+pos+" new node (");
	    //id++;
	    if(level==0){
		pos = parse_newick(newick_str,curnode,pos+1,level+1);
	    }else{
		curnode.suc[children] = {};
		children++;
		pos = parse_newick(newick_str,curnode.suc[children-1],pos+1,level+1);
	    }
	} else if(newick_str.substr(pos,1) == ")"){
	    //console.log("pos "+pos+" End Node )");
	    pos++;
	    return(pos);
	} else if(newick_str.substr(pos,1) == ","){
	    //console.log("pos "+pos+" Next Node ,");
	    pos++;
	} else if(matchDate != null){
	    //console.log(matchDate[0]+" "+matchDate[1]);
	    if(level==0){
		curnode.date_n = parseFloat(matchDate[1]);
	    }else{
		curnode.suc[children-1].date_n = parseFloat(matchDate[1]);
	    }
	    pos+=matchDate[0].length;
	} else if(matchBrlen != null){
	    // console.log(matchBrlen[0]);
	    if(level == 0){
		curnode.brlen = parseFloat(matchBrlen[1]);		
	    }else{
		curnode.suc[children-1].brlen = parseFloat(matchBrlen[1]);
	    }
	    pos+=matchBrlen[0].length;
	} else if(newick_str.substr(pos,1) == ";"){
	    console.log("pos "+pos+" End tree");
	    pos++;
	} else {
	    //console.log(" --> Taxon ?");
	    var match = newick_str.substr(pos).match(/^([^(\[\]\(\)\:;\,)]*)/);
	    // console.log(match[0]);
	    var lastnode = {};
	    lastnode.suc = [];
	    lastnode.tax = match[1];
	    lastnode.date_s = "";
	    lastnode.date_n = 0.0;
	    lastnode.brlen = 0.0;
	    curnode.suc[children] = lastnode;
	    children++;
	    pos += match[0].length;
	}
    }
}

function add_ids_to_json_tree(treejson,id){
    treejson.id = id;
    for(var n=0;n<treejson.suc.length;n++){
	id++;
	id = add_ids_to_json_tree(treejson.suc[n],id);
    }
    return id;
}

function clear_canvas(canvas,width,height,x_zoom,y_zoom){
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width*x_zoom, height*y_zoom);
}

function update_canvas(cache, canvas, height, x_zoom, y_zoom, x_offset, y_offset){
    // Create an empty project and a view for the canvas:
    if(! cache.y_zoom){
	y_zoom = 1;
    }
    if(! cache.x_zoom){
	x_zoom = 1;
    }
    y_offset = check_offset(y_offset, height, y_zoom);
    x_offset = check_offset(y_offset, $(canvas).width(), x_zoom);
    
    var ctx = canvas.getContext("2d");
    canvas.width  = cache.width;
    canvas.height = cache.height;

    for(var n = 0; n < cache.nodes.length;n++){
	ctx.beginPath();
	ctx.arc(cache.nodes[n].x * x_zoom + x_offset, cache.nodes[n].y * y_zoom + y_offset, cache.nodes[n].rad, 0,2*Math.PI);
	ctx.fillStyle = "#000000";
	ctx.fill();
	ctx.stroke();
    }

    for(var l = 0; l < cache.lines.length; l++){
        ctx.beginPath();
	ctx.moveTo(cache.lines[l].x1 * x_zoom + x_offset,cache.lines[l].y1 * y_zoom + y_offset);
	ctx.lineTo(cache.lines[l].x2 * x_zoom + x_offset,cache.lines[l].y2 * y_zoom + y_offset);
	ctx.strokeStyle= '#000000';
	ctx.lineWidth=2;
	ctx.lineCap = 'round';
	ctx.lineJoin= 'round';
	ctx.stroke();
    }

    // We draw a circle around the selected node
    if(cache.selected != null){
	ctx.beginPath();
	ctx.arc(cache.selected.x * x_zoom + x_offset, cache.selected.y * y_zoom + y_offset, 10, 0,2*Math.PI);
	//ctx.fillStyle = "#000000";
	ctx.strokeStyle= 'lightblue';
	ctx.lineWidth=4;
	//ctx.fill();
	ctx.stroke();
    }
    
    for(var t = 0; t < cache.texts.length; t++){
	ctx.beginPath();
	ctx.font = "10px Arial";
	ctx.fillStyle = '#000000';
	ctx.textAlign = "left";
	text = cache.texts[t].text;
	ctx.fillText(text,cache.texts[t].x * x_zoom - ctx.measureText(text).width - cache.texts[t].rad + x_offset,cache.texts[t].y  * y_zoom - 2-cache.texts[t].rad + y_offset);
    }

    for(var l=0; l< cache.labels.length;l++){
	ctx.beginPath();
	ctx.font = "12px Arial";
	ctx.fillStyle = '#000000';
	ctx.textAlign = "left";
	ctx.fillText(cache.labels[l].text,cache.labels[l].x * x_zoom + cache.labels[l].rad+2 + x_offset,cache.labels[l].y * y_zoom + 2+y_offset);
    }

    for(var sl = 0; sl < cache.scale_lines.length; sl++){
	// We draw the scale line
	ctx.beginPath();
	ctx.setLineDash([4, 4]);
	ctx.moveTo(cache.scale_lines[sl].x1 * x_zoom + x_offset, cache.scale_lines[sl].y1);// * y_zoom + y_offset);
	ctx.lineTo(cache.scale_lines[sl].x2 * x_zoom + x_offset, cache.scale_lines[sl].y2);// * y_zoom + y_offset);
	ctx.strokeStyle= 'grey';
	ctx.lineWidth=1;
	ctx.lineCap = 'round';
	ctx.lineJoin= 'round';
	ctx.stroke();
	ctx.setLineDash([]);
    }

    for(var st = 0; st < cache.scale_texts.length; st++){
	// We write the legend
	ctx.beginPath();
	ctx.font = "10px Arial";
	ctx.fillStyle = 'grey';
	ctx.textAlign = "left";
	ctx.fillText(cache.scale_texts[st].text,cache.scale_texts[st].x * x_zoom + x_offset,cache.scale_texts[st].y);// * y_zoom + y_offset);
    }
}

function check_offset(offset, length, zoom){
    var outoffset = offset;
    if(offset>0){
	outoffset = 0;
    } else if(offset < -(length*zoom-length)){
	outoffset = -length*zoom+length;
    }
    return outoffset;
}

function date_layout(cache, tree, width, height){
    var level=0;
    var border=40;
    var min_y=border;
    var curheight=height;
    var curwidth= width;
    var max_y=curheight-border;
    var max_num_disp_years=25;
    var root = tree;
    var point_radius=2;
    max_date = tree_max_date(tree);
    min_date = tree_min_date(tree);
    var total_terminals=count_terminals(tree);
    var y_dict={};

    cache.nodes = [];
    cache.lines = [];
    cache.scale_texts = [];
    cache.scale_lines = [];
    cache.labels = [];
    cache.texts = [];
    cache.width = width;
    cache.height = height;
    cache.x_zoom = false;
    cache.y_zoom = true;
    cache.index = new SpatialIndex(width,height);
    cache.selected = null;
    
    cache_y_coords(y_dict,root, curheight, border, 0, total_terminals);
    cache_scale(cache,min_date,max_date,width,curheight,border,max_num_disp_years);
    cache_coordinates(cache,root.id,root,y_dict,min_date,max_date,width,0,0,border,point_radius);
}

function count_terminals(node){
    var n=0
    var terminals=0
    if(!node || !node.suc || node.suc.length==0){
	terminals++
    }else{
	var terminals=0
	for(var n=0; n<node.suc.length;n++){
	    terminals += count_terminals(node.suc[n])
	}
    }
    return(terminals);
}

function tree_min_date(node){
    var mind = node.date_n
    if(node.suc.length==0){
	mind = node.date_n
    }else{
	for(var n=0; n<node.suc.length;n++){
	    mind = Math.min(mind,tree_min_date(node.suc[n]))
	}
    }
    return(mind);
}

function tree_max_date(node){
    var maxd = node.date_n
    if(!node || !node.suc || node.suc.length==0){
	maxd = node.date_n
    }else{
	for(var n=0; n<node.suc.length;n++){
	    maxd = Math.max(maxd,tree_max_date(node.suc[n]));
	}
    }
    return(maxd);

}

function cache_y_coords(y_dict, tree_node, height, border,num_terminal,total_terminals){
    if(!tree_node.suc || tree_node.suc.length==0){
        y_dict[tree_node.id]=num_terminal*((height-2*border)*1.0/(total_terminals-1))+border
        num_terminal+=1
    } else{
        var meany=0
        for(var n=0; n<tree_node.suc.length;n++){
	    num_terminal=cache_y_coords(y_dict,tree_node.suc[n],height,border,num_terminal,total_terminals)
            meany+=y_dict[tree_node.suc[n].id]
	}
	meany=meany*1.0/tree_node.suc.length
	y_dict[tree_node.id] = meany
    }
    return num_terminal
}

function cache_coordinates(cache, root_id,node,y_dict,min_date,max_date,width,prev_x,prev_y,border,point_radius){
    var middle=y_dict[node.id]
    //On ajoute les lignes verticales precedentes si non root
    // On prend la date et on calcul la position x
    var x_coord= (node.date_n-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border
    
    // On affiche le noeud
    cache.nodes.push({"x" : x_coord,"y":middle, "rad": point_radius});
    cache.index.add_node(node,x_coord,middle);
    
    //# On affiche la ligne horizontale
    if(node.id != root_id){
	cache.lines.push({"x1" : prev_x, "y1": prev_y, "x2": x_coord, "y2": middle});
    }

    // On affiche la date du noeud
    var year  = Math.floor(node.date_n)
    var month = node.date_n-year
    var month = Math.floor(month*12)+1
    var date  = year+"/"+pad(month,2)
    cache.texts.push({"text": date, "x" : x_coord, "y" : middle,"rad": point_radius});
    
    // On affiche le nom du noeud
    if(node.suc.length == 0){
	cache.labels.push({"text": node.tax, "x" : x_coord, "y" : middle,"rad": point_radius});
    }

    // On passe aux suivants
    for(var n=0;n<node.suc.length;n++){
	cache_coordinates(cache,root_id,node.suc[n],y_dict,min_date,max_date,width,x_coord,middle, border,point_radius)
    }
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function cache_scale(cache, min_date,max_date,width,height,border,max_num_disp_years){
    var max_year = Math.ceil(max_date)
    var min_year = Math.floor(min_date)
    var mod= Math.ceil((max_year-min_year)*1.0/max_num_disp_years)
    for(var year=min_year; year<=max_year; year++){
        if (year%mod==0){
            var x_coord= (year-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border
	    cache.scale_lines.push({"x1": x_coord, "y1": 0,"x2" : x_coord, "y2": height});
	    cache.scale_texts.push({"text": year,"x": x_coord, "y": 10});
	}
    }
}

function init_canvas(){
    $('.canvaswrapper').each(function(index,item){
	var height=500;
	var width=1000;
	var x_zoom=1;
	var y_zoom=1;
	var prevy=0;
	var prevx=0;
	var x_offset=0;
	var y_offset=0;
	var x_speed = 0;
	var y_speed = 0;
	var last_time = null;
	var still_down = false;
	var animation = null;

	var canvas = $(item).find("canvas").get(0);
	$(item).append("<input id=\"zoomslider_"+index+"\" type=\"range\" min=\"1\" max=\"20\" step=\"0.5\" value=\"1\" orient=\"vertical\"/>");
	$('#zoomslider_'+index).on("input change",function(){
	    var curzoom = $(this).val();
	    //console.log(canvas);
	    clear_canvas(canvas,$(canvas).width(),height,x_zoom,y_zoom);
	    x_zoom = curzoom;
	    y_zoom = curzoom;
	    y_offset = check_offset(y_offset, height, y_zoom);
	    x_offset = check_offset(y_offset, $(canvas).width(), x_zoom);

	    $("#valuezoom").html(y_zoom);
	    if(trees.length >= index){
		update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
		//draw_tree(canvas,trees[index],$(canvas).width(),height,zoom);
	    }
	});

	$(canvas).mousedown(function(e){
	    still_down = true;
	    prevy=e.pageY;
	    prevx=e.pageX;
	    last_time = Date.now();
	    if(animation != null){
		clearInterval(animation);
		animation = null;
	    }
	});

	$(canvas).mousemove(function(e){
	    if(still_down){
		y_offset-=(prevy-e.pageY);
		x_offset-=(prevx-e.pageX);
		if(last_time != null){
		    y_speed = (prevy-e.pageY) / ((Date.now() - last_time));
		    x_speed = (prevx-e.pageX) / ((Date.now() - last_time));
		}
		last_time = Date.now();
		prevy=e.pageY;
		prevx=e.pageX;
		y_offset = check_offset(y_offset, height, y_zoom);
		x_offset = check_offset(y_offset, $(canvas).width(), x_zoom);
		//console.log(x_offset);
		//console.log("Up at: "+e.pageY," ==> Offset: "+offset);
		//console.log("Speed = x:"+x_speed+" , y:"+y_speed);
		update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
		//draw_tree(canvas,trees[index],$(canvas).width(),height,zoom);
	    }
	});

	// Mouse Wheel Scroll
	$(canvas).on('wheel',function(e){
	    if(animation != null){
		clearInterval(animation);
		animation = null;
		y_speed = 0;
		x_speed = 0;
	    }
	    y_offset-= e.originalEvent.deltaY;
	    y_offset = check_offset(y_offset, height, y_zoom);
	    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
	    e.preventDefault();
	});

	$(canvas).on("mouseout mouseup",function(e){
	    if(animation === null && still_down){
		still_down=false;
		animation = setInterval(function(){
		    y_offset-=y_speed*10;
		    x_offset-=x_speed*10;
		    x_offset = check_offset(x_offset, $(canvas).width(), x_zoom);
		    y_offset = check_offset(y_offset, height, y_zoom);
		    //draw_tree(canvas,trees[index],$(canvas).width(),height,zoom);
		    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
		    //console.log("Animation: "+y_offset+ " Speed : "+y_speed);
		    y_speed /= 1.1;
		    x_speed /= 1.1;
		    if(Math.abs(y_speed) < 0.5 && Math.abs(x_speed) < 0.5){
			console.log("stop animation");
			clearInterval(animation);
			animation = null;
		    }
		},10);
	    }
	});

	// Mouse Wheel Scroll
	$(canvas).click(function(e){
	    console.log((e.offsetX)+" "+(e.offsetY));
 	    var zx = x_zoom;
	    var zy = y_zoom;
	    if(! caches[index].y_zoom){
		zy = 1;
	    }
	    if(! caches[index].x_zoom){
		zx = 1;
	    }
	    console.log(Math.floor((e.offsetX - x_offset)*1.0/zx)+" "+ Math.floor((e.offsetY - y_offset)*1.0/zy));
	    nodes = caches[index].index.get_nodes(Math.floor((e.offsetX - x_offset)*1.0/zx), Math.floor((e.offsetY - y_offset)*1.0/zy),5);
	    if(nodes.length == 0){
		caches[index].selected = null;
		$(canvas).trigger("node:unselected");
	    }else{
		for(i = 0; i < nodes.length; i++){
		    console.log("Found node : "+nodes[i].node.date_n+" : "+nodes[i].node.brlen+" : ("+nodes[i].node.tax+")");
		    caches[index].selected = nodes[i];
		}
		$(canvas).trigger("node:selected",[caches[index].selected.node]);
	    }
	    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
	});
	
	if(canvas.hasAttribute('data-url')){
	    var tree_url=$(canvas).data('url');
	    $.ajax({
		url: tree_url,
		type: 'GET',
		dataType: 'json',
		success: function(code_json,status){
		    trees[index] = code_json;
		    caches[index] = {};
		    date_layout(caches[index], trees[index], $(canvas).width(),height);
		    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
		    //draw_tree(canvas,trees[index],$(canvas).width(),height,zoom);
		}
	    });
	} else if(canvas.hasAttribute('data-json')) {
	    var treejson=$(canvas).data('json');
	    trees[index] = treejson
	    caches[index] = {};
	    date_layout(caches[index], trees[index], $(canvas).width(),height);
	    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
	    //draw_tree(canvas,trees[index],$(canvas).width(),height,zoom);
 	} else if (canvas.hasAttribute('data-newick')){
	    var treenewick = $(canvas).data('newick');
	    var treejson  = {};
	    parse_newick(treenewick,treejson,0,0);
	    add_ids_to_json_tree(treejson,0);
	    //console.log(JSON.stringify(treejson));
	    trees[index] = treejson;
	    caches[index] = {};
	    date_layout(caches[index], trees[index], $(canvas).width(),height);
	    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
	    //draw_tree(canvas,trees[index],$(canvas).width(),height,zoom);
	}
    });
}

// get mouse pos relative to canvas (yours is fine, this is just different)
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// Index, l'espace est divisé en carrés de 100 px de côté;
function SpatialIndex(width,height){
    this.resolution = 100;
    this.cols = Math.ceil(width/this.resolution);
    this.rows = Math.ceil(height/this.resolution);
    this.index = [];

    for(var x = 0; x < this.cols; x++){
	for(var y = 0; y < this.rows; y++){
	    this.index[y*this.cols+x] = [];
	}
    }
    
    this.add_node = function(tree_node, x, y){
	var ind = Math.floor(y/this.resolution)*this.cols + Math.floor(x/this.resolution);
	this.index[ind].push({"node": tree_node,"x":x,"y":y});
    }

    this.get_nodes = function(x, y, precision){
	var output = [];
	var ind = Math.floor(y/this.resolution)*this.cols + Math.floor(x/this.resolution);
	for(var i = 0; i < this.index[ind].length;i++){
	    var obj = this.index[ind][i];
	    if(Math.abs(obj.x-x)<=precision &&
	       Math.abs(obj.y-y)<=precision){
		output.push(obj);
	    }
	}
	return(output);
    }
}

$(document).ready(function(){
    init_canvas();
});

