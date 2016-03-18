
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

$(document).ready(function(){
    init();
});
