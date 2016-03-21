LissaJS.evaluate = function(expr,variables) {
    return LissaJS.jme.builtinScope.evaluate(expr,variables);
}

LissaJS.exprToLaTeX = function(expr,ruleset) {
    return LissaJS.jme.display.exprToLaTeX(expr,ruleset,LissaJS.jme.builtinScope);
}

LissaJS.simplifyExpression = function(expr,ruleset) {
    if(ruleset===undefined) {
        ruleset = 'all';
    }
    return LissaJS.jme.display.simplifyExpression(expr,ruleset,LissaJS.jme.builtinScope);
}

return LissaJS;
})();

