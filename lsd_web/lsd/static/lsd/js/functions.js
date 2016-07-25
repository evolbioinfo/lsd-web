function toc(){
    var toc="";
    $("h2, h3").each(function(i) {
	var current = $(this);
	current.attr("id", "title" + i);
	toc+="<p class='toc-"+current.prop("tagName")+"'><a id='link" + i + "' href='#title" +
	    i + "' title='" + current.prop("tagName") + "'>" + 
	    current.html() + "</a></p>";
    });
    $("#toc").append('<h2>Table of contents:</h2>')
    $("#toc").append(toc);
}


function init(){
    $("#copyalert").hide();
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

    $('#copyurl').click(function(e){
	// console.log("Glyph clicked");
	$(this).select();
	if(document.execCommand("copy")){
	    $('#copyresult').html("URL Copied");
	}else{
	    $('#copyresult').html("You can copy into clipboard");
	}
	$("#copyalert").show();
	$("#copyalert").fadeTo(2000, 500).slideUp(500, function(){
	    $("#copyalert").hide();
	});
    });

    toc();
}

$(document).ready(function(){
    init();
});
