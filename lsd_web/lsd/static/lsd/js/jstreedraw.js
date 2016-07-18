var trees = [];
var caches= [];

var input_tree;
var outgroup_ancestor = null;


// It drawText() to write
// to its own canvas, and uses drawImage() for each call to the main canvas.
// Initially created to test vertical text but you dont have to use that.
// You can simplify it by editing `drawVertical`
// If you do change it to draw normal lines of text, you'll have to also do some
// width measurements (measureText, etc), to size the extra canvases correctly.

// for laziness, font size will just be something we pass in
function TextHorizontalCanvas(context, text, font,fontsize) {
    this.text = text;
    this.font = font;
    this.fontsize = fontsize;
    
    // We need a new canvas for each instance of TextVerticalCanvas
    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = 300;
    this.tempCanvas.height = 50;
    this.tempCtx = this.tempCanvas.getContext('2d');
    this.tempCtx.fillStyle = context.fillStyle;
    this.tempCtx.font      = this.font;
    this.tempCtx.textAlign = "left";
    this.textWidth = this.tempCtx.measureText(this.text).width;

    // This is lazy. In the real world it should be an invalidation,
    // making the tempCanvas remeasure itself each time the text or font changed.
    // But for the test this will do.
    this.firstTime = true;
}

TextHorizontalCanvas.prototype.draw  = function(context, x, y) {
    if (this.firstTime) {
	//console.log("textw: "+this.textWidth+" - text: "+this.text+" - w: "+this.tempCanvas.width+" - h: "+this.tempCanvas.height+" - x : "+x+" - y: "+y);
	// draw text onto the temporary context
	this.tempCtx.font      = this.font;
	this.tempCtx.fillText(this.text, 0, this.fontsize);
	this.firstTime = false;
    }
    context.drawImage(this.tempCanvas, x, y-this.fontsize+1);
}

function NewickException(message) {
   this.message = message;
   this.name = "NewickException";
}

function delete_zero_length_branches(treejson){
    var childs = [];
    for(var n=0;n<treejson.suc.length;n++){
	delete_zero_length_branches(treejson.suc[n]);
	// for each not terminal children with 0 brlen
	if(treejson.suc[n].brlen == 0 && treejson.suc[n].suc.length>0) {
	    for(var n2=0;n2<treejson.suc[n].suc.length;n2++) {
		childs.push(treejson.suc[n].suc[n2]);
	    }
	} else {
	    childs.push(treejson.suc[n]);
	}
    }
    treejson.suc = childs;
}

/** Returns true if the tree is rooted:
    i.e. the root has 2 child
    Otherwise, we can consider it unrooted
*/
function is_rooted(tree){
    return(tree.suc.length == 2);
}

function new_node(parentNode){
    return {parent:parentNode,
	    suc : [],
	    date_n : 0,
	    date_min:0,
	    date_max:0,
	    date_s : "",
	    brlen : 0,
	    tax : ""}
}

function to_newick(tree){
    var output = to_newick_recur(tree);
    return(output+";");
}

function to_newick_recur(tree){
    var i;
    if(tree.suc.length == 0)
	return tree.tax;
    var output =  "(";
    for(i=0; i<tree.suc.length;i++){
	if(i>0) output += ",";
	output += to_newick_recur(tree.suc[i])+":"+tree.suc[i].brlen;
    }
    output += ")";
    return(output);
}

function parse_newick(newick_str, curnode, pos, level){
    curnode.suc = [];
    curnode.tax = "";
    curnode.date_s = "";
    curnode.date_min = 0.0;
    curnode.date_max = 0.0;
    curnode.date_n = 0.0;
    curnode.brlen = 0.0;
    var children = 0;
    var match;
    while(pos < newick_str.length){
	var matchDate = newick_str.substr(pos).match(/^\[&date=(\d+(\.\d+){0,1})\]/);
	var matchBrlen = newick_str.substr(pos).match(/^\:(\d+(\.\d+){0,1}(e-\d+){0,1})/);
	if(pos==0 && newick_str.substr(pos,1) != "("){
	    throw new NewickException("Newick file does not start with a \"(\" (Maybe not a Newick file?)");
	}
	if(newick_str.substr(pos,1) == "("){
	    //id++;
	    if(level==0){
		pos = parse_newick(newick_str,curnode,pos+1,level+1);
	    }else{
		curnode.suc[children] = new_node(curnode);
		children++;
		pos = parse_newick(newick_str,curnode.suc[children-1],pos+1,level+1);
	    }
	} else if(newick_str.substr(pos,1) == ")"){
	    //console.log("pos "+pos+" End Node )");
	    pos++;
	    // console.log("): level: "+(level-1))
	    if((level-1)<0){
		throw new NewickException("Mismatched parentheses in Newick File (Maybe not a Newick file?)");
	    }
	    return(pos);
	} else if(newick_str.substr(pos,1) == ","){
	    //console.log("pos "+pos+" Next Node ,");
	    pos++;
	} else if(matchDate != null){
	    //console.log(matchDate[0]+" "+matchDate[1]);
	    if(level==0){
		curnode.date_n = parseFloat(matchDate[1]);
		curnode.date_min= curnode.date_n;
		curnode.date_max= curnode.date_n;
	    }else{
		curnode.suc[children-1].date_n = parseFloat(matchDate[1]);
		curnode.suc[children-1].date_min= curnode.suc[children-1].date_n;
		curnode.suc[children-1].date_max= curnode.suc[children-1].date_n;
	    }
	    pos+=matchDate[0].length;
	    var matchCI = newick_str.substr(pos).match(/^\[&CI=\"(\d+(\.\d+){0,1})\((\d+(\.\d+){0,1}),(\d+(\.\d+){0,1})\)\"\]/);
	    if(matchCI != null){
		if(level==0){
		    curnode.date_min= parseFloat(matchCI[3]);
		    curnode.date_max= parseFloat(matchCI[5]);
		}else{
		    curnode.suc[children-1].date_min= parseFloat(matchCI[3]);
		    curnode.suc[children-1].date_max= parseFloat(matchCI[5]);
		}
		pos += matchCI[0].length;
	    }
	} else if(matchBrlen != null){
	    // console.log(matchBrlen[0]);
	    if(level == 0){
		curnode.brlen = parseFloat(matchBrlen[1]);		
	    }else{
		curnode.suc[children-1].brlen = parseFloat(matchBrlen[1]);
	    }
	    pos+=matchBrlen[0].length;
	} else if(newick_str.substr(pos,1) == ";"){
	    // console.log("pos "+pos+" End tree"+" level: "+level);
	    if(level!=0){
		throw new NewickException("Mismatched parentheses in Newick File (Maybe not a Newick file?)");
	    }
	    pos++;
	    return(pos);
	} else {
	    // console.log(" --> Taxon ?");
	    var match = newick_str.substr(pos).match(/^([^(\[\]\(\)\:;\,)]*)/);
	    // console.log(match[0]+" "+match[1]);
	    var lastnode = new_node(curnode);
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
    throw new NewickException("Reached end of file without a \";\"");
}

function reroot_from_outgroup(tree, outgroup, deleteoutgroup){
    var a = get_ancestor(outgroup);
    var new_tree = reroot(tree, a);
    var i;
    if(deleteoutgroup){
	for(i = 0; i < new_tree.suc.length; i++){
	    if(new_tree.suc[i] != a){
		new_tree.suc[i].parent = null;
		return new_tree.suc[i];
	    }
	}
    }
    return new_tree;
}

/** 
    Reroot the tree in the middle of the branch 
    connecting node to its parent 
*/
function reroot(root, node){
    var dist, new_root, parent_bk, parent_bk2, parent_bk3, i, di, dist_bk, root_bk, j, k;
    
    dist = node.brlen / 2;
    dist_bk = node.brlen;
    new_root = new_node(null);
    root_bk = new_root;
    new_root.suc[0] = node;
    new_root.suc[0].brlen = dist;
    parent_bk = node.parent;
    new_root.suc[0].parent = new_root;

    /* We get the position of the node in the array */
    for(i=0; i < parent_bk.suc.length; i++)
	if(parent_bk.suc[i] == node)
	    break;

    new_root.suc[1] = parent_bk;
    di = parent_bk.brlen;
    parent_bk.brlen = dist_bk - dist;
    parent_bk2 = parent_bk.parent;
    parent_bk.parent = new_root;

    while (parent_bk2 != null){
	parent_bk3 = parent_bk2.parent;   /* store r's parent */
	parent_bk.suc[i] = parent_bk2;  /* change r to p's child */
	for (i = 0; i < parent_bk2.suc.length; ++i) /* update i */
	    if (parent_bk2.suc[i] == parent_bk) break;
	parent_bk2.parent = parent_bk; /* update r's parent */
	dist_bk = parent_bk2.brlen; parent_bk2.brlen = di; di = dist_bk; /* swap r->d and d, i.e. update r->d */
	root_bk = parent_bk; parent_bk = parent_bk2; parent_bk2 = parent_bk3; /* update p, q and r */
    }
    if (parent_bk.suc.length == 2) { /* remove p and link the other child of p to q */
	parent_bk2 = parent_bk.suc[1 - i]; /* get the other child */
	for (i = 0; i < root_bk.suc.length; ++i) /* the position of p in q */
	    if (root_bk.suc[i] == parent_bk) break;
	parent_bk2.brlen += parent_bk.brlen;
	parent_bk2.parent = root_bk;
	root_bk.suc[i] = parent_bk2; /* link r to q */
    } else{
	for (j = k = 0; j < parent_bk.suc.length; ++j) {
	    parent_bk.suc[k] = parent_bk.suc[j];
	    if (j != i) ++k;
	}
	--parent_bk.suc.length;
    }
    return new_root;
}

/* Returns all taxa nodes linked to this internal node */
function get_taxas(node){
    var i;
    if( node.suc.length == 0)
	return([node]);
    var nodes = [];
    for(i=0; i < node.suc.length; i++){
	var h, sucnodes = get_taxas(node.suc[i]);
	for(h = 0; h < sucnodes.length; h++){
	    nodes.push(sucnodes[h]);
	}
    }
    return(nodes);
}

function get_taxas_string(node){
    var taxStr = [];
    var i;
    var taxnodes = get_taxas(node);
    for(i=0;i<taxnodes.length;i++){
	taxStr.push(taxnodes[i].tax);
    }
    return taxStr;
}


function node_from_taxnames(tree,taxnames){
    var i, j, taxnodes, outnodes = [];
    taxnodes = get_taxas(tree);
    for(i = 0; i < taxnames.length ; i++)
	for(j = 0; j<taxnodes.length ; j++)
	    if(taxnodes[j].tax == taxnames[i]){
		outnodes.push(taxnodes[j]);
		break;
	    }
    return outnodes;
}

/*
  Returns true if all nodes of the subset are in the nodes
*/
function compare_nodes(nodes, nodesSubSet){
    var found , i, j;
    for(j = 0; j< nodesSubSet.length; j++){
	found = false;
	for(i = 0; i < nodes.length; i++){
	    if(nodes[i] == nodesSubSet[j]){
		found = true;
		break;
	    }
	}
	if(!found)
	    return false;
    }
    return true;
}

/* 
   returns the internal node common ancestor of all nodes in argument 
   Considers the tree as rooted
*/
function get_ancestor(nodes){
    if(nodes.length == 0)
	return null;
    
    var node = nodes[0];
    while(!compare_nodes(get_taxas(node),nodes) && node!=null){
	node = node.parent;
    }
    
    return node;
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
    x_offset = check_offset(x_offset, $(canvas).width(), x_zoom);
    
    var ctx = canvas.getContext("2d");
    canvas.width  = cache.width;
    canvas.height = cache.height;

    // If too many taxa compared to zoom : We do not display tax names
	for(var n = 0; n < cache.ci_lines.length;n++){
	    ctx.beginPath();
	    ctx.moveTo(cache.ci_lines[n].x1 * x_zoom + x_offset,cache.ci_lines[n].y1 * y_zoom + y_offset);
	    ctx.lineTo(cache.ci_lines[n].x2 * x_zoom + x_offset,cache.ci_lines[n].y2 * y_zoom + y_offset);
	    ctx.strokeStyle= '#33c15f';
	    ctx.lineWidth=4;
	    ctx.lineCap = 'round';
	    ctx.lineJoin= 'round';
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

    // If too many taxa compared to zoom : We do not display all tax names
    // One on x taxa to display if the zoom is not enough
    var minpixels = 12;
    var ntax = cache.nodes.length;
    var pixelspertaxa = ((height-2*cache.border) / ntax * y_zoom);
    var numdisp = ntax * pixelspertaxa / minpixels;
    var xtaxa = Math.max(1,Math.floor(ntax/numdisp));
    // for(var n = 0; n < cache.nodes.length;n++){
    // 	if(n%xtaxa == 0){
    // 	    ctx.beginPath();
    // 	    ctx.arc(cache.nodes[n].x * x_zoom + x_offset, cache.nodes[n].y * y_zoom + y_offset, cache.nodes[n].rad, 0,2*Math.PI);
    // 	    ctx.fillStyle = "#000000";
    // 	    ctx.strokeStyle= '#000000';
    // 	    ctx.lineWidth=2;
    // 	    ctx.fill();
    // 	    ctx.stroke();
    // 	}
    // }
    
    for(var t = 0; t < cache.texts.length; t++){
	if(t%xtaxa == 0){
    	    ctx.fillStyle = '#000000';
	    ctx.strokeStyle = '#000000';
	    
	    var text = cache.texts[t].text;
	    var txtctx;
	    if(! cache.text_ctx[t]){
		txtctx = new TextHorizontalCanvas(ctx, text, "10px Calibri",10);
		cache.text_ctx[t] = txtctx;
	    }else{
		txtctx = cache.text_ctx[t];
	    }
	    txtctx.draw(ctx, cache.texts[t].x * x_zoom - txtctx.textWidth - cache.texts[t].rad + x_offset,cache.texts[t].y  * y_zoom - 2-cache.texts[t].rad + y_offset);
	}
    }
	
    for(var l=0; l< cache.labels.length;l++){
	if(l%xtaxa == 0){
	    var text=cache.labels[l].text;
	    var txtctx;
	    if(! cache.label_ctx[l]){
		txtctx = new TextHorizontalCanvas(ctx, text, "10px Calibri",10);
		cache.label_ctx[l] = txtctx;
	    }else{
		txtctx = cache.label_ctx[l];
	    }
	    txtctx.draw(ctx, cache.labels[l].x * x_zoom + cache.labels[l].rad+2 + x_offset,cache.labels[l].y * y_zoom + 2+y_offset);
	}
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
	ctx.font = "12px Calibri";
	ctx.fillStyle = 'grey';
	ctx.textAlign = "left";
	ctx.fillText(cache.scale_texts[st].text,cache.scale_texts[st].x * x_zoom + x_offset,cache.scale_texts[st].y);// * y_zoom + y_offset);
    }

    
    // We display informations about the selected node
    if(cache.selected != null){
	ctx.fillStyle = "#e8e6e6";
	//ctx.strokeStyle= '#8f8d8d';
	ctx.strokeStyle= '#000000';
	ctx.lineWidth=1;
	ctx.fillRect($(canvas).width()-170,height-60,$(canvas).width(),height);
	ctx.font = "normal normal bolder 12px Calibri";
	ctx.fillStyle = 'grey';
	ctx.textAlign = "left";
	if(cache.selected.node.suc.length==0){
	    ctx.fillText("Taxon: "+cache.selected.node.tax,$(canvas).width()-168,height-60+12);// * y_zoom + y_offset);
	}else{
	    ctx.fillText("Internal Node",$(canvas).width()-168,height-60+12);// * y_zoom + y_offset);
	}
	var year  = Math.floor(cache.selected.node.date_n);
	var month = cache.selected.node.date_n-year;
	var month = Math.floor(month*12)+1;
	var date  = year+"/"+pad(month,2);
	ctx.fillText("Date: "+date,$(canvas).width()-168,height-60+24);// * y_zoom + y_offset);
	if(cache.selected.node.date_min != cache.selected.node.date_max){
	    year  = Math.floor(cache.selected.node.date_min);
	    month = cache.selected.node.date_min-year;
	    month = Math.floor(month*12)+1;
	    var mindate  = year+"/"+pad(month,2);
	    year  = Math.floor(cache.selected.node.date_max);
	    month = cache.selected.node.date_max-year;
	    month = Math.floor(month*12)+1;
	    var maxdate  = year+"/"+pad(month,2);
	    ctx.fillText("Confidence: ["+mindate+","+maxdate+"]",$(canvas).width()-168,height-60+36);// * y_zoom + y_offset);
	}
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
    var tree_border=0;
    var canvas_border=40;
    var min_y=tree_border;
    var curheight=height-2 * canvas_border;
    var curwidth= width -2 * canvas_border;
    var max_y=curheight-tree_border;
    var max_num_disp_years=25;
    var root = tree;
    var point_radius=1.5;
    max_date = tree_max_date(tree);
    min_date = tree_min_date(tree);
    var total_terminals=count_terminals(tree);
    var y_dict={};

    cache.nodes    = [];
    cache.lines    = [];
    cache.ci_lines = [];
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
    cache.text_ctx = [];
    cache.label_ctx = [];
    cache.border = canvas_border;
    cache_y_coords(y_dict,root, height, canvas_border, 0, total_terminals);
    cache_scale(cache,min_date,max_date,width,height,canvas_border,max_num_disp_years);
    cache_coordinates(cache,root.id,root,y_dict,min_date,max_date,width,0,0,canvas_border,point_radius);
    cache_ci_coords(cache,root.id,root,y_dict,min_date,max_date,width,0,0,canvas_border,point_radius);
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
    var mind = node.date_min
    if(node.suc.length==0){
	mind = node.date_min
    }else{
	for(var n=0; n<node.suc.length;n++){
	    mind = Math.min(mind,tree_min_date(node.suc[n]))
	}
    }
    return(mind);
}

function tree_max_date(node){
    var maxd = node.date_max
    if(!node || !node.suc || node.suc.length==0){
	maxd = node.date_max
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
    var x_coord= (node.date_n-min_date) * (width-2*border) * 1.0 / (max_date-min_date) + border

    
    // On affiche le noeud
    cache.nodes.push({"x" : x_coord,"y":middle, "rad": point_radius});
    //console.log("add node: ",x_coord+" "+middle);
    cache.index.add_node(node,x_coord,middle);
    
    //# On affiche la ligne horizontale
    if(node.id != root_id){
	// cache.lines.push({"x1" : prev_x, "y1": prev_y, "x2": x_coord, "y2": middle});
        cache.lines.push({"x1": prev_x, "y1" : prev_y,"x2": prev_x,"y2": middle});
    }
    cache.lines.push({"x1":prev_x,"y1":middle,"x2":x_coord,"y2":middle});

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

function cache_ci_coords(cache, root_id,node,y_dict,min_date,max_date,width,prev_x,prev_y,border,point_radius){
    var middle=y_dict[node.id]

    //On ajoute les lignes verticales precedentes si non root
    // On prend la date et on calcul la position x
    var x_coord= (node.date_n-min_date) * (width-2*border) * 1.0 / (max_date-min_date) + border
    var min_x_coord = (node.date_min-min_date) * (width-2*border) * 1.0 / (max_date-min_date) + border
    var max_x_coord = (node.date_max-min_date) * (width-2*border) * 1.0 / (max_date-min_date) + border
    //# On affiche la ligne horizontale
    if(node.date_min<node.date_max){
	cache.ci_lines.push({"x1":min_x_coord,"y1":middle,"x2":max_x_coord,"y2":middle});
    }
    
    // On passe aux suivants
    for(var n=0;n<node.suc.length;n++){
	cache_ci_coords(cache,root_id,node.suc[n],y_dict,min_date,max_date,width,x_coord,middle, border,point_radius)
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
            var x_coord= (year-min_date) * (width-2*border) * 1.0 / (max_date-min_date) + border
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
		x_offset = check_offset(x_offset, $(canvas).width(), x_zoom);
		update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
		e.preventDefault();
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

	    // For the zoom to be centered on the middle of the canvas
	    var oldheight = y_zoom*height;
	    var oldwidth = x_zoom*$(canvas).width();
	    var y_offsetfactor = (-y_offset+height/2)/(y_zoom*height);
	    var x_offsetfactor = (-x_offset+height/2)/(x_zoom*height);
	    
	    // Zoom factor
	    if(e.originalEvent.deltaY > 0){
		x_zoom -= 1;
		y_zoom -= 1;
	    }else{
		x_zoom += 1;
		y_zoom += 1;
	    }
	    if(x_zoom < 1){
		x_zoom = 1;
	    }
	    if(y_zoom < 1){
		y_zoom = 1;
	    }
	    
	    // For the zoom to be centered on the middle
	    var newheight = y_zoom*height;
	    var newwidth  = x_zoom*$(canvas).width();
	    y_offset -= (newheight-oldheight)*y_offsetfactor;
	    x_offset -= (newwidth-oldwidth)*x_offsetfactor;
	    
	    // Update Canvas
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
			//console.log("stop animation");
			clearInterval(animation);
			animation = null;
		    }
		},10);
	    }
	});

	// Mouse Wheel Scroll
	$(canvas).click(function(e){
 	    var zx = x_zoom;
	    var zy = y_zoom;
	    if(! caches[index].y_zoom){
		zy = 1;
	    }
	    if(! caches[index].x_zoom){
		zx = 1;
	    }
	    x_offset = check_offset(x_offset, $(canvas).width(), zx);
	    y_offset = check_offset(y_offset, height, zy);
	    nodes = caches[index].index.get_nodes(((e.offsetX - x_offset)*1.0/zx), ((e.offsetY - y_offset)*1.0/zy),5/zx, 5/zy);
	    if(nodes.length == 0){
		caches[index].selected = null;
		$(canvas).trigger("node:unselected");
	    }else{
		for(i = 0; i < nodes.length; i++){
		    caches[index].selected = nodes[i];
		}
		$(canvas).trigger("node:selected",[caches[index].selected.node]);
	    }
	    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
	});
	
	if(canvas.hasAttribute('data-json-url')){
	    var tree_url=$(canvas).data('json-url');
	    $.ajax({
		url: tree_url,
		type: 'GET',
		dataType: 'json',
		success: function(code_json,status){
		    trees[index] = code_json;
		    delete_zero_length_branches(trees[index]);
		    caches[index] = {};
		    date_layout(caches[index], trees[index], $(canvas).width(),height);
		    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
		}
	    });
	} else if(canvas.hasAttribute('data-newick-url')){
	    var tree_url=$(canvas).data('newick-url');
	    $.ajax({
		url: tree_url,
		type: 'GET',
		dataType: 'text',
		success: function(code_newick,status){
		    var treenewick = code_newick;
		    var treejson = {};
		    parse_newick(treenewick,treejson,0,0);
		    delete_zero_length_branches(treejson);
		    add_ids_to_json_tree(treejson,0);
		    trees[index] = treejson;
		    caches[index] = {};
		    date_layout(caches[index], trees[index], $(canvas).width(),height);
		    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
		}
	    });
	} else if(canvas.hasAttribute('data-json')) {
	    var treejson=$(canvas).data('json');
	    trees[index] = treejson
	    caches[index] = {};
	    date_layout(caches[index], trees[index], $(canvas).width(),height);
	    delete_zero_length_branches(trees[index]);
	    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
 	} else if (canvas.hasAttribute('data-newick')){
	    var treenewick = $(canvas).data('newick');
	    var treejson  = {};
	    parse_newick(treenewick,treejson,0,0);
	    delete_zero_length_branches(treejson);
	    add_ids_to_json_tree(treejson,0);
	    //console.log(JSON.stringify(treejson));
	    trees[index] = treejson;
	    caches[index] = {};
	    date_layout(caches[index], trees[index], $(canvas).width(),height);
	    update_canvas(caches[index], canvas, height, x_zoom, y_zoom, x_offset, y_offset);
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
    this.cols = Math.ceil(width*1.0/this.resolution+1);
    this.rows = Math.ceil(height*1.0/this.resolution+1);
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

    this.get_nodes = function(x, y, x_precision,y_precision){
	var output = [];
	var ind = Math.floor(y/this.resolution)*this.cols + Math.floor(x/this.resolution);
	for(var i = 0; i < this.index[ind].length;i++){
	    var obj = this.index[ind][i];
	    if(Math.abs(obj.x-x)<=x_precision &&
	       Math.abs(obj.y-y)<=y_precision){
		output.push(obj);
	    }
	}
	return(output);
    }
}

/* We read the file when it is */
function init_tree_reader(){
    $("#rootedtreediv").hide();
    $("#unrootedtreediv").hide();
    $('#inputtree').change(function(){
	var $input = $(this);
	var inputFiles = this.files;
	if(inputFiles == undefined || inputFiles.length == 0) return;
	var inputFile = inputFiles[0];
	var reader = new FileReader();
	reader.onload = function(event) {
	    try {
		input_tree = new_node(null);
		parse_newick(event.target.result,input_tree,0,0);
		$("#inputtreestring").val(to_newick(input_tree));
		$("#treeinfo").show();	    
		if(is_rooted(input_tree)){
		    $("#rootedtreediv").show();
		    $("#unrootedtreediv").hide();
		    $("#estimaterootselect").empty();
		    $("#estimaterootselect").append("<option value=\"no\" selected>No</option>");
		    $("#estimaterootselect").append("<option value=\"l\">Around the given root</option>");
		    $("#estimaterootselect").append("<option value=\"a\">Searches on all branches</option>");
		    $("#nooutgroupselect").show();
		}else{
		    $("#unrootedtreediv").show();
		    $("#rootedtreediv").hide();		
		    $("#estimaterootselect").empty();
		    $("#estimaterootselect").append("<option value=\"a\" selected>Searches on all branches</option>");
		    $("#nooutgroupselect").hide();
		}
		
		var taxa = get_taxas_string(input_tree);
		var i;
		$("#taxon").empty();
		for(i = 0;i < taxa.length; i++){
		    $("#taxon").append("<option value=\""+taxa[i]+"\">"+taxa[i]+"</option>");
		}
		$("#taxon").trigger("chosen:updated");
		
		$("#taxon").chosen().change(function(){
		    outgroup_ancestor = null;
		    var tax = [];
		    $( "#taxon option:selected").each(function() {
			tax.push($( this ).text());
		    });
		    if(tax.length>0){
			var taxnodes = node_from_taxnames(input_tree,tax);
			if(tax.length==1){
			    outgroup_ancestor = taxnodes[0];
			}else{
			    outgroup_ancestor = get_ancestor(taxnodes);
			    var alltaxa = get_taxas(outgroup_ancestor);
			    for(i=0; i< alltaxa.length; i++){
				$( "#taxon option[value=\""+alltaxa[i].tax+"\"]").prop('selected', true)
			    }
			}
		    }
		    $("#taxon").trigger("chosen:updated");
		});

		$('#clearoutgroup').click(function(){
		    $( "#taxon option").each(function() {
			$(this).prop('selected',false);
		    });
		    $("#taxon").trigger("chosen:updated");
		    outgroup_ancestor = null;
		});
		
		$('#getancestor').click(function(){
		    if(outgroup_ancestor != null){
			if(outgroup_ancestor != input_tree){
			    outgroup_ancestor = outgroup_ancestor.parent;
			    var tax = get_taxas(outgroup_ancestor);
			    var i;
			    for(i=0; i < tax.length;i++){
				$( "#taxon option[value=\""+tax[i].tax+"\"]").prop('selected', true)
			    }
			    $("#taxon").trigger("chosen:updated");
			}else{
			    outgrouperror("Cannot get more taxa, outgroup is already the whole tree");
			}
		    }else{
			outgrouperror("You should first select a Taxon");
		    }
		});
		treesuccess("Tree succesfully imported");
	    } catch (e) {
		treeerror("["+e.name+"] : " + e.message);
		$("#newrunform")[0].reset();
	    }
	};
        reader.onerror = function(event) {
            $('#errordiv').text("Error opening file: " + event.target.error.code);
        };

        reader.readAsText(inputFile);
    });
}

function init_form_submit(){
    $('#newrunform').submit(function(event){
	// event.preventDefault();
	// We reroot the tree if needed
	var rerootbool = $('input[name=outgroupornot]:checked', '#newrunform').val() == "yes";

	if($("#inputtreestring").val() == ""){
	    treeerror("Input tree has not been selected");
	    return(false);
	}
	
	if(rerootbool){
	    if(outgroup_ancestor != null){
		if(outgroup_ancestor != input_tree){
		    var tax = get_taxas(outgroup_ancestor);
		    $("#alltaxalist").empty();
		    $('#taxon').val("");
		    var remove_outgroup = $('#removeoutgroup').is(':checked');
		    input_tree = reroot_from_outgroup(input_tree, tax, remove_outgroup);
		    
		    // Update outgroup list if ougroup is kept
		    if(! remove_outgroup){
			var outstring = "";
			for(var ni = 0; ni< tax.length; ni++){
			    if(ni>0){
				outstring = outstring + "\n";
			    }
			    outstring = outstring+tax[ni].tax;
			}
			$("#outgrouplist").val(outstring);
		    }else{
			$("#outgrouplist").val("");
		    }
		    
		    // Update taxon list in reroot div
		    var newtax = get_taxas(input_tree);
		    $("#taxon").empty();
		    for(i = 0;i < newtax.length; i++){
			$("#taxon").append("<option value=\""+newtax[i].tax+"\">"+newtax[i].tax+"</option>");
		    }
		    $("#taxon").trigger("chosen:updated");
		    
		    
		    outgroup_ancestor = null;
		    // Update Tree variable
		    // console.log(to_newick(input_tree));
		    $("#inputtreestring").val(to_newick(input_tree));
		    outgroupsuccess("Tree succesfully rerooted");
		    return(true);
		}else{
		    outgrouperror("Outgroup is the whole tree, won't reroot");
		    return(false);
		}
	    } else {
		outgrouperror("No outgroup is defined");
		return(false);
	    }
	} else{
	    return(true);
	}
    });
}


function outgrouperror(message){
    $("#outgrouperror").show();
    $("#outgrouperrortext").text(message);
    $("#outgrouperror").delay(2000).slideUp(400, function() {
	$(this).hide();
    });
}


function outgroupsuccess(message){
    $("#outgroupsuccess").show();
    $("#outgroupsuccesstext").text(message);
    $("#outgroupsuccess").delay(2000).slideUp(400, function() {
	$(this).hide();
    });
}

function treeerror(message){
    $("#treeerror").show();
    $("#treeerrortext").text(message);
    $("#treeerror").delay(4000).slideUp(400, function() {
	$(this).hide();
    });
}


function treesuccess(message){
    $("#treesuccess").show();
    $("#treesuccesstext").text(message);
    $("#treesuccess").delay(4000).slideUp(400, function() {
	$(this).hide();
    });
}

function init_chosen(){
    var config = {
	'.chosen-select'           : {},
	'.chosen-select-deselect'  : {allow_single_deselect:true},
	'.chosen-select-no-single' : {disable_search_threshold:10},
	'.chosen-select-no-results': {no_results_text:'Oops, no taxa found!'},
	'.chosen-select-width'     : {width:"95%"}
    }
    for (var selector in config) {
	$(selector).chosen(config[selector]);
    }
}

$(document).ready(function(){
    init_canvas();

    init_tree_reader();
    
    init_form_submit();
    
    init_chosen();
});

