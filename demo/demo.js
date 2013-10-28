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
	$('#input').on('change keyup',function() {
		var expr = $(this).val();
		$('#error, #preview, #evaluated').hide();
		try {
			var latex = LissaJS.display.exprToLaTeX(expr,[],LissaJS.builtinScope);
		}
		catch(e) {
			$('#error') 
				.show()
				.find('.content')
					.html(e.message)
			;
			console.log(e.message);
			return;
		}
		$('#preview') 
			.show()
			.find('.content')
				.mathjax(latex)
		;

		try {
			var value = LissaJS.evaluate(expr,LissaJS.builtinScope);
			value = LissaJS.display.texify({tok:value});
		}
		catch(e) {
		}
		$('#evaluated')
			.show()
			.find('.content')
				.mathjax(value)
		;
	});
});
