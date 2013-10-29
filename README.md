LissaJS
=======

A library for parsing, evaluating and rearranging algebraic expressions in JavaScript.

This is a spin-off of the [Numbas](https://github.com/numbas/Numbas) e-assessment system. It has no external dependencies, but the code's a bit of a mess at the moment.

Demo
----

There's an interactive demo page at http://numbas.github.io/LissaJS/.

Installing LissaJS
------------------

Include the lissajs.js script in your page.

    <script charset="UTF-8" type="text/javascript" src="lissajs.js"></script>

Using LissaJS
-------------

There is an explanation of the syntax, data types supported, and a function reference at http://numbas-editor.readthedocs.org/en/latest/jme-reference.html.

To evaluate an expression:

    LissaJS.jme.evaluate('expression', [scope]);
    
To compile an expression to a syntax tree:

    LissaJS.jme.compile('expression', [scope]);
    
To convert an expression to LaTeX:

    LissaJS.jme.display.exprToLaTeX('expression',[rules],[scope]);
    
To simplify (rearrange) an expression:

    LissaJS.jme.display.simplifyExpression('expression',[rules],[scope]);
