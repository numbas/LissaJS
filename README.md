LissaJS
=======

A library for parsing, evaluating and rearranging algebraic expressions in JavaScript.

**This project is no longer maintained. Development continues in [https://github.com/numbas/Numbas](the main Numbas repository).**

The name "LissaJS" was picked without much thought. It's meant to pun on "Lissajous", and follows the convention that every Javascript library's name ends in "JS", but apart from that it hasn't got much going for it. Suggestions of better names are welcome at [issue #1](https://github.com/numbas/LissaJS/issues/1).

This is a spin-off of the [Numbas](http://www.numbas.org.uk) e-assessment system. It has no external dependencies.

It's currently provided on a "do what you can with it" basis; we'll add examples and documentation later.

Demo
----

There's an interactive demo page at http://numbas.github.io/LissaJS/.

Installing LissaJS
------------------

Include the lissajs.js script in your page.

    <script src="lissajs.js"></script>
    
It uses some ECMAScript 5 features. For older browsers, you'll also need to load [es5-shim](https://github.com/kriskowal/es5-shim).
    
Using LissaJS
-------------

There is an explanation of the syntax, data types supported, and a function reference at http://numbas-editor.readthedocs.org/en/latest/jme-reference.html. Just replace `Numbas` with `LissaJS`. For more in-depth code documentation, see http://numbas.github.io/Numbas/ - again replacing `Numbas` with `LissaJS`. 

All operations happen with respect to a `LissaJS.jme.Scope` object. There's a default scope at `LissaJS.jme.builtinScope` containing all the built-in functions and rulesets. A few of the most commonly-used functions are available through the `LissaJS` object, using this default scope implicitly, for your convenience.

To evaluate an expression:

    LissaJS.evaluate('expression',{dict of variables});

or, with a custom scope:

    scope.evaluate('expression',{dict of variables});
    
To compile an expression to a syntax tree:

    scope.compile('expression');
    
To convert an expression to LaTeX:

    LissaJS.exprToLaTeX('expression',[rules]);

or, with a custom scope:

    LissaJS.jme.display.exprToLaTeX('expression',[rules],scope);
    
To simplify (rearrange) an expression:

    LissaJS.simplifyExpression('expression',[rules]);

or, with a custom scope:

    LissaJS.jme.display.simplifyExpression('expression',[rules],[scope]);
    
There are lots of pure maths functions under `LissaJS.math`.

Copyright
---------

LissaJS uses code from the [Numbas](http://www.numbas.org.uk) project.

> Copyright 2011-16 Newcastle University
> 
> Licensed under the Apache License, Version 2.0 (the "License");
> you may not use this file except in compliance with the License.
> You may obtain a copy of the License at
> 
> http://www.apache.org/licenses/LICENSE-2.0
> 
> Unless required by applicable law or agreed to in writing, software
> distributed under the License is distributed on an "AS IS" BASIS,
> WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
> See the License for the specific language governing permissions and
> limitations under the License.

You can see a plain-English explanation of the license and what it allows at [tl;drLegal](https://tldrlegal.com/license/apache-license-2.0-(apache-2.0))
