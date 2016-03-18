trees = []
height=500
width=1000
zoom=1
prevy=0
offset=0
still_down = false

function init(){
    $('input[data-toggle=radio-collapse]').each(function(index, item) {
	var $item = $(item);
	var $target = $($item.data('target'));
	$('input[name="' + item.name + '"]').on('change', function() {
	    if($item.is(':checked')) {
		$target.show();
	    } else {
		$target.hide();
	    }
	});
	if($item.is(':checked')) {
	    $target.show();
	} else {
	    $target.hide();
	}
    });

    $('.label-F').addClass('label-success');
    $('.label-P').addClass('label-default');
    $('.label-R').addClass('label-info');
    $('.label-E').addClass('label-danger');
}

function clear_canvas(canvas){
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height*zoom);
}

function draw_tree(canvas,tree){
    // Create an empty project and a view for the canvas:
    paper.setup(canvas);
    // Create a Paper.js Path to draw a line into it:
    var tool = new Tool();
    var level=0
    var border=40
    var min_y=border
    var curheight=height * zoom
    var curwidth= width
    var max_y=curheight-border
    var max_num_disp_years=25
    var root = tree
    var point_radius=3
    max_date = tree_max_date(tree)
    min_date = tree_min_date(tree)
    console.log(min_date+" "+max_date)
    // y coords
    // console.log(JSON.stringify(tree))
    var total_terminals=count_terminals(tree)
    console.log(total_terminals)
    var y_dict={}
    tree_y_coords(y_dict,root,curheight,border,0,total_terminals)
    console.log(JSON.stringify(y_dict))
    draw_scale(min_date,max_date,width,curheight,border,max_num_disp_years)
    coordinates(root.id,root,y_dict,min_date,max_date,width,0,0,border,point_radius)
    paper.view.draw();
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
    return(terminals)
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
    return(mind)
}


function tree_max_date(node){
    var maxd = node.date_n
    if(!node || !node.suc || node.suc.length==0){
	maxd = node.date_n
    }else{
	for(var n=0; n<node.suc.length;n++){
	    maxd = Math.max(maxd,tree_max_date(node.suc[n]))
	}
    }
    return(maxd)

}

function tree_y_coords(y_dict, tree_node, height, border,num_terminal,total_terminals,curoffset){
    if(!tree_node.suc || tree_node.suc.length==0){
        y_dict[tree_node.id]=num_terminal*((height-2*border)*1.0/(total_terminals-1))+border+offset
        num_terminal+=1
    } else{
        var meany=0
        for(var n=0; n<tree_node.suc.length;n++){
	    num_terminal=tree_y_coords(y_dict,tree_node.suc[n],height,border,num_terminal,total_terminals)
            meany+=y_dict[tree_node.suc[n].id]
	}
	meany=meany*1.0/tree_node.suc.length
	y_dict[tree_node.id] = meany
    }
    return num_terminal
}

function coordinates(root_id,node,y_dict,min_date,max_date,width,prev_x,prev_y,border,point_radius){
    var middle=y_dict[node.id]
    //On ajoute les lignes verticales precedentes si non root

    // On prend la date et on calcul la position x
    var x_coord= (node.date_n-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border

    // On affiche le noeud
    var myCircle = new Path.Circle(new Point(x_coord, middle), point_radius);
    myCircle.fillColor = 'black';        

    //# On affiche la ligne horizontale
    var path = new Path();
    if(node.id != root_id){
	path.add(new Point(prev_x,prev_y));
    }
    path.add(new Point(prev_x,middle));
    path.add(new Point(x_coord, middle));
    path.strokeColor = 'black';
    path.strokeCap='round';
    path.strokeWidth=2;
    path.strokeJoin = 'round';

    // On affiche la date du noeud
    var year  = Math.floor(node.date_n)
    var month = node.date_n-year
    var month = Math.floor(month*12)+1
    var date  = year+"/"+pad(month,2)
    
    var text = new PointText(new Point(x_coord+2,middle+2));
    text.justification = 'left';
    text.fillColor = 'black';
    text.content = date;

    // tw,th = image_draw.textsize(date, font=fnt_small)
    // image_draw.text([x_coord-tw-point_radius,middle-th], date, (0,0,0,255), font=fnt_small)

    //# On affiche le nom du noeud
    // if(len(node.succ)==0):
    // print(node.data.taxon)
    // tw,th = image_draw.textsize(node.data.taxon, font=fnt_large)
    // image_draw.text([x_coord+point_radius*2,middle-th/2], node.data.taxon, (0,0,0,255), font=fnt_large)


    // On passe aux suivants
    for(var n=0;n<node.suc.length;n++){
	coordinates(root_id,node.suc[n],y_dict,min_date,max_date,width,x_coord,middle, border,point_radius)
    }
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function draw_scale(min_date,max_date,width,height,border,max_num_disp_years){
    var max_year = Math.ceil(max_date)
    var min_year = Math.floor(min_date)
    var mod= Math.ceil((max_year-min_year)*1.0/max_num_disp_years)
    for(var year=min_year; year<=max_year; year++){
        if (year%mod==0){
            //print "Year: "+str(year)
            var x_coord= (year-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border
	    var path = new Path();
	    path.add(new Point(x_coord,0));
	    path.add(new Point(x_coord,height));
	    path.strokeColor = 'grey';
	    path.strokeCap='round';
	    path.strokeWidth=1;
	    path.strokeJoin = 'round';
	    path.dashArray = [4, 4];
	    var text = new PointText(new Point(x_coord,10));
	    text.justification = 'left';
	    text.fillColor = 'grey';
	    text.content = year;
	}
    }
}

function init_canvas(){
    paper.install(window);

    $('#zoomslider').change(function(){
	curzoom = $(this).val();
	$('.tree_canvas').each(function(index,item){
	    clear_canvas(item);
	    console.log("Zoom: "+curzoom);
	    zoom = curzoom;
	    $("#valuezoom").html(zoom);
	    if(trees.length >= index){
      		draw_tree(item,trees[index]);
	    }
	});
    });

    $('.tree_canvas').each(function(index,item){
	$(item).mousedown(function(e){
	    still_down = true;
	    prevy=e.pageY;
	    console.log("Down at: "+e.pageY);
	});
    });


    $('.tree_canvas').each(function(index,item){
	$(item).mousemove(function(e){
	    if(still_down){
		offset-=(prevy-e.pageY);
		prevy=e.pageY;
		if(offset>0){
		    offset=0
		}
		console.log("Up at: "+e.pageY," ==> Offset: "+offset);
		draw_tree(item,trees[index]);
	    }
	});
    });


    $('.tree_canvas').each(function(index,item){
	$(item).mouseup(function(e){
	    still_down=false;
	    offset-=(prevy-e.pageY);
	    if(offset>0){
		offset=0
	    }
	    console.log("Up at: "+e.pageY," ==> Offset: "+offset);
	    draw_tree(item,trees[index]);
	});
    });


    window.onload = function() {
	// Get a reference to the canvas object
	$('.tree_canvas').each(function(index,item){
	    tree_idx=item.getAttribute('data-index');
	    var tree_url=$(location).attr('href')
	    $.ajax({
		url: tree_url,
		type: 'GET',
		data: 'json='+tree_idx,
		dataType: 'json',
		success: function(code_json,status){
		    trees[index] = code_json
		    draw_tree(item,trees[index])
		}
	    });
	});
    }
}

// get mouse pos relative to canvas (yours is fine, this is just different)
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}
$(document).ready(function(){
    init();
    init_canvas();
  });
