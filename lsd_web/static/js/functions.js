
function init(){
  $("a.iframe").fancybox({
      'width'    : 450,
	'height' : 100,
	'margin' : 0,
	'padding': 0,
	'overlayOpacity':0.6,
	'onClosed': function(){
	//parent.location.reload(true);
	window.location = window.location.href;
      },
	opacity:true
    });

  $("a.delete").fancybox({
      'width'    : 450,
	'height' : 100,
	'margin' : 0,
	'padding': 0,
	'overlayOpacity':0.6,
	'onClosed': function(){
	//parent.location.reload(true);
	window.location = window.location.href;
      },
	opacity:true
    });
	
	$( "#datepicker" ).datepicker({dateFormat: 'yy-mm-dd'});
}

$(document).ready(function(){
    init();
  });
