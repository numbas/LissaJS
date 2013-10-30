$.fn.mathjax = function(latex) {
	var math = $('<script type="math/tex; mode=display"/>');
	math.html(latex);
	$(this)
		.html('')
		.append(math)
	;
	MathJax.Hub.Queue(['Typeset',MathJax.Hub,math[0]]);
}

$(document).ready(function() {

	var rules = {};
	for(var rule in LissaJS.jme.display.simplificationRules) {
		rules[rule] = false;
	}

	function doMaths() {
		var expr = $('#input').val();
		$('#error, #preview, #evaluated').hide();
		if(expr.trim().length==0)
			return;

		var activeRules = [];
		for(var rule in rules) {
			if(rules[rule]) {
				activeRules.push(rule);
			}
		}

		try {
			var latex = LissaJS.jme.display.exprToLaTeX(expr,activeRules,LissaJS.jme.builtinScope);
		}
		catch(e) {
			$('#error') 
				.show()
				.find('.content')
					.html(e.message)
			;
			return;
		}
		$('#preview') 
			.show()
			.find('.content')
				.mathjax(latex)
		;

		try {
			var value = LissaJS.jme.evaluate(expr,LissaJS.jme.builtinScope);
			value = LissaJS.jme.display.texify({tok:value});
		}
		catch(e) {
		}
		$('#evaluated')
			.show()
			.find('.content')
				.mathjax(value)
		;
	}

	$('#input').on('change keyup',doMaths);

	$('.rule-checkbox').on('change',function() {
		var rule = $(this).attr('name');
		rules[rule] = $(this).is(':checked');
		$('#all-rules').prop('checked',($('.rule-checkbox:checked').length == $('.rule-checkbox').length));
		doMaths();
	});

	$('#all-rules').on('click',function() {
		var checked = $(this).is(':checked');
		$('.rule-checkbox').prop('checked',checked);
		for(var rule in rules) {
			rules[rule] = checked;
		}
		doMaths();
	});
});
