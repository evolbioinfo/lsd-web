
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
    
}

$(document).ready(function(){
    init();
});
