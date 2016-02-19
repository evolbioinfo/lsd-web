

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
}

$(document).ready(function(){
    init();
  });
