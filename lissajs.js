/*jshint unused:true, boss:true, multistr:true, smarttabs:true, laxbreak:true, sub:true */
/*
Copyright 2011-13 Newcastle University

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

window.LissaJS = (function() {

var LissaJS = {};

LissaJS.Error = function(message)
{
	this.name="LissaJS Error";
	this.originalMessage = message;
	this.message = Array.prototype.join.call(arguments,' ');
};
LissaJS.Error.prototype = Error.prototype;
LissaJS.Error.prototype.constructor = LissaJS.Error;

var util = LissaJS.util = {

	//based on jQuery.extend, included here to remove the jQuery dependency
	extend: function() {
		var src, copy, name, options, 
			target = arguments[0] || {},
			i = 1,
			length = arguments.length;

		for ( ; i < length; i++ ) {
			// Only deal with non-null/undefined values
			if ( (options = arguments[ i ]) !== null ) {
				// Extend the base object
				for ( name in options ) {
					src = target[ name ];
					copy = options[ name ];

					// Prevent never-ending loop
					if ( target === copy ) {
						continue;
					}

					if ( copy !== undefined ) {
						target[ name ] = copy;
					}
				}
			}
		}

		// Return the modified object
		return target;
	},

	//clone an array, with array elements copied too
	//Array.splice() will create a copy of an array, but the elements are the same objects, which can cause fruity bugs.
	//This function clones the array elements as well, so there should be no side-effects when operating on the cloned array.
	//If 'deep' is true, do a deep copy of each element -- see util.copyobj
	copyarray: function(arr,deep)
	{
		arr = arr.slice();
		if(deep)
		{
			for(var i=0;i<arr.length;i++)
			{
				arr[i]=util.copyobj(arr[i],deep);
			}
		}
		return arr;
	},

	//clone an object
	//if 'deep' is true, each property is cloned as well (recursively) so there should be no side-effects when operating on the cloned object.
	copyobj: function(obj,deep)
	{
		switch(typeof(obj))
		{
		case 'object':
			if(obj===null)
				return obj;
			if(obj.length!==undefined)
			{
				return util.copyarray(obj,deep);
			}
			else
			{
				var newobj={};
				for(var x in obj)
				{
					if(deep)
						newobj[x] = util.copyobj(obj[x],deep);
					else
						newobj[x]=obj[x];
				}
				return newobj;
			}
			break;
		default:
			return obj;
		}
	},

	//shallow copy object into already existing object
	//add all src's properties to dest
	copyinto: function(src,dest)
	{
		for(var x in src)
		{
			if(dest[x]===undefined)
				dest[x]=src[x];
		}
	},

	//generic equality test on JME types
	eq: function(a,b) {
		if(a.type != b.type)
			return false;
		switch(a.type) {
			case 'number':
				return LissaJS.math.eq(a.value,b.value);
			case 'vector': 
				return LissaJS.vectormath.eq(a.value,b.value);
			case 'matrix':
				return LissaJS.matrixmath.eq(a.value,b.value);
			case 'list':
				return a.value.length==b.value.length && a.value.filter(function(ae,i){return !util.eq(ae,b.value[i]);}).length===0;
			case 'range':
				return a.value[0]==b.value[0] && a.value[1]==b.value[1] && a.value[2]==b.value[2];
			case 'name':
				return a.name == b.name;
			case 'number':
			case 'string':
			case 'boolean':
				return a.value==b.value;
			default:
				throw(new LissaJS.Error('util.equality not defined for type',a.type));
		}
	},

	//and the corresponding not-equal test
	neq: function(a,b) {
		return !util.eq(a,b);
	},

	//filter out values in `exclude` from the list `list`
	//`exclude` and `list` are understood to be LissaJS TLists, so values are LissaJS types
	//that means, look at element types to decide which equality test to use
	except: function(list,exclude) {
		return list.filter(function(l) {
			for(var i=0;i<exclude.length;i++) {
				if(util.eq(l,exclude[i]))
					return false;
			}
			return true;
		});
	},

	//test if parameter is an integer
	isInt: function(i)
	{
		return parseInt(i,10)==i;
	},

	//test if parameter is a float
	isFloat: function(f)
	{
		return parseFloat(f)==f;
	},

	//test if parameter is a boolean
	//returns if parameter is a boolean literal, or any of the strings 'false','true','yes','no', case-insensitive
	isBool: function(b)
	{
		if(b===null) { return false; }
		if(typeof(b)=='boolean') { return true; }

		b = b.toString().toLowerCase();
		return b=='false' || b=='true' || b=='yes' || b=='no';
	},

	// parse a string as HTML, and return true only if it contains non-whitespace text
	isNonemptyHTML: function(html) {
		var d = document.createElement('div');
		d.innerHTML = html;
		return d.innerText.trim().length>0;
	},

	//parse parameter as a boolean
	//the boolean value true and the strings 'true' and 'yes' are parsed as the value true, everything else is false.
	parseBool: function(b)
	{
		if(!b)
			return false;
		b = b.toString().toLowerCase();
		return( b=='true' || b=='yes' );
	},

	//pad string s on the left with a character p until it is n characters long
	lpad: function(s,n,p)
	{
		s=s.toString();
		p=p[0];
		while(s.length<n) { s=p+s; }
		return s;
	},

	//replace occurences of '%s' with the extra arguments of the function
	//ie.
	// formatString('hello %s %s','Mr.','Perfect') => 'hello Mr. Perfect'
	formatString: function(str)
	{
		var i;
		for(i=1;i<arguments.length;i++)
		{
			str=str.replace(/%s/,arguments[i]);
		}
		return str;
	},

	//get rid of the % on the end of percentages and parse as float, then divide by 100
	//ie.
	// unPercent('50%') => 0.5
	// unPercent('50') => 0.5
	unPercent: function(s)
	{
		return (parseFloat(s.replace(/%/,''))/100);
	},


	//pluralise a word
	//if n is not unity, return plural, else return singular
	pluralise: function(n,singular,plural)
	{
		n = LissaJS.math.precround(n,10);
		if(n==-1 || n==1)
			return singular;
		else
			return plural;
	},

	//make the first letter in the string a capital
	capitalise: function(str) {
		return str.replace(/[a-z]/,function(c){return c.toUpperCase();});
	},

	//split a string up according to brackets
	//strips out nested brackets
	//
	//so 
	// splitbrackets('a{{b}}c','{','}') => ['a','b','c']
	splitbrackets: function(t,lb,rb)
	{
		var o=[];
		var l=t.length;
		var s=0;
		var depth=0;
		for(var i=0;i<l;i++)
		{
			if(t.charAt(i)==lb && !(i>0 && t.charAt(i-1)=='\\'))
			{
				depth+=1;
				if(depth==1)
				{
					o.push(t.slice(s,i));
					s=i+1;
				}
				else
				{
					t = t.slice(0,i)+t.slice(i+1);
					i-=1;
				}
			}
			else if(depth>0 && t.charAt(i)==rb && !(i>0 && t.charAt(i-1)=='\\'))
			{
				depth-=1;
				if(depth===0)
				{
					o.push(t.slice(s,i));
					s=i+1;
				}
				else
				{
					t = t.slice(0,i)+t.slice(i+1);
					i -= 1;
				}
			}
		}
		if(s<l)
			o.push(t.slice(s));
		return o;
	},

	//split content text up by TeX maths delimiters
	//includes delimiters, since there are two kinds
	//ie.
	// contentsplitbrackets('hello $x+y$ and \[this\] etc') => ['hello ','$','x+y','$',' and ','\[','this','\]']
	contentsplitbrackets: function(t)
	{
		var o=[];
		var l=t.length;
		var s=0;
		for(var i=0;i<l;i++)
		{
			if(t.charAt(i)=='$')
			{
				o.push(t.slice(s,i));
				o.push('$');
				s=i+1;
			}
			else if (i<l-1 && t.charAt(i)=='\\' && (t.charAt(i+1)=='[' || t.charAt(i+1)==']'))
			{
				o.push(t.slice(s,i));
				o.push(t.slice(i,i+2));
				s=i+2;
			}
		}
		if(s<l)
			o.push(t.slice(s));
		return o;
	},

	//because XML doesn't like having ampersands hanging about, replace them with escape codes
	escapeHTML: function(str)
	{
		return str.replace(/&/g,'&amp;');
	},

	//create a comparison function which sorts objects by a particular property
	sortBy: function(prop) {
		return function(a,b) {
			if(a[prop]>b[prop])
				return 1;
			else if(a[prop]<b[prop])
				return -1;
			else
				return 0;
		};
	},

	// from http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
	// got rid of the line to convert to 32 bit, because I don't need it
	hashCode: function(str){
		var hash = 0, i, c;
		if (str.length === 0) return hash;
		for (i = 0; i < str.length; i++) {
			c = str.charCodeAt(i);
			hash = ((hash<<5)-hash)+c;
		}
		if(hash<0)
			return '0'+(-hash);
		else
			return '1'+hash;
	}

};

//nice short 'string contains' function
if(!String.prototype.contains)
{
	String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
}
if(!Array.prototype.contains)
{
	Array.prototype.contains = function(it) { return this.indexOf(it) != -1; };
}

function mergeArrays(arr1,arr2,sortfn)
{
	var i;
	if(arr1.length===0)
		return arr2.slice();

	var out = arr1.concat(arr2);
	if(sortfn)
		out.sort(sortfn);
	else
		out.sort();
	if(sortfn) 
	{
		for(i=1; i<out.length;) {
			if(sortfn(out[i-1],out[i])===0)	//duplicate elements, so remove latest
				out.splice(i,1);
			else
				i++;
		}
	}
	else
	{
		for(i=1;i<out.length;) {
			if(out[i-1]==out[i])
				out.splice(i,1);
			else
				i++;
		}
	}

	return out;
}

var math = LissaJS.math = {

	re_scientificNumber: /(\-?(?:0|[1-9]\d*)(?:\.\d+)?)[eE]([\+\-]?\d+)/,
	
	//Operations to cope with complex numbers
	complex: function(re,im)
	{
		if(!im)
			return re;
		else
			return {re: re, im: im, complex: true, 
			toString: math.complexToString};
	},
	
	complexToString: function()
	{
		return math.niceNumber(this);
	},

	negate: function(n)
	{
		if(n.complex)
			return math.complex(-n.re,-n.im);
		else
			return -n;
	},

	conjugate: function(n)
	{
		if(n.complex)
			return math.complex(n.re,-n.im);
		else
			return n;
	},

	add: function(a,b)
	{
		if(a.complex)
		{
			if(b.complex)
				return math.complex(a.re+b.re, a.im + b.im);
			else
				return math.complex(a.re+b, a.im);
		}
		else
		{
			if(b.complex)
				return math.complex(a + b.re, b.im);
			else
				return a+b;
		}
	},

	sub: function(a,b)
	{
		if(a.complex)
		{
			if(b.complex)
				return math.complex(a.re-b.re, a.im - b.im);
			else
				return math.complex(a.re-b, a.im);
		}
		else
		{
			if(b.complex)
				return math.complex(a - b.re, -b.im);
			else
				return a-b;
		}
	},

	mul: function(a,b)
	{
		if(a.complex)
		{
			if(b.complex)
				return math.complex(a.re*b.re - a.im*b.im, a.re*b.im + a.im*b.re);
			else
				return math.complex(a.re*b, a.im*b);
		}
		else
		{
			if(b.complex)
				return math.complex(a*b.re, a*b.im);
			else
				return a*b;
		}
	},

	div: function(a,b)
	{
		var q;
		if(a.complex)
		{
			if(b.complex)
			{
				q = b.re*b.re + b.im*b.im;
				return math.complex((a.re*b.re + a.im*b.im)/q, (a.im*b.re - a.re*b.im)/q);
			}
			else
				return math.complex(a.re/b, a.im/b);
		}
		else
		{
			if(b.complex)
			{
				q = b.re*b.re + b.im*b.im;
				return math.complex(a*b.re/q, -a*b.im/q);
			}
			else
				return a/b;
		}
	},

	pow: function(a,b)
	{
		if(a.complex && LissaJS.util.isInt(b) && Math.abs(b)<100)
		{
			if(b<0)
				return math.div(1,math.pow(a,-b));
			if(b===0)
				return 1;
			var coeffs = math.binomialCoefficients(b);

			var re = 0;
			var im = 0;
			var sign = 1;
			for(var i=0;i<b;i+=2) {
				re += coeffs[i]*Math.pow(a.re,b-i)*Math.pow(a.im,i)*sign;
				im += coeffs[i+1]*Math.pow(a.re,b-i-1)*Math.pow(a.im,i+1)*sign;
				sign = -sign;
			}
			if(b%2===0)
				re += Math.pow(a.im,b)*sign;
			return math.complex(re,im);
		}
		if(a.complex || b.complex || (a<0 && math.fract(b)!==0))
		{
			if(!a.complex)
				a = {re: a, im: 0, complex: true};
			if(!b.complex)
				b = {re: b, im: 0, complex: true};
			var ss = a.re*a.re + a.im*a.im;
			var arg1 = math.arg(a);
			var mag = Math.pow(ss,b.re/2) * Math.exp(-b.im*arg1);
			var arg = b.re*arg1 + (b.im * Math.log(ss))/2;
			return math.complex(mag*Math.cos(arg), mag*Math.sin(arg));
		}
		else
		{
			return Math.pow(a,b);
		}
	},

	//return the nth row of Pascal's triangle
	binomialCoefficients: function(n) {
		var b = [1];
		var f = 1;

		for(var i=1;i<=n;i++) { 
			b.push( f*=(n+1-i)/i );
		}
		return b;
	},

	root: function(a,b)
	{
		return math.pow(a,div(1,b));
	},

	sqrt: function(n)
	{
		if(n.complex)
		{
			var r = math.abs(n);
			return math.complex( Math.sqrt((r+n.re)/2), (n.im<0 ? -1 : 1) * Math.sqrt((r-n.re)/2));
		}
		else if(n<0)
			return math.complex(0,Math.sqrt(-n));
		else
			return Math.sqrt(n);
	},

	log: function(n)
	{
		if(n.complex)
		{
			var mag = math.abs(n);
			var arg = math.arg(n);
			return math.complex(Math.log(mag), arg);
		}
		else if(n<0)
			return math.complex(Math.log(-n),Math.PI);
		else
			return Math.log(n);
	},

	exp: function(n)
	{
		if(n.complex)
		{
			return math.complex( Math.exp(n.re) * Math.cos(n.im), Math.exp(n.re) * Math.sin(n.im) );
		}
		else
			return Math.exp(n);
	},
	
	//magnitude of a number
	abs: function(n)
	{
		if(n.complex)
		{
			if(n.re===0)
				return Math.abs(n.im);
			else if(n.im===0)
				return Math.abs(n.re);
			else
				return Math.sqrt(n.re*n.re + n.im*n.im);
		}
		else
			return Math.abs(n);
	},

	//argument of a (complex) numbers
	arg: function(n)
	{
		if(n.complex)
			return Math.atan2(n.im,n.re);
		else
			return Math.atan2(0,n);
	},

	//real part of a number
	re: function(n)
	{
		if(n.complex)
			return n.re;
		else
			return n;
	},

	//imaginary part of a number
	im: function(n)
	{
		if(n.complex)
			return n.im;
		else
			return 0;
	},

	//Ordering relations
	lt: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new LissaJS.Error('math.order complex numbers'));
		return a<b;
	},

	gt: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new LissaJS.Error('math.order complex numbers'));
		return a>b;
	},

	leq: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new LissaJS.Error('math.order complex numbers'));
		return a<=b;
	},
	
	geq: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new LissaJS.Error('math.order complex numbers'));
		return a>=b;
	},

	eq: function(a,b)
	{
		if(a.complex)
		{
			if(b.complex)
				return (a.re==b.re && a.im==b.im);
			else
				return (a.re==b && a.im===0);
		}
		else
		{
			if(b.complex)
				return (a==b.re && b.im===0);
			else
				return a==b;
		}
	},

	max: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new LissaJS.Error('math.order complex numbers'));
		return Math.max(a,b);
	},

	min: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new LissaJS.Error('math.order complex numbers'));
		return Math.min(a,b);
	},
	
	neq: function(a,b)
	{
		return !math.eq(a,b);
	},

	//If number is a*pi^n, return n, otherwise return 0
	piDegree: function(n)
	{
		n=Math.abs(n);

		if(n>10000)	//so big numbers don't get rounded to a power of pi accidentally
			return 0;

		var degree,a;
		for(degree=1; (a=n/Math.pow(Math.PI,degree))>1 && Math.abs(a-math.round(a))>0.00000001; degree++) {}
		return( a>=1 ? degree : 0 );
	},

	//display a number nicely - rounds off to 10dp so floating point errors aren't displayed
	niceNumber: function(n,options)
	{
		options = options || {};
		if(n.complex)
		{
			var re = math.niceNumber(n.re,options);
			var im = math.niceNumber(n.im,options);
			if(math.precround(n.im,10)===0)
				return re+'';
			else if(math.precround(n.re,10)===0)
			{
				if(n.im==1)
					return 'i';
				else if(n.im==-1)
					return '-i';
				else
					return im+'*i';
			}
			else if(n.im<0)
			{
				if(n.im==-1)
					return re+' - i';
				else
					return re+im+'*i';
			}
			else
			{
				if(n.im==1)
					return re+' + '+'i';
				else
					return re+' + '+im+'*i';
			}
		}
		else	
		{
			if(n==Infinity)
				return 'infinity';

			var piD;
			if((piD = math.piDegree(n)) > 0)
				n /= Math.pow(Math.PI,piD);

			var out;
			var precision;
			var i;
			switch(options.precisionType) {
			case 'sigfig':
				precision = options.precision;
				out = math.siground(n,precision)+'';
				var sigFigs = math.countSigFigs(out);
				if(sigFigs<precision) {
					if(out.indexOf('.')==-1)
						out += '.';
					for(i=0;i<precision-sigFigs;i++)
						out+='0';
				}
				break;
			case 'dp':
				precision = options.precision;
				out = math.precround(n,precision)+'';
				var dp = math.countDP(out);
				if(dp<precision) {
					if(out.indexOf('.')==-1)
						out += '.';
					for(i=0;i<precision-dp;i++)
						out+='0';
				}
				break;
			default:
				out = math.precround(n,10)+'';
			}
			switch(piD)
			{
			case 0:
				return out;
			case 1:
				if(n==1)
					return 'pi';
				else
					return out+'*pi';
				break;
			default:
				if(n==1)
					return 'pi^'+piD;
				else
					return out+'*pi'+piD;
			}
		}
	},
	//returns a random number in range [0..N-1]
	randomint: function(N) {
		return Math.floor(N*(Math.random()%1)); 
	},

	//a random shuffling of the numbers [0..N-1]
	deal: function(N) 
	{ 
		var J, K, Q = new Array(N);
		for (J=0 ; J<N ; J++)
			{ K = math.randomint(J+1) ; Q[J] = Q[K] ; Q[K] = J; }
		return Q; 
	},

	shuffle: function(list) {
		var l = list.length;
		var permutation = math.deal(l);
		var list2 = new Array(l);
		for(var i=0;i<l;i++) {
			list2[i]=(list[permutation[i]]);
		}
		return list2;
	},

	//returns the inverse of a shuffling
	inverse: function(l)
	{
		arr = new Array(l.length);
		for(var i=0;i<l.length;i++)
		{
			arr[l[i]]=i;
		}
		return arr;
	},

	//just the numbers from 1 to n in array!
	range: function(n)
	{
		var arr=new Array(n);
		for(var i=0;i<n;i++)
		{
			arr[i]=i;
		}
		return arr;
	},

	precround: function(a,b) {
		if(b.complex)
			throw(new LissaJS.Error('math.precround.complex'));
		if(a.complex)
			return math.complex(math.precround(a.re,b),math.precround(a.im,b));
		else
		{
			b = Math.pow(10,b);

			//test to allow a bit of leeway to account for floating point errors
			//if a*10^b is less than 1e-9 away from having a five as the last digit of its whole part, round it up anyway
			var v = a*b*10 % 1;
			var d = (a>0 ? Math.floor : Math.ceil)(a*b*10 % 10);
			if(d==4 && 1-v<1e-9) {
				return Math.round(a*b+1)/b;
			}
			else if(d==-5 && v>-1e-9 && v<0) {
				return Math.round(a*b+1)/b;
			}

			return Math.round(a*b)/b;
		}
	},

	siground: function(a,b) {
		if(b.complex)
			throw(new LissaJS.Error('math.siground.complex'));
		if(a.complex)
			return math.complex(math.siground(a.re,b),math.siground(a.im,b));
		else
		{
			var s = math.sign(a);
			if(a===0) { return 0; }
			if(a==Infinity || a==-Infinity) { return a; }
			b = Math.pow(10, b-Math.ceil(math.log10(s*a)));

			//test to allow a bit of leeway to account for floating point errors
			//if a*10^b is less than 1e-9 away from having a five as the last digit of its whole part, round it up anyway
			var v = a*b*10 % 1;
			var d = (a>0 ? Math.floor : Math.ceil)(a*b*10 % 10);
			if(d==4 && 1-v<1e-9) {
				return Math.round(a*b+1)/b;
			}
			else if(d==-5 && v>-1e-9 && v<0) {
				return Math.round(a*b+1)/b;
			}

			return Math.round(a*b)/b;
		}
	},

	countDP: function(n) {
		var m = n.match(/\.(\d*)$/);
		if(!m)
			return 0;
		else
			return m[1].length;
	},
	
	countSigFigs: function(n) {
		var m = n.match(/^-?(?:(\d$)|(?:([1-9]\d*[1-9])0*$)|([1-9]\d*\.\d+$)|(0\.0+$)|(?:0\.0*([1-9]\d*))$)/);
		if(!m)
			return 0;
		var sigFigs = m[1] || m[2] || m[3] || m[4] || m[5];
		return sigFigs.replace('.','').length;
	},

	factorial: function(n)
	{
		if( LissaJS.util.isInt(n) && n>=0 )
		{
			if(n<=1) {
				return 1;
			}else{
				var j=1;
				for(var i=2;i<=n;i++)
				{
					j*=i;
				}
				return j;
			}
		}
		else	//gamma function extends factorial to non-ints and negative numbers
		{
			return math.gamma(math.add(n,1));
		}
	},

	//Lanczos approximation to the gamma function http://en.wikipedia.org/wiki/Lanczos_approximation#Simple_implementation
	gamma: function(n)
	{
		var g = 7;
		var p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
		
		var mul = math.mul, div = math.div, exp = math.exp, neg = math.negate, pow = math.pow, sqrt = math.sqrt, sin = math.sin, add = math.add, sub = math.sub, pi = Math.PI;
		
		if((n.complex && n.re<0.5) || (!n.complex && n<0.5))
		{
			return div(pi,mul(sin(mul(pi,n)),math.gamma(sub(1,n))));
		}
		else
		{
			n = sub(n,1);			//n -= 1
			var x = p[0];
			for(var i=1;i<g+2;i++)
			{
				x = add(x, div(p[i],add(n,i)));	// x += p[i]/(n+i)
			}
			var t = add(n,add(g,0.5));		// t = n+g+0.5
			return mul(sqrt(2*pi),mul(pow(t,add(n,0.5)),mul(exp(neg(t)),x)));	// return sqrt(2*pi)*t^(z+0.5)*exp(-t)*x
		}
	},

	log10: function(x)
	{
		return mul(math.log(x),Math.LOG10E);
	},

	radians: function(x) {
		return mul(x,Math.PI/180);
	},
	degrees: function(x) {
		return mul(x,180/Math.PI);
	},
	cos: function(x) {
		if(x.complex)
		{
			return math.complex(Math.cos(x.re)*math.cosh(x.im), -Math.sin(x.re)*math.sinh(x.im));
		}
		else
			return Math.cos(x);
	},
	sin: function(x) {
		if(x.complex)
		{
			return math.complex(Math.sin(x.re)*math.cosh(x.im), Math.cos(x.re)*math.sinh(x.im));
		}
		else
			return Math.sin(x);
	},
	tan: function(x) {
		if(x.complex)
			return div(math.sin(x),math.cos(x));
		else
			return Math.tan(x);
	},
	cosec: function(x) {
		return div(1,math.sin(x));
	},
	sec: function(x) {
		return div(1,math.cos(x));
	},
	cot: function(x) {
		return div(1,math.tan(x));
	},
	arcsin: function(x) {
		if(x.complex || math.abs(x)>1)
		{
			var i = math.complex(0,1), ni = math.complex(0,-1);
			var ex = add(mul(x,i),math.sqrt(sub(1,mul(x,x)))); //ix+sqrt(1-x^2)
			return mul(ni,math.log(ex));
		}
		else
			return Math.asin(x);
	},
	arccos: function(x) {
		if(x.complex || math.abs(x)>1)
		{
			var ni = math.complex(0,-1);
			var ex = add(x, math.sqrt( sub(mul(x,x),1) ) );	//x+sqrt(x^2-1)
			var result = mul(ni,math.log(ex));
			if(math.re(result)<0 || math.re(result)===0 && math.im(result)<0)
				result = math.negate(result);
			return result;
		}
		else
			return Math.acos(x);
	},
	arctan: function(x) {
		if(x.complex)
		{
			var i = math.complex(0,1);
			var ex = div(add(i,x),sub(i,x));
			return mul(math.complex(0,0.5), math.log(ex));
		}
		else
			return Math.atan(x);
	},
	sinh: function(x) {
		if(x.complex)
			return div(sub(math.exp(x), math.exp(math.negate(x))),2);
		else
			return (Math.exp(x)-Math.exp(-x))/2;
	},
	cosh: function(x) {
		if(x.complex)
			return div(add(math.exp(x), math.exp(math.negate(x))),2);
		else
			return (Math.exp(x)+Math.exp(-x))/2;
	},
	tanh: function(x) {
		return div(math.sinh(x),math.cosh(x));
	},
	cosech: function(x) {
		return div(1,math.sinh(x));
	},
	sech: function(x) {
		return div(1,math.cosh(x));
	},
	coth: function(x) {
		return div(1,math.tanh(x));
	},
	arcsinh: function(x) {
		if(x.complex)
			return math.log(add(x, math.sqrt(add(mul(x,x),1))));
		else
			return Math.log(x + Math.sqrt(x*x+1));
	},
	arccosh: function (x) {
		if(x.complex)
			return math.log(add(x, math.sqrt(sub(mul(x,x),1))));
		else
			return Math.log(x + Math.sqrt(x*x-1));
	},
	arctanh: function (x) {
		if(x.complex)
			return div(math.log(div(add(1,x),sub(1,x))),2);
		else
			return 0.5 * Math.log((1+x)/(1-x));
	},

	//round UP to nearest integer
	ceil: function(x) {
		if(x.complex)
			return math.complex(math.ceil(x.re),math.ceil(x.im));
		else
			return Math.ceil(x);
	},

	//round DOWN to nearest integer
	floor: function(x) {
		if(x.complex)
			return math.complex(math.floor(x.re),math.floor(x.im));
		else
			return Math.floor(x);
	},

	//round to nearest integer
	round: function(x) {
		if(x.complex)
			return math.complex(Math.round(x.re),Math.round(x.im));
		else
			return Math.round(x);
	},

	//chop off decimal part
	trunc: function(x) {
		if(x.complex)
			return math.complex(math.trunc(x.re),math.trunc(x.im));

		if(x>0) {
			return Math.floor(x);
		}else{
			return Math.ceil(x);
		}
	},
	fract: function(x) {
		if(x.complex)
			return math.complex(math.fract(x.re),math.fract(x.im));

		return x-math.trunc(x);
	},
	sign: function(x) {
		if(x.complex)
			return math.complex(math.sign(x.re),math.sign(x.im));

		if(x===0) {
			return 0;
		}else if (x>0) {
			return 1;
		}else {
			return -1;
		}
	},

	//return random real number between max and min
	randomrange: function(min,max)
	{
		return Math.random()*(max-min)+min;
	},

	//call as random([min,max,step])
	//returns random choice from 'min' to 'max' at 'step' intervals
	//if all the values in the range are appended to the list, eg [min,max,step,v1,v2,v3,...], just pick randomly from the values
	random: function(range)
	{
		if(range.length>3)	//if values in range are given after [min,max,step]
		{
			return math.choose(range.slice(3));
		}
		else
		{
			if(range[2]===0)
			{
				return math.randomrange(range[0],range[1]);
			}
			else
			{
				var diff = range[1]-range[0];
				var steps = diff/range[2];
				var n = Math.floor(math.randomrange(0,steps+1));
				return range[0]+n*range[2];
			}
		}
	},

	//removes all the values in the list `exclude` from the list `range`
	except: function(range,exclude) {
		range = range.filter(function(r) {
			for(var i=0;i<exclude.length;i++) {
				if(math.eq(r,exclude[i]))
					return false;
			}
			return true;
		});
		return range;
	},

	//choose one item from an array
	choose: function(selection)
	{
		if(selection.length===0)
			throw(new LissaJS.Error('math.choose.empty selection'));
		var n = Math.floor(math.randomrange(0,selection.length));
		return selection[n];
	},


	// from http://dreaminginjavascript.wordpress.com/2008/11/08/combinations-and-permutations-in-javascript/ 
	//(public domain)
	productRange: function(a,b) {
		if(a>b)
			return 1;
		var product=a,i=a;
		while (i++<b) {
			product*=i;
		}
		return product;
	},
	 
	combinations: function(n,k) {
		if(n.complex || k.complex)
			throw(new LissaJS.Error('math.combinations.complex'));

		k=Math.max(k,n-k);
		return math.productRange(k+1,n)/math.productRange(1,n-k);
	},

	permutations: function(n,k) {
		if(n.complex || k.complex)
			throw(new LissaJS.Error('math.permutations.complex'));

		return math.productRange(k+1,n);
	},

	divides: function(a,b) {
		if(a.complex || b.complex || !LissaJS.util.isInt(a) || !LissaJS.util.isInt(b))
			return false;

		return (b % a) === 0;
	},

	gcf: function(a,b) {
		if(a.complex || b.complex)
			throw(new LissaJS.Error('math.gcf.complex'));

		if(Math.floor(a)!=a || Math.floor(b)!=b)
			return 1;
		a = Math.floor(Math.abs(a));
		b = Math.floor(Math.abs(b));
		
		var c=0;
		if(a<b) { c=a; a=b; b=c; }		

		if(b===0){return 1;}
		
		while(a % b !== 0) {
			c=b;
			b=a % b;
			a=c;
		}
		return b;
	},

	lcm: function(a,b) {
		if(a.complex || b.complex)
			throw(new LissaJS.Error('math.lcm.complex'));
		a = Math.floor(Math.abs(a));
		b = Math.floor(Math.abs(b));
		
		var c = math.gcf(a,b);
		return a*b/c;
	},


	defineRange: function(a,b)
	{
		if(a.complex)
			a=a.re;
		if(b.complex)
			b=b.re;
		return [a,b,1];
	},
	rangeSteps: function(a,b)
	{
		if(b.complex)
			b=b.re;
		return [a[0],a[1],b];
	},

	//Get a rational approximation to a real number by the continued fractions method
	//if accuracy is given, the returned answer will be within exp(-accuracy) of the original number
	rationalApproximation: function(n,accuracy)
	{
		if(accuracy===undefined)
			accuracy = 15;
		accuracy = Math.exp(-accuracy);

		var on = n;
		var e = Math.floor(n);
		if(e==n)
			return [n,1];
		var l = 0;
		var frac = [];
		var j;
		while(Math.abs(on-e)>accuracy)
		{
			l+=1;
			var i = Math.floor(n);
			frac.push(i);
			n = 1/(n-i);
			e = Infinity;
			for(j=l-1;j>=0;j--)
			{
				e = frac[j]+1/e;
			}
		}
		var f = [1,0];
		for(j=l-1;j>=0;j--)
		{
			f = [frac[j]*f[0]+f[1],f[0]];
		}
		return f;
	}
};

var add = math.add, sub = math.sub, mul = math.mul, div = math.div, eq = math.eq, neq = math.neq, negate = math.negate;

//vector operations
//these operations are very lax about the dimensions of vectors - they stick zeroes in when pairs of vectors don't line up exactly
var vectormath = LissaJS.vectormath = {
	negate: function(v) {
		return v.map(function(x) { return negate(x); });
	},

	add: function(a,b) {
		if(b.length>a.length)
		{
			var c = b;
			b = a;
			a = c;
		}
		return a.map(function(x,i){ return add(x,b[i]||0); });
	},

	sub: function(a,b) {
		if(b.length>a.length)
		{
			return b.map(function(x,i){ return sub(a[i]||0,x); });
		}
		else
		{
			return a.map(function(x,i){ return sub(x,b[i]||0); });
		}
	},

	//scalar multiplication - a should just be a number
	mul: function(k,v) {
		return v.map(function(x){ return mul(k,x); });
	},

	//dot product
	dot: function(a,b) {

		//check if A is a matrix object. If it's the right shape, we can use it anyway
		if('rows' in a)
		{
			if(a.rows==1)
				a = a[0];
			else if(a.columns==1)
				a = a.map(function(x){ return x[0];});
			else
				throw(new LissaJS.Error('vectormath.dot.matrix too big'));
		}
		//Same check for B
		if('rows' in b)
		{
			if(b.rows==1)
				b = b[0];
			else if(b.columns==1)
				b = b.map(function(x){ return x[0]; });
			else
				throw(new LissaJS.Error('vectormath.dot.matrix too big'));
		}
		if(b.length>a.length)
		{
			var c = b;
			b = a;
			a = c;
		}
		return a.reduce(function(s,x,i){ return add(s,mul(x,b[i]||0)); },0);
	},

	//cross product
	cross: function(a,b) {
		//check if A is a matrix object. If it's the right shape, we can use it anyway
		if('rows' in a)
		{
			if(a.rows==1)
				a = a[0];
			else if(a.columns==1)
				a = a.map(function(x){ return x[0]; });
			else
				throw(new LissaJS.Error('vectormath.cross.matrix too big'));
		}
		//Same check for B
		if('rows' in b)
		{
			if(b.rows==1)
				b = b[0];
			else if(b.columns==1)
				b = b.map(function(x){ return x[0]; });
			else
				throw(new LissaJS.Error('vectormath.cross.matrix too big'));
		}

		if(a.length!=3 || b.length!=3)
			throw(new LissaJS.Error('vectormath.cross.not 3d'));

		return [
				sub( mul(a[1],b[2]), mul(a[2],b[1]) ),
				sub( mul(a[2],b[0]), mul(a[0],b[2]) ),
				sub( mul(a[0],b[1]), mul(a[1],b[0]) )
				];
	},

	abs: function(a) {
		return Math.sqrt( a.reduce(function(s,x){ return s + mul(x,x); },0) );
	},

	eq: function(a,b) {
		if(b.length>a.length)
		{
			var c = b;
			b = a;
			a = c;
		}
		return a.reduce(function(s,x,i){ return s && eq(x,b[i]||0); },true);
	},

	neq: function(a,b) {
		return !vectormath.eq(a,b);
	},

	//multiply vector v by matrix m
	matrixmul: function(m,v) {
		return m.map(function(row){
			return row.reduce(function(s,x,i){ return add(s,mul(x,v[i]||0)); },0);
		});
	},

	transpose: function(v) {
		var matrix = v.map(function(x){ return [x]; });
		matrix.rows = 1;
		matrix.columns = v.length;
		return matrix;
	}
};

//matrix operations
//again, these operations are lax about the sizes of things
var matrixmath = LissaJS.matrixmath = {
	negate: function(m) {
		var matrix = [];
		for(var i=0;i<m.rows;i++) {
			matrix.push(m[i].map(negate));
		}
		matrix.rows = m.rows;
		matrix.columns = m.columns;
		return matrix;
	},

	add: function(a,b) {
		var rows = Math.max(a.rows,b.rows);
		var columns = Math.max(a.columns,b.columns);
		var matrix = [];
		for(var i=0;i<rows;i++)
		{
			var row = [];
			matrix.push(row);
			for(var j=0;j<columns;j++)
			{
				row[j] = add(a[i][j]||0,b[i][j]||0);
			}
		}
		matrix.rows = rows;
		matrix.columns = columns;
		return matrix;
	},
	sub: function(a,b) {
		var rows = Math.max(a.rows,b.rows);
		var columns = Math.max(a.columns,b.columns);
		var matrix = [];
		for(var i=0;i<rows;i++)
		{
			var row = [];
			matrix.push(row);
			for(var j=0;j<columns;j++)
			{
				row[j] = sub(a[i][j]||0,b[i][j]||0);
			}
		}
		matrix.rows = rows;
		matrix.columns = columns;
		return matrix;
	},
	
	//determinant
	//it pains me, but I'm only going to do up to 3x3 matrices here
	//maybe later I will do the LU-decomposition thing
	abs: function(m) {
		if(m.rows!=m.columns)
			throw(new LissaJS.Error('matrixmath.abs.non-square'));

		//abstraction failure!
		switch(m.rows)
		{
		case 1:
			return m[0][0];
		case 2:
			return sub( mul(m[0][0],m[1][1]), mul(m[0][1],m[1][0]) );
		case 3:
			return add( sub(
							mul(m[0][0],sub(mul(m[1][1],m[2][2]),mul(m[1][2],m[2][1]))),
							mul(m[0][1],sub(mul(m[1][0],m[2][2]),mul(m[1][2],m[2][0])))
						),
						mul(m[0][2],sub(mul(m[1][0],m[2][1]),mul(m[1][1],m[2][0])))
					);
		default:
			throw(new LissaJS.Error('matrixmath.abs.too big'));
		}
	},

	scalarmul: function(k,m) {
		var out = m.map(function(row){ return row.map(function(x){ return mul(k,x); }); });
		out.rows = m.rows;
		out.columns = m.columns;
		return out;
	},

	mul: function(a,b) {
		if(a.columns!=b.rows)
			throw(new LissaJS.Error('matrixmath.mul.different sizes'));

		var out = [];
		out.rows = a.rows;
		out.columns = b.columns;
		for(var i=0;i<a.rows;i++)
		{
			var row = [];
			out.push(row);
			for(var j=0;j<b.columns;j++)
			{
				var s = 0;
				for(var k=0;k<a.columns;k++)
				{
					s = add(s,mul(a[i][k],b[k][j]));
				}
				row.push(s);
			}
		}
		return out;
	},

	eq: function(a,b) {
		var rows = Math.max(a.rows,b.rows);
		for(var i=0;i<rows;i++)
		{
			var rowA = a[i] || [];
			var rowB = b[i] || [];
			for(var j=0;j<rows;j++)
			{
				if(!eq(rowA[j]||0,rowB[j]||0))
					return false;
			}
		}
		return true;
	},
	neq: function(a,b) {
		return !matrixmath.eq(a,b);
	},

	id: function(n) {
		var out = [];
		out.rows = out.columns = n;
		for(var i=0;i<n;i++)
		{
			var row = [];
			out.push(row);
			for(var j=0;j<n;j++)
				row.push(j==i ? 1 : 0);
		}
		return out;
	},

	transpose: function(m) {
		var out = [];
		out.rows = m.columns;
		out.columns = m.rows;

		for(var i=0;i<m.columns;i++)
		{
			var row = [];
			out.push(row);
			for(var j=0;j<m.rows;j++)
			{
				row.push(m[j][i]||0);
			}
		}
		return out;
	}
};

var jme = LissaJS.jme = {

	constants: {
		'e': Math.E,
		'pi': Math.PI,
		'i': math.complex(0,1),
		'infinity': Infinity,
		'infty': Infinity
	},

	re: {
		re_bool: /^true|^false/i,
		re_number: /^[0-9]+(?:\x2E[0-9]+)?/,
		re_name: /^{?((?:(?:[a-zA-Z]+):)*)((?:\$?[a-zA-Z_][a-zA-Z0-9_]*'*)|\?)}?/i,
		re_short_name: /((?:(?:[a-zA-Z]+):)*\$?[a-zA-Z_][0-9_]*'*)/gi,
		re_op: /^(\.\.|#|<=|>=|<>|&&|\|\||[\|*+\-\/\^<>=!&]|(?:(not|and|or|xor|isa|except)([^a-zA-Z0-9]|$)))/i,
		re_punctuation: /^([\(\),\[\]])/,
		re_string: /^(['"])((?:[^\1\\]|\\.)*?)\1/,
		re_special: /^\\\\([%!+\-\,\.\/\:;\?\[\]=\*\&<>\|~\(\)]|\d|([a-zA-Z]+))/,
		re_comment: /^\/\/.*(?:\n|$)/
	},

	tokenise: function(expr)
	//takes a string in and returns a list of tokens 
	{
		if(!expr)
			return [];

		expr += '';
		
		var oexpr = expr;

		expr = expr.replace(jme.re.re_strip_whitespace, '');	//get rid of whitespace

		var tokens = [];
		var i = 0;
		
		while( expr.length )
		{
			expr = expr.replace(jme.re.re_strip_whitespace, '');	//get rid of whitespace
		
			var result;
			var token;

            while(result=expr.match(jme.re.re_comment)) {
                expr=expr.slice(result[0].length).replace(jme.re.re_strip_whitespace,'');
            }

			if(result = expr.match(jme.re.re_number))
			{
				token = new TNum(result[0]);

				if(tokens.length>0 && (tokens[tokens.length-1].type==')' || tokens[tokens.length-1].type=='name'))	//right bracket followed by a number is interpreted as multiplying contents of brackets by number
				{
					tokens.push(new TOp('*'));
				}
			}
			else if (result = expr.match(jme.re.re_bool))
			{
				token = new TBool(util.parseBool(result[0]));
			}
			else if (result = expr.match(jme.re.re_op))
			{
				if(result[2])		//if word-ish operator
					result[0] = result[2];
				token = result[0];
				//work out if operation is being used prefix or postfix
				var nt;
				var postfix = false;
				if( tokens.length===0 || (nt=tokens[tokens.length-1].type)=='(' || nt==',' || nt=='[' || (nt=='op' && !tokens[tokens.length-1].postfix) )
				{
					if(token in prefixForm)
						token = prefixForm[token];
				}
				else
				{
					if(token in postfixForm) {
						token = postfixForm[token];
						postfix = true;
					}
				}
				token=new TOp(token,postfix);
			}
			else if (result = expr.match(jme.re.re_name))
			{
				var name = result[2];
				var annotation = result[1] ? result[1].split(':') : null;
				if(!annotation)
				{
					var lname = name.toLowerCase();
					// fill in constants here to avoid having more 'variables' than necessary
					if(lname in jme.constants) {
						token = new TNum(jme.constants[lname]);
					}else{
						token = new TName(name);
					}
				}
				else
				{
					token = new TName(name,annotation);
				}
				
				if(tokens.length>0 && (tokens[tokens.length-1].type=='number' || tokens[tokens.length-1].type=='name' || tokens[tokens.length-1].type==')')) {	//number or right bracket or name followed by a name, eg '3y', is interpreted to mean multiplication, eg '3*y'
					tokens.push(new TOp('*'));
				}
			}
			else if (result = expr.match(jme.re.re_punctuation))
			{
				if(result[0]=='(' && tokens.length>0 && (tokens[tokens.length-1].type=='number' || tokens[tokens.length-1].type==')')) {	//number or right bracket followed by left parenthesis is also interpreted to mean multiplication
					tokens.push(new TOp('*'));
				}

				token = new TPunc(result[0]);
			}
			else if (result = expr.match(jme.re.re_string))
			{
				var str = result[2];
	
				var estr = '';
				while(true) {
					i = str.indexOf('\\');
					if(i==-1)
						break;
					else {
						estr += str.slice(0,i);
						var c;
						if((c=str.charAt(i+1))=='n') {
							estr+='\n';
						}
						else if(c=='{' || c=='}') {
							estr+='\\'+c;
						}
						else {
							estr+=c;
						}
						str=str.slice(i+2);
					}
				}
				estr+=str;

				token = new TString(estr);
			}
			else if (result = expr.match(jme.re.re_special))
			{
				var code = result[1] || result[2];
				
				var tex;
				var cons = TSpecial;
				if( varsymbols.contains(code) )	//varsymbols letters should act like variable names
				{
					cons = TName;
				}
				if(samesymbols.contains(code))	//numbers, punctuation, etc. can be left as they are
				{
					tex = code;
				}
				else if (symbols[code]!==undefined)	//is code in dictionary of things that have a particular translation?
				{
					tex = symbols[code];
				}
				else	//otherwise latex command must be the same as numbas, so stick a slash in front
				{
					tex = '\\'+code;
				}

				token = new cons(tex);
			}
			else if(expr.length)
			{
				//invalid character or not able to match a token
				throw(new LissaJS.Error('jme.tokenise.invalid',oexpr));
			}
			else
				break;
			
			expr=expr.slice(result[0].length);	//chop found token off the expression
			
			tokens.push(token);
		}

		//rewrite some synonyms
		for(i=0; i<tokens.length; i++)
		{
			if(tokens[i].name)
			{
				if(synonyms[tokens[i].name])
					tokens[i].name=synonyms[tokens[i].name];
			}
		}


		return(tokens);
	},

	shunt: function(tokens)
	// turns tokenised infix expression into a parse tree (shunting yard algorithm, wikipedia has a good description)
	{
		var output = [];
		var stack = [];
		
		var numvars=[],olength=[],listmode=[];

		function addoutput(tok)
		{
			if(tok.vars!==undefined)
			{
				if(output.length<tok.vars)
					throw(new LissaJS.Error('jme.shunt.not enough arguments',tok.name || tok.type));

				var thing = {tok: tok,
							 args: output.slice(output.length-tok.vars)};
				output = output.slice(0,output.length-tok.vars);
				output.push(thing);
			}
			else
				output.push({tok:tok});
		}

		for(var i = 0;i < tokens.length; i++ )
		{
			var tok = tokens[i];
			var n;
			var l;
			var f;
			
			switch(tok.type) 
			{
			case "number":
			case "string":
			case 'boolean':
				addoutput(tok);
				break;
			case 'special':
				while( stack.length && stack[stack.length-1].type != "(" )
				{
					addoutput(stack.pop());
				}
				addoutput(tok);
				break;
			case "name":
				if( i<tokens.length-1 && tokens[i+1].type=="(")
				{
						stack.push(new TFunc(tok.name,tok.annotation));
						numvars.push(0);
						olength.push(output.length);
				}
				else 
				{										//this is a variable otherwise
					addoutput(tok);
				}
				break;
				
			case ",":
				while( stack.length && stack[stack.length-1].type != "(" && stack[stack.length-1].type != '[')
				{	//reached end of expression defining function parameter, so pop all of its operations off stack and onto output
					addoutput(stack.pop());
				}

				numvars[numvars.length-1]++;

				if( ! stack.length )
				{
					throw(new LissaJS.Error('jme.shunt.no left bracket in function'));
				}
				break;
				
			case "op":

				var o1 = precedence[tok.name];
				while(stack.length && stack[stack.length-1].type=="op" && ((o1 > precedence[stack[stack.length-1].name]) || (leftAssociative(tok.name) && o1 == precedence[stack[stack.length-1].name]))) 
				{	//while ops on stack have lower precedence, pop them onto output because they need to be calculated before this one. left-associative operators also pop off operations with equal precedence
					addoutput(stack.pop());
				}
				stack.push(tok);
				break;

			case '[':
				if(i===0 || tokens[i-1].type=='(' || tokens[i-1].type=='[' || tokens[i-1].type==',' || tokens[i-1].type=='op')	//define list
				{
					listmode.push('new');
				}
				else		//list index
					listmode.push('index');

				stack.push(tok);
				numvars.push(0);
				olength.push(output.length);
				break;

			case ']':
				while( stack.length && stack[stack.length-1].type != "[" ) 
				{
					addoutput(stack.pop());
				}
				if( ! stack.length ) 
				{
					throw(new LissaJS.Error('jme.shunt.no left square bracket'));
				}
				else
				{
					stack.pop();	//get rid of left bracket
				}

				//work out size of list
				n = numvars.pop();
				l = olength.pop();
				if(output.length>l)
					n++;

				switch(listmode.pop())
				{
				case 'new':
					addoutput(new TList(n));
					break;
				case 'index':
					f = new TFunc('listval');
					f.vars = 2;
					addoutput(f);
					break;
				}
				break;
				
			case "(":
				stack.push(tok);
				break;
				
			case ")":
				while( stack.length && stack[stack.length-1].type != "(" ) 
				{
					addoutput(stack.pop());
				}
				if( ! stack.length ) 
				{
					throw(new LissaJS.Error('jme.shunt.no left bracket'));
				}
				else
				{
					stack.pop();	//get rid of left bracket

					//if this is a function call, then the next thing on the stack should be a function name, which we need to pop
					if( stack.length && stack[stack.length-1].type=="function") 
					{	
						//work out arity of function
						n = numvars.pop();
						l = olength.pop();
						if(output.length>l)
							n++;
						f = stack.pop();
						f.vars = n;

						addoutput(f);
					}
				}
				break;
			}
		}

		//pop all remaining ops on stack into output
		while(stack.length)
		{
			var x = stack.pop();
			if(x.type=="(")
			{
				throw(new LissaJS.Error('jme.shunt.no right bracket'));
			}
			else
			{
				addoutput(x);
			}
		}

		if(listmode.length>0)
			throw(new LissaJS.Error('jme.shunt.no right square bracket'));

		if(output.length>1)
			throw(new LissaJS.Error('jme.shunt.missing operator'));

		return(output[0]);
	},


	substituteTree: function(tree,scope,allowUnbound)
	{
		if(!tree)
			return null;
		if(tree.tok.bound)
			return tree;

		if(tree.args===undefined)
		{
			if(tree.tok.type=='name')
			{
				var name = tree.tok.name.toLowerCase();
				if(scope.variables[name]===undefined)
				{
					if(allowUnbound)
						return {tok: new TName(name)};
					else
						throw new LissaJS.Error('jme.substituteTree.undefined variable',name);
				}
				else
				{
					if(scope.variables[name].tok)
						return scope.variables[name];
					else
						return {tok: scope.variables[name]};
				}
			}
			else
				return tree;
		}
		else
		{
			tree = {tok: tree.tok,
					args: tree.args.slice()};
			for(var i=0;i<tree.args.length;i++)
				tree.args[i] = jme.substituteTree(tree.args[i],scope,allowUnbound);
			return tree;
		}
	},

	evaluate: function(tree,scope)
	{
		//if a string is given instead of an expression tree, compile it to a tree
		if( typeof(tree)=='string' )
			tree = jme.compile(tree,scope);
		if(!tree)
			return null;


		tree = jme.substituteTree(tree,scope,true);

		var tok = tree.tok;
		var i;

		switch(tok.type)
		{
		case 'number':
		case 'boolean':
		case 'range':
			return tok;
		case 'list':
			if(tok.value===undefined)
			{
				var value = [];
				for(i=0;i<tree.args.length;i++)
				{
					value[i] = jme.evaluate(tree.args[i],scope);
				}
				tok = new TList(value);
			}
			return tok;
		case 'string':
			return new TString(jme.contentsubvars(tok.value,scope));
		case 'name':
			if(tok.name.toLowerCase() in scope.variables)
				return scope.variables[tok.name.toLowerCase()];
			else
				return tok;
			break;
		case 'op':
		case 'function':
			var op = tok.name.toLowerCase();
			if(lazyOps.indexOf(op)>=0) {
				return scope.functions[op][0].evaluate(tree.args,scope);
			}
			else {

				for(i=0;i<tree.args.length;i++) {
					tree.args[i] = jme.evaluate(tree.args[i],scope);
				}

				if(scope.functions[op]===undefined)
				{
					if(tok.type=='function') {
						//check if the user typed something like xtan(y), when they meant x*tan(y)
						var possibleOp = op.slice(1);
						if(possibleOp in scope.functions)
							throw(new LissaJS.Error('jme.typecheck.function maybe implicit multiplication',op,op[0],possibleOp));
						else
							throw(new LissaJS.Error('jme.typecheck.function not defined',op,op));
					}
					else
						throw(new LissaJS.Error('jme.typecheck.op not defined',op));
				}

				for(var j=0;j<scope.functions[op].length; j++)
				{
					var fn = scope.functions[op][j];
					if(fn.typecheck(tree.args))
					{
						tok.fn = fn;
						break;
					}
				}
				if(tok.fn)
					return tok.fn.evaluate(tree.args,scope);
				else
					throw(new LissaJS.Error('jme.typecheck.no right type definition',op));
			}
			break;
		default:
			return tok;
		}
	},

	compile: function(expr,scope)
	{
		if(scope===undefined)
			scope = LissaJS.jme.builtinScope;

		expr+='';	//make sure expression is a string and not a number or anything like that

		if(!expr.trim().length)
			return null;
		//typecheck
		scope = new Scope(scope);

		//tokenise expression
		var tokens = jme.tokenise(expr);

		//compile to parse tree
		var tree = jme.shunt(tokens,scope);

		if(tree===null)
			return;

		return(tree);
	},

	compare: function(expr1,expr2,settings,scope) {
		expr1 += '';
		expr2 += '';

		var compile = jme.compile, evaluate = jme.evaluate;

		var checkingFunction = checkingFunctions[settings.checkingType.toLowerCase()];	//work out which checking type is being used

		try {
			var tree1 = compile(expr1,scope);
			var tree2 = compile(expr2,scope);

			if(tree1 === null || tree2 === null) 
			{	//one or both expressions are invalid, can't compare
				return false; 
			}

			//find variable names used in both expressions - can't compare if different
			var vars1 = findvars(tree1);
			var vars2 = findvars(tree2);
			var r1,r2;

			for(var v in scope.variables)
			{
				delete vars1[v];
				delete vars2[v];
			}
			
			if( !varnamesAgree(vars1,vars2) ) 
			{	//whoops, differing variables
				return false;
			}

			if(vars1.length) 
			{	// if variables are used,  evaluate both expressions over a random selection of values and compare results
				var errors = 0;
				var rs = randoms(vars1, settings.vsetRangeStart, settings.vsetRangeEnd, settings.vsetRangePoints);
				for(var i = 0; i<rs.length; i++) {
					var nscope = new jme.Scope([scope,{variables:rs[i]}]);
					util.copyinto(scope.variables,rs[i]);
					r1 = evaluate(tree1,nscope);
					r2 = evaluate(tree2,nscope);
					if( !resultsEqual(r1,r2,checkingFunction,settings.checkingAccuracy) ) { errors++; }
				}
				if(errors < settings.failureRate) {
					return true;
				}else{
					return false;
				}
			} else {
				//if no variables used, can just evaluate both expressions once and compare
				r1 = evaluate(tree1,scope);
				r2 = evaluate(tree2,scope);
				return resultsEqual(r1,r2,checkingFunction,settings.checkingAccuracy);
			}
		}
		catch(e) {
			return false;
		}

	},

	contentsubvars: function(str, scope)
	{
		var bits = util.contentsplitbrackets(str);	//split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
		var out='';
		for(var i=0; i<bits.length; i++)
		{
			switch(i % 4)
			{
			case 0:	//plain text - variables inserted by expressions in curly braces
				out += jme.subvars(bits[i],scope,true);
				break;
			case 2:	//a TeX expression - variables inserted with \var and \simplify commands
				out += jme.texsubvars(bits[i],scope);
				break;
			case 1:	//a TeX delimiter
			case 3:
				out += bits[i];
				break;
			}
		}
		return out;
	},

	texsplit: function(s)
	{
		var cmdre = /^((?:.|[\n\r])*?)\\(var|simplify)/m;
		var out = [];
		var m;
		while( m = s.match(cmdre) )
		{
			out.push(m[1]);
			var cmd = m[2];
			out.push(cmd);

			var i = m[0].length;
			var si;

			var args = '';
			var argbrackets = false;
			if( s.charAt(i) == '[' )
			{
				argbrackets = true;
				si = i+1;
				while(i<s.length && s.charAt(i)!=']')
					i++;
				if(i==s.length)
					throw(new LissaJS.Error('jme.texsubvars.no right bracket',cmd));
				else
				{
					args = s.slice(si,i);
					i++;
				}
			}
			if(!argbrackets)
				args='all';
			out.push(args);

			if(s.charAt(i)!='{')
			{
				throw(new LissaJS.Error('jme.texsubvars.missing parameter',cmd,s));
			}

			var brackets=1;
			si = i+1;
			while(i<s.length-1 && brackets>0)
			{
				i++;
				if(s.charAt(i)=='{')
					brackets++;
				else if(s.charAt(i)=='}')
					brackets--;
			}
			if(i == s.length-1 && brackets>0)
				throw(new LissaJS.Error('jme.texsubvars.no right brace',cmd));

			var expr = s.slice(si,i);
			s = s.slice(i+1);
			out.push(expr);
		}
		out.push(s);
		return out;
	},

	texsubvars: function(s,scope)
	{
		var bits = jme.texsplit(s);
		var out = '';
		for(var i=0;i<bits.length-3;i+=4)
		{
			out+=bits[i];
			var cmd = bits[i+1],
				args = bits[i+2],
				expr = bits[i+3];

			if(expr.length)
			{
				switch(cmd)
				{
				case 'var':	//substitute a variable
					var v = jme.evaluate(jme.compile(expr,scope),scope);
					v = jme.display.texify({tok: v});
					out += ' '+v+' ';
					break;
				case 'simplify': //a JME expression to be simplified
					expr = jme.subvars(expr,scope);
					var tex = jme.display.exprToLaTeX(expr,args,scope);
					out += ' '+tex+' ';
					break;
				}
			}
			else
				out+=' ';
		}
		return out+bits[bits.length-1];
	},

	//substitutes variables into a string "text {expr1} text {expr2} ..."
	subvars: function(str, scope,display)
	{
		var bits = util.splitbrackets(str,'{','}');
		if(bits.length==1)
		{
			return str;
		}
		var out = '';
		for(var i=0; i<bits.length; i++)
		{
			if(i % 2)
			{
				var v = jme.evaluate(jme.compile(bits[i],scope),scope);
				if(v.type=='number')
				{
					v = LissaJS.math.niceNumber(v.value);
					if(display)
						v = ''+v+'';
					else
						v = '('+v+')';
				}
				else if(v.type=='string')
				{
					if(display)
						v = v.value;
					else
						v = "'"+v.value+"'";
				}
				else
				{
					v = jme.display.treeToJME({tok:v});
				}

				out += v;
			}
			else
			{
				out+=bits[i];
			}
		}
		return out;
	},
	unwrapValue: function(v) {
		if(v.type=='list')
			return v.value.map(jme.unwrapValue);
		else
			return v.value;
	},
	wrapValue: function(v) {
		switch(typeof v) {
		case 'number':
			return new jme.types.TNum(v);
		case 'string':
			return new jme.types.TString(v);
		case 'boolean':
			return new jme.types.TBool(v);
		default:
			if(Array.isArray(v)) {
				v = v.map(jme.wrapValue);
				return new jme.types.TList(v);
			}
			return v;
		}
	}
};

jme.re.re_whitespace = '(?:[\\s \\f\\n\\r\\t\\v\\u00A0\\u2028\\u2029]|(?:&nbsp;))';
jme.re.re_strip_whitespace = new RegExp('^'+jme.re.re_whitespace+'+|'+jme.re.re_whitespace+'+$','g');


var displayFlags = {
	fractionnumbers: undefined,
	rowvector: undefined
};

var ruleSort = util.sortBy('patternString');
var Ruleset = jme.Ruleset = function(rules,flags) {
	this.rules = rules;
	this.flags = util.extend(displayFlags,flags);
};
Ruleset.prototype = {
	flagSet: function(flag) {
		flag = flag.toLowerCase();
		if(this.flags.hasOwnProperty(flag))
			return this.flags[flag];
		else
			return false;
	}
};

function mergeRulesets(r1,r2) {
	var rules = mergeArrays(r1.rules,r2.rules,ruleSort);
	var flags = util.extend(r1.flags,r2.flags);
	return new Ruleset(rules, flags);
}

//collect a ruleset together from a list of ruleset names, or rulesets.
// set can be a comma-separated string of ruleset names, or an array of names/Ruleset objects.
var collectRuleset = jme.collectRuleset = function(set,scopeSets)
{
	scopeSets = util.copyobj(scopeSets);

	if(!set)
		return [];

	if(!scopeSets)
		throw(new LissaJS.Error('jme.display.collectRuleset.no sets'));

	var rules = [];
	var flags = {};

	if(typeof(set)=='string') {
		set = set.split(',');
	}
	else {
		flags = util.extend(flags,set.flags);
		if(set.rules)
			set = set.rules;
	}

	for(var i=0; i<set.length; i++ )
	{
		if(typeof(set[i])=='string')
		{
			var m = /^(!)?(.*)$/.exec(set[i]);
			var neg = m[1]=='!' ? true : false;
			var name = m[2].trim().toLowerCase();
			if(name in displayFlags)
			{
				flags[name]= !neg;
			}
			else if(name.length>0)
			{
				if(!(name in scopeSets))
				{
					throw(new LissaJS.Error('jme.display.collectRuleset.set not defined',name));
				}

				var sub = collectRuleset(scopeSets[name],scopeSets);

				flags = util.extend(flags,sub.flags);
				var j;

				scopeSets[name] = sub;
				if(neg)
				{
					for(j=0; j<sub.rules.length; j++)
					{
						if((m=rules.indexOf(sub.rules[j]))>=0)
						{
							rules.splice(m,1);
						}
					}
				}
				else
				{
					for(j=0; j<sub.rules.length; j++)
					{
						if(!(rules.contains(sub.rules[j])))
						{
							rules.push(sub.rules[j]);
						}
					}
				}
			}
		}
		else
			rules.push(set[i]);
	}
	return new Ruleset(rules,flags);
};

//evaluation environment
//if called with a list of scopes, they will be combined into this new one
var fnSort = util.sortBy('id');
var Scope = jme.Scope = function(scopes) {
	this.variables = {};
	this.functions = {};
	this.rulesets = {};

	if(scopes===undefined)
		return;

	if(!Array.isArray(scopes))
		scopes = [scopes];

	var x;
	for(var i=0;i<scopes.length;i++) {
		var scope = scopes[i];
		if(scope) {
			if('variables' in scope) {
				for(x in scope.variables) {
					this.variables[x] = scope.variables[x];
				}
			}
			if('functions' in scope) {
				for(x in scope.functions) {
					if(!(x in this.functions))
						this.functions[x] = scope.functions[x].slice();
					else 
						this.functions[x] = mergeArrays(this.functions[x],scope.functions[x],fnSort);
				}
			}
			if('rulesets' in scope) {
				for(x in scope.rulesets) {
					if(!(x in this.rulesets))
						this.rulesets[x] = scope.rulesets[x];
					else
						this.rulesets[x] = mergeRulesets(this.rulesets[x],scope.rulesets[x]);
				}
			}
		}
	}
};

Scope.prototype = {
	addFunction: function(fn) {
		if(!(fn.name in this.functions))
			this.functions[fn.name] = [fn];
		else
			this.functions[fn.name].push(fn);
	}
};

//dictionary mapping numbas symbols to LaTeX symbols
//symbols \\x not in this dictionary will be mapped to \x.

var varsymbols = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','psi','chi','phi','omega','=','space'];
var samesymbols = '!+-,./0123456789:;?[]=';
var symbols = {
	'space': ' ',				'&': '\\&',							'contains': '\\ni',
	'*': '\\ast',				'<': '\\lt',						'>': '\\gt',
	'congruent': '\\cong',		'perpendicular': '\\perp',			'uptee': '\\perp',
	'overscore': '\\bar',		'|': '\\mid',						'~': '\\sim',
	'dash': '^{\\prime}',			'leftanglebracket': '\\langle',		'le': '\\leq',
	'infinity': '\\infty',		'doublearrow': '\\leftrightarrow',	'degree': '^{\\circ}',
	'plusorminus': '\\pm',		'doublequotes': '"',				'ge': '\\geq',
	'proportional': '\\propto',	'filledcircle': '\\bullet',			'divide': '\\div',
	'notequal': '\\neq',		'identical': '\\equiv',				'approximately': '\\approx',
	'vbar': '\\mid',			'hbar': '---',						'dots': '\\ldots',
	'imaginary': '\\mathbb{I}',	'real': '\\mathbb{R}',				'osol': '\\varnothing',
	'subsetequal': '\\supseteq','subset': '\\supset',				'notsubset': '\\not \\subset',
	'supersetequal': '\\subseteq','superset': '\\subset',			'notin': '\\not \\in',
	'product': '\\prod',		'sqrt': '\\sqrt',					'dot': '\\cdot',
	'¬': '\\neg',				'logicaland': '\\wedge',			'logicalor': '\\vee',
	'doubleimplies': '\\Leftrightarrow',							'impliesby': '\\Leftarrow',
	'impliesup': '\\Uparrow',	'impliesdown': '\\Downarrow',		'implies': '\\Rightarrow',
	'rightanglebracket': '\\rangle',								'integral': '\\int',
	'(': '\\left ( \\right .',					')': '\\left ) \\right .'
};



//a length-sorted list of all the builtin functions, for recognising stuff like xcos() as x*cos()
var builtinsbylength=[],builtinsre=new RegExp();
builtinsbylength.add = function(e)
{
	if(!e.match(/^[a-zA-Z]+$/)){return;}
	var l = e.length;
	for(var i=0;i<this.length;i++)
	{
		if(this[i].length<=l)
		{
			this.splice(i,0,e);
			builtinsre = new RegExp('('+builtinsbylength.join('|')+')$');
			return;
		}
	}
	this.push(e);
	builtinsre = new RegExp('('+builtinsbylength.join('|')+')$');
};


//the data types supported by JME expressions
var types = jme.types = {};
var TNum = types.TNum = types.number = function(num)
{
	if(num===undefined) 
		return;

	this.value = num.complex ? num : parseFloat(num);
};

TNum.prototype.type = 'number';
TNum.doc = {
	name: 'number',
	usage: ['0','1','0.234','i','e','pi'],
	description: "@i@, @e@, @infinity@ and @pi@ are reserved keywords for the imaginary unit, the base of the natural logarithm, $\\infty$ and $\\pi$, respectively."
};

var TString = types.TString = types.string = function(s)
{
	this.value = s;
};
TString.prototype.type = 'string';
TString.doc = {
	name: 'string',
	usage: ['\'hello\'','"hello"'],
	description: "Use strings to create non-mathematical text."
};

var TBool = types.TBool = types.boolean = function(b)
{
	this.value = b;
};
TBool.prototype.type = 'boolean';
TBool.doc = {
	name: 'boolean',
	usage: ['true','false'],
	description: "Booleans represent either truth or falsity. The logical operations @and@, @or@ and @xor@ operate on and return booleans."
};

var THTML = types.THTML = types.html = function(html) {
	this.value = html;
};
THTML.prototype.type = 'html';
THTML.doc = {
	name: 'html',
	usage: ['html(\'<div>things</div>\')'],
	description: "An HTML DOM node."
};

var TList = types.TList = types.list = function(value)
{
	switch(typeof(value))
	{
	case 'number':
		this.vars = value;
		break;
	case 'object':
		this.value = value;
		this.vars = value.length;
		break;
	default:
		this.vars = 0;
	}
};
TList.prototype.type = 'list';
TList.doc = {
	name: 'list',
	usage: ['[0,1,2,3]','[a,b,c]','[true,false,false]'],
	description: "A list of elements of any data type."
};

var TVector = types.TVector = types.vector = function(value)
{
	this.value = value;
};
TVector.prototype.type = 'vector';
TVector.doc = {
	name: 'vector',
	usage: ['vector(1,2)','vector([1,2,3,4])'],
	description: 'The components of a vector must be numbers.\n\n When combining vectors of different dimensions, the smaller vector is padded with zeroes to make up the difference.'
};

var TMatrix = types.TMatrix = types.matrix = function(value)
{
	this.value = value;
};
TMatrix.prototype.type = 'matrix';
TMatrix.doc = {
	name: 'matrix',
	usage: ['matrix([1,2,3],[4,5,6])','matrix(row1,row2)'],
	description: "Matrices are constructed from lists of numbers, representing the rows.\n\n When combining matrices of different dimensions, the smaller matrix is padded with zeroes to make up the difference."
};

var TRange = types.TRange = types.range = function(range)
{
	this.value = range;
	if(this.value!==undefined)
	{
		var start = this.value[0], end = this.value[1], step = this.value[2];

		//if range is discrete, store all values in range so they don't need to be computed each time
		if(step !== 0)
		{
			var n = (end-start)/step;
			this.size = n+1;
			for(var i=0;i<=n;i++)
			{
				this.value[i+3] = start+i*step;
			}
		}
	}
};
TRange.prototype.type = 'range';
TRange.doc = {
	name: 'range',
	usage: ['1..3','1..3#0.1','1..3#0'],
	description: 'A range @a..b#c@ represents the set of numbers $\\{a+nc | 0 \\leq n \\leq \\frac{b-a}{c} \\}$. If the step size is zero, then the range is the continuous interval $\\[a,b\\]$.'
};

var TName = types.TName = types.name = function(name,annotation)
{
	this.name = name;
	this.value = name;
	this.annotation = annotation;
};
TName.prototype.type = 'name';
TName.doc = {
	name: 'name',
	usage: ['x','X','x1','longName','dot:x','vec:x'],
	description: 'A variable or function name. Names are case-insensitive, so @x@ represents the same thing as @X@. \
\n\n\
@e@, @i@ and @pi@ are reserved names representing mathematical constants. They are rewritten by the interpreter to their respective numerical values before evaluation. \
\n\n\
Names can be given _annotations_ to change how they are displayed. The following annotations are built-in:\
\n\n\
* @verb@ - does nothing, but names like @i@, @pi@ and @e@ are not interpreted as the famous mathematical constants.\n\
* @op@ - denote the name as the name of an operator -- wraps the name in the LaTeX @\\operatorname@ command when displayed\n\
* @v@ or @vector@ - denote the name as representing a vector -- the name is displayed in boldface\n\
* @unit@ - denote the name as representing a unit vector -- places a hat above the name when displayed\n\
* @dot@ - places a dot above the name when displayed, for example when representing a derivative\n\
* @m@ or @matrix@ - denote the name as representing a matrix -- displayed using a non-italic font\
\n\n\
Any other annotation is taken to be a LaTeX command. For example, a name @vec:x@ is rendered in LaTeX as <code>\\vec{x}</code>, which places an arrow above the name.\
	'
};

var TFunc = types.TFunc = types['function'] = function(name,annotation)
{
	this.name = name;
	this.annotation = annotation;
};
TFunc.prototype.type = 'function';
TFunc.prototype.vars = 0;

var TOp = types.TOp = types.op = function(op,postfix)
{
	var arity = 2;
	if(jme.arity[op]!==undefined)
		arity = jme.arity[op];

	this.name = op;
	this.postfix = postfix || false;
	this.vars = arity;
};
TOp.prototype.type = 'op';

var TPunc = types.TPunc = function(kind)
{
	this.type = kind;
};


//special character
var TSpecial = jme.types.TSpecial = function(value)
{
	this.value = value;
};
TSpecial.prototype.type = 'special';

//concatenation - for dealing with special characters
var TConc = jme.types.TConc = function()
{
};
TConc.prototype.type = 'conc';

var arity = jme.arity = {
	'!': 1,
	'not': 1,
	'fact': 1,
	'+u': 1,
	'-u': 1
};

//some names represent different operations when used as prefix or as postfix. This dictionary translates them
var prefixForm = {
	'+': '+u',
	'-': '-u',
	'!': 'not'
};
var postfixForm = {
	'!': 'fact'
};

var precedence = jme.precedence = {
	'fact': 1,
	'not': 1,
	'+u': 2.5,
	'-u': 2.5,
	'^': 2,
	'*': 3,
	'/': 3,
	'+': 4,
	'-': 4,
	'|': 5,
	'..': 5,
	'#':6,
	'except': 6.5,
	'<': 7,
	'>': 7,
	'<=': 7,
	'>=': 7,
	'<>': 8,
	'=': 8,
	'isa': 9,
	'and': 11,
	'or': 12,
	'xor': 13
};

var synonyms = {
	'&':'and',
	'&&':'and',
	'divides': '|',
	'||':'or',
	'sqr':'sqrt',
	'gcf': 'gcd',
	'sgn':'sign',
	'len': 'abs',
	'length': 'abs',
	'verb': 'verbatim'
};
	
var lazyOps = ['if','switch','repeat','map','isa'];


function leftAssociative(op)
{
	// check for left-associativity because that is the case when you do something more
	// exponentiation is only right-associative operation at the moment
	return (op!='^');
}

var commutative = jme.commutative =
{
	'*': true,
	'+': true,
	'and': true
};


//function object - for doing type checking away from the evaluator
//intype is a list of data type constructors (TNum, etc.) for function's parameters' types
//use the string '?' to match any type
//put a * in front of the type name to 
//outtype is the type constructor corresponding to the value the function returns
//fn is the function to be evaluated
//
//options can contain any of:
//	typecheck: a function which checks whether the funcObj can be applied to the given arguments 
//  evaluate: a function which performs the funcObj on given arguments and variables. Arguments are passed as expression trees, i.e. unevaluated
//  unwrapValues: unwrap list elements in arguments into javascript primitives before passing to the evaluate function
var funcObjAcc = 0;	//accumulator for ids for funcObjs, so they can be sorted
var funcObj = jme.funcObj = function(name,intype,outcons,fn,options)
{
	this.id = funcObjAcc++;
	options = options || {};
	for(var i=0;i<intype.length;i++)
	{
		if(intype[i]!='?')
		{
			if(intype[i][0]=='*')
			{
				var type = types[intype[i].slice(1)];
				intype[i] = '*'+(new type()).type;
			}
			else
			{
				intype[i]=new intype[i]().type;
			}
		}
	}

	name = name.toLowerCase();

	this.name=name;
	this.intype = intype;
	if(typeof(outcons)=='function')
		this.outtype = new outcons().type;
	else
		this.outtype = '?';
	this.outcons = outcons;
	this.fn = fn;

	this.typecheck = options.typecheck || function(variables)
	{
		variables = variables.slice();	//take a copy of the array

		for( var i=0; i<this.intype.length; i++ )
		{
			if(this.intype[i][0]=='*')	//arbitrarily many
			{
				var ntype = this.intype[i].slice(1);
				while(variables.length)
				{
					if(variables[0].type==ntype || ntype=='?' || variables[0].type=='?')
						variables = variables.slice(1);
					else
						return false;
				}
			}else{
				if(variables.length===0)
					return false;

				if(variables[0].type==this.intype[i] || this.intype[i]=='?' || variables[0].type=='?')
					variables = variables.slice(1);
				else
					return false;
			}
		}
		if(variables.length>0)	//too many args supplied
			return false;
		else
			return true;
	};

	this.evaluate = options.evaluate || function(args)
	{
		var nargs = [];
		for(var i=0; i<args.length; i++) {
			if(options.unwrapValues)
				nargs.push(jme.unwrapValue(args[i]));
			else
				nargs.push(args[i].value);
		}

		var result = this.fn.apply(null,nargs);

		if(options.unwrapValues) {
			result = jme.wrapValue(result);
			if(!result.type)
				result = new this.outcons(result);
		}
		else
			result = new this.outcons(result);

		return result;
	};

	this.doc = options.doc;
};

// the built-in operations and functions
var builtinScope = jme.builtinScope = new Scope();

builtinScope.functions['eval'] = [{
	name: 'eval',
	intype: ['?'],
	outtype: '?',
	typecheck: function(){return true;},
	doc: {
		usage: ['eval(x+2)'],
		description: 'Dummy function used by simplification rules to evaluate an expression.'
	}
}];

function newBuiltin(name,intype,outcons,fn,options) {
	return builtinScope.addFunction(new funcObj(name,intype,outcons,fn,options));
}

newBuiltin('+u', [TNum], TNum, function(a){return a;}, {doc: {usage: '+x', description: "Unary addition.", tags: ['plus','positive']}});	
newBuiltin('+u', [TVector], TVector, function(a){return a;}, {doc: {usage: '+x', description: "Vector unary addition.", tags: ['plus','positive']}});	
newBuiltin('+u', [TMatrix], TMatrix, function(a){return a;}, {doc: {usage: '+x', description: "Matrix unary addition.", tags: ['plus','positive']}});	
newBuiltin('-u', [TNum], TNum, math.negate, {doc: {usage: '-x', description: "Negation.", tags: ['minus','negative','negate']}});
newBuiltin('-u', [TVector], TVector, vectormath.negate, {doc: {usage: '-x', description: "Vector negation.", tags: ['minus','negative','negate']}});
newBuiltin('-u', [TMatrix], TMatrix, matrixmath.negate, {doc: {usage: '-x', description: "Matrix negation.", tags: ['minus','negative','negate']}});

newBuiltin('+', [TNum,TNum], TNum, math.add, {doc: {usage: 'x+y', description: "Add two numbers together.", tags: ['plus','add','addition']}});

newBuiltin('+', [TList,TList], TList, null, {
	evaluate: function(args)
	{
		var value = args[0].value.concat(args[1].value);
		return new TList(value);
	},

	doc: {
		usage: ['list1+list2','[1,2,3]+[4,5,6]'],
		description: "Concatenate two lists.",
		tags: ['join','append','concatenation']
	}
});

newBuiltin('+',[TList,'?'],TList, null, {
	evaluate: function(args)
	{
		var value = args[0].value.slice();
		value.push(args[1]);
		return new TList(value);
	},

	doc: {
		usage: ['list+3','[1,2] + 3'],
		description: "Add an item to a list",
		tags: ['push','append','insert']
	}
});

var fconc = function(a,b) { return a+b; };
newBuiltin('+', [TString,'?'], TString, fconc, {doc: {usage: '\'Hello \' + name', description: '_string_ + _anything else_ is string concatenation.', tags: ['concatenate','concatenation','add','join','strings','plus']}});
newBuiltin('+', ['?',TString], TString, fconc, {doc: {usage: 'name + \' is OK.\'', description: '_string_ + _anything else_ is string concatenation.', tags: ['concatenate','concatenation','add','join','strings','plus']}});

newBuiltin('+', [TVector,TVector], TVector, vectormath.add, {doc: {usage: 'vector(1,2) + vector(0,1)', description: 'Add two vectors.', tags: ['addition','plus']}});
newBuiltin('+', [TMatrix,TMatrix], TMatrix, matrixmath.add, {doc: {usage: 'matrix([1,0],[0,1]) + matrix([2,2],[2,2])', description: 'Add two matrices.', tags: ['addition','plus']}});
newBuiltin('-', [TNum,TNum], TNum, math.sub, {doc: {usage: ['x-y','2 - 1'], description: 'Subtract one number from another.', tags: ['minus','take away','subtraction']}});
newBuiltin('-', [TVector,TVector], TVector, vectormath.sub, {doc: {usage: 'vector(1,2) - vector(2,3)', description: 'Subtract one vector from another.', tags: ['subtraction','minus','take away']}});
newBuiltin('-', [TMatrix,TMatrix], TMatrix, matrixmath.sub, {doc: {usage: 'matrix([1,1],[2,3]) - matrix([3,3],[2,2])', description: 'Subtract one matrix from another.', tags: ['subtraction','minus','take away']}});
newBuiltin('*', [TNum,TNum], TNum, math.mul, {doc: {usage: ['3x','3*x','x*y','x*3'], description: 'Multiply two numbers.', tags: ['multiplication','compose','composition','times']}} );
newBuiltin('*', [TNum,TVector], TVector, vectormath.mul, {doc: {usage: '3*vector(1,2,3)', description: 'Multiply a vector on the left by a scalar.', tags: ['multiplication','composition','compose','times']}});
newBuiltin('*', [TVector,TNum], TVector, function(a,b){return vectormath.mul(b,a);}, {doc: {usage: 'vector(1,2,3) * 3', description: 'Multiply a vector on the right by a scalar.', tags: ['multiplication','composition','compose','times']}});
newBuiltin('*', [TMatrix,TVector], TVector, vectormath.matrixmul, {doc: {usage: 'matrix([1,0],[0,1]) * vector(1,2)', description: 'Multiply a matrix by a vector.', tags: ['multiplication','composition','compose','times']}});
newBuiltin('*', [TNum,TMatrix], TMatrix, matrixmath.scalarmul, {doc: {usage: '3*matrix([1,0],[0,1])', description: 'Multiply a matrix on the left by a scalar.', tags: ['multiplication','composition','compose','times']}} );
newBuiltin('*', [TMatrix,TNum], TMatrix, function(a,b){ return matrixmath.scalarmul(b,a); }, {doc: {usage: 'matrix([1,0],[1,2]) * 3', description: 'Multiply a matrix on the right by a scalar.', tags: ['multiplication','composition','compose','times']}} );
newBuiltin('*', [TMatrix,TMatrix], TMatrix, matrixmath.mul, {doc: {usage: 'matrix([1,0],[1,1]) * matrix([2,3],[3,4])', description: 'Multiply two matrices.', tags: ['multiplication','composition','compose','times']}});
newBuiltin('/', [TNum,TNum], TNum, math.div, {doc: {usage: ['x/y','3/2'], description: 'Divide two numbers.', tags: ['division','quotient','fraction']}} );
newBuiltin('^', [TNum,TNum], TNum, math.pow, {doc: {usage: ['x^y','x^2','2^x','e^x'], description: 'Exponentiation.', tags: ['power','exponentiate','raise']}} );

newBuiltin('dot',[TVector,TVector],TNum,vectormath.dot, {doc: {usage: 'dot( vector(1,2,3), vector(2,3,4) )', description: 'Dot product of two vectors', tags: ['projection','project']}});
newBuiltin('dot',[TMatrix,TVector],TNum,vectormath.dot, {doc: {usage: 'dot( matrix([1],[2],[3]), vector(1,2,3) )', description: 'If the left operand is a matrix with one column, treat it as a vector, so we can calculate the dot product with another vector.', tags: ['projection','project']}});
newBuiltin('dot',[TVector,TMatrix],TNum,vectormath.dot, {doc: {usage: 'dot( vector(1,2,3), matrix([1],[2],[3]) )', description: 'If the right operand is a matrix with one column, treat it as a vector, so we can calculate the dot product with another vector.', tags: ['projection','project']}});
newBuiltin('dot',[TMatrix,TMatrix],TNum,vectormath.dot, {doc: {usage: 'dot( matrix([1],[2],[3]), matrix( [1],[2],[3] )', description: 'If both operands are matrices with one column, treat them as vectors, so we can calculate the dot product.', tags: ['projection','project']}});
newBuiltin('cross',[TVector,TVector],TVector,vectormath.cross, {doc: {usage: 'cross( vector(1,2,3), vector(1,2,3) )', description: 'Cross product of two vectors.'}});
newBuiltin('cross',[TMatrix,TVector],TVector,vectormath.cross, {doc: {usage: 'cross( matrix([1],[2],[3]), vector(1,2,3) )', description: 'If the left operand is a matrix with one column, treat it as a vector, so we can calculate the cross product with another vector.'}});
newBuiltin('cross',[TVector,TMatrix],TVector,vectormath.cross, {doc: {usage: 'cross( vector(1,2,3), matrix([1],[2],[3]) )', description: 'If the right operand is a matrix with one column, treat it as a vector, so we can calculate the crossproduct with another vector.'}});
newBuiltin('cross',[TMatrix,TMatrix],TVector,vectormath.cross, {doc: {usage: 'cross( matrix([1],[2],[3]), matrix([1],[2],[3]) )', description: 'If both operands are matrices with one column, treat them as vectors, so we can calculate the cross product with another vector.'}});
newBuiltin('det', [TMatrix], TNum, matrixmath.abs, {doc: {usage: 'det( matrix([1,2],[2,3]) )', description: 'Determinant of a matrix.'}});

newBuiltin('transpose',[TVector],TMatrix, vectormath.transpose, {doc: {usage: 'transpose( vector(1,2,3) )', description: 'Transpose of a vector.'}});
newBuiltin('transpose',[TMatrix],TMatrix, matrixmath.transpose, {doc: {usage: 'transpose( matrix([1,2,3],[4,5,6]) )', description: 'Transpose of a matrix.'}});

newBuiltin('id',[TNum],TMatrix, matrixmath.id, {doc: {usage: 'id(3)', description: 'Identity matrix with $n$ rows and columns.'}});

newBuiltin('..', [TNum,TNum], TRange, math.defineRange, {doc: {usage: ['a..b','1..2'], description: 'Define a range', tags: ['interval']}});
newBuiltin('#', [TRange,TNum], TRange, math.rangeSteps, {doc: {usage: ['a..b#c','0..1 # 0.1'], description: 'Set the step size for a range.'}}); 

newBuiltin('html',[TString],THTML,
	function(html) { 
		var node = document.createElement('div'); 
		node.innerHTML = html; 
		return node.children[0]; 
	}, 
	{doc: {usage: ['html(\'<div>things</div>\')'], description: 'Parse HTML from a string', tags: ['element','node']}}
);
newBuiltin('image',[TString],THTML,
	function(url){ 
		var img = document.createElement('img');
		img.setAttribute('src',url);
		return img;
	}, 
	{doc: {usage: ['image(\'picture.png\')'], description: 'Load an image from the given URL', tags: ['element','image','html']}}
);

newBuiltin('latex',[TString],TString,null,{
	evaluate: function(args) {
		args[0].latex = true;
		return args[0];
	},
	doc: {
		usage: ['latex("something")'],
		description: 'Output a string as raw LaTeX. Normally, strings are wrapped in a \\textrm command.'
	}
});

newBuiltin('capitalise',[TString],TString,function(s) { return util.capitalise(s); }, {doc: {usage: ['capitalise(\'hello there\')'], description: 'Capitalise the first letter of a string', tags: ['upper-case','case','upper']}});
newBuiltin('upper',[TString],TString,function(s) { return s.toUpperCase(); }, {doc: {usage: ['upper(\'hello there\')'], description: 'Change all the letters in a string to capitals.', tags: ['upper-case','case','upper','capitalise','majuscule']}});
newBuiltin('lower',[TString],TString,function(s) { return s.toLowerCase(); }, {doc: {usage: ['lower(\'HELLO, you!\')'], description: 'Change all the letters in a string to minuscules.', tags: ['lower-case','lower','case']}});

//the next three versions of the `except` operator
//exclude numbers from a range, given either as a range, a list or a single value
newBuiltin('except', [TRange,TRange], TList,
	function(range,except) {
		if(range[2]===0)
			throw(new LissaJS.Error("jme.func.except.continuous range"));
		range = range.slice(3);
		if(except[2]===0)
		{
			return range.filter(function(i){return i<except[0] || i>except[1];}).map(function(i){return new TNum(i);});
		}
		else
		{
			except = except.slice(3);
			return math.except(range,except).map(function(i){return new TNum(i);});
		}
	},

	{doc: {
		usage: '-9..9 except -1..1',
		description: 'Exclude a range of numbers from a larger range.',
		tags: ['except', 'exclude', 'filter', 'remove', 'numbers']
	}}
);

newBuiltin('except', [TRange,TList], TList,
	function(range,except) {
		if(range[2]===0)
			throw(new LissaJS.Error("jme.func.except.continuous range"));
		range = range.slice(3);
		except = except.map(function(i){ return i.value; });
		return math.except(range,except).map(function(i){return new TNum(i);});
	},

	{doc: {
		usage: '-9..9 except [-1,1]',
		description: 'Exclude a list of numbers from a range.',
		tags: ['except', 'exclude', 'filter', 'remove', 'numbers']
	}}
);

newBuiltin('except', [TRange,TNum], TList,
	function(range,except) {
		if(range[2]===0)
			throw(new LissaJS.Error("jme.func.except.continuous range"));
		range = range.slice(3);
		return math.except(range,[except]).map(function(i){return new TNum(i);});
	},

	{doc: {
		usage: '-9..9 except 0',
		description: 'Exclude a number from a range.',
		tags: ['except', 'exclude', 'filter', 'remove', 'numbers']
	}}
);

//exclude numbers from a list, so use the math.except function
newBuiltin('except', [TList,TRange], TList,
	function(range,except) {
		range = range.map(function(i){ return i.value; });
		except = except.slice(3);
		return math.except(range,except).map(function(i){return new TNum(i);});
	},

	{doc: {
		usage: '[1,4,9,16,25,36] except 10..30',
		description: 'Exclude a range of numbers from a list.',
		tags: ['except', 'exclude', 'filter', 'remove', 'numbers']
	}}
);

//exclude values of any type from a list containing values of any type, so use the util.except function
newBuiltin('except', [TList,TList], TList,
	function(list,except) {
		return util.except(list,except);
	},

	{doc: {
		usage: ["['a','b','c'] except ['b','d']",'[vector(0,1),vector(1,0),vector(1,1)] except [vector(1,1),vector(2,2)]'],
		description: 'Remove elements of the second list from the first.',
		tags: ['except', 'exclude', 'filter', 'remove']
	}}
);

newBuiltin('except',[TList,'?'], TList, null, {
	evaluate: function(args) {
		return new TList(util.except(args[0].value,[args[1]]));
	},

	doc: {
		usage: '[a,b,c,d] except b',
		description: 'Exclude a value from a list.',
		tags: ['except', 'exclude', 'filter', 'remove']
	}
});

newBuiltin('<', [TNum,TNum], TBool, math.lt, {doc: {usage: ['x<y','1<2'], description: 'Returns @true@ if the left operand is less than the right operand.', tags: ['comparison','inequality','numbers']}});
newBuiltin('>', [TNum,TNum], TBool, math.gt, {doc: {usage: ['x>y','2>1'], description: 'Returns @true@ if the left operand is greater than the right operand.', tags: ['comparison','inequality','numbers']}} );
newBuiltin('<=', [TNum,TNum], TBool, math.leq, {doc: {usage: ['x <= y','1<=1'], description: 'Returns @true@ if the left operand is less than or equal to the right operand.', tags: ['comparison','inequality','numbers']}} );
newBuiltin('>=', [TNum,TNum], TBool, math.geq, {doc: {usage: 'x >= y', description: 'Returns @true@ if the left operand is greater than or equal to the right operand.', tags: ['comparison','inequality','numbers']}} );
newBuiltin('<>', ['?','?'], TBool, null, {
	evaluate: function(args) {
		return new TBool(util.neq(args[0],args[1]));
	},
	doc: {
		usage: ['\'this string\' <> \'that string\'', 'a <> b', '1<>2','sin(90)<>1'], 
		description: 'Inequality test.', 
		tags: ['comparison','not equal']
	}
});
newBuiltin('=', ['?','?'], TBool, null, {
	evaluate: function(args) {
		return new TBool(util.eq(args[0],args[1]));
	},
	doc: {
		usage: ['x=y','vector(1,2)=vector(1,2,0)','0.1=0.2'], 
		description: 'Equality test.', 
		tags: ['comparison','same','identical']
	}
});

newBuiltin('and', [TBool,TBool], TBool, function(a,b){return a&&b;}, {doc: {usage: ['true && true','true and true'], description: 'Logical AND.'}} );
newBuiltin('not', [TBool], TBool, function(a){return !a;}, {doc: {usage: ['not x','!x'], description: 'Logical NOT.'}} );	
newBuiltin('or', [TBool,TBool], TBool, function(a,b){return a||b;}, {doc: {usage: ['x || y','x or y'], description: 'Logical OR.'}} );
newBuiltin('xor', [TBool,TBool], TBool, function(a,b){return (a || b) && !(a && b);}, {doc: {usage: 'a xor b', description: 'Logical XOR.', tags: ['exclusive or']}} );

newBuiltin('abs', [TNum], TNum, math.abs, {doc: {usage: 'abs(x)', description: 'Absolute value of a number.', tags: ['norm','length','complex']}} );
newBuiltin('abs', [TList], TNum, function(l) { return l.length; }, {doc: {usage: 'abs([1,2,3])', description: 'Length of a list.', tags: ['size','number','elements']}});
newBuiltin('abs', [TRange], TNum, function(r) { return r[2]===0 ? Math.abs(r[0]-r[1]) : r.length-3; }, {doc: {usage: 'abs(1..5)', description: 'Number of elements in a numerical range.', tags: ['size','length']}});
newBuiltin('abs', [TVector], TNum, vectormath.abs, {doc: {usage: 'abs(vector(1,2,3))', description: 'Modulus of a vector.', tags: ['size','length','norm']}});
newBuiltin('arg', [TNum], TNum, math.arg, {doc: {usage: 'arg(1+i)', description: 'Argument of a complex number.', tags: ['angle','direction']}} );
newBuiltin('re', [TNum], TNum, math.re, {doc: {usage: 're(1 + 2i)', description: 'Real part of a complex number.'}} );
newBuiltin('im', [TNum], TNum, math.im, {doc: {usage: 'im(1 + 2i)', description: 'Imaginary part of a complex number.'}} );
newBuiltin('conj', [TNum], TNum, math.conjugate, {doc: {usage: 'conj(1 + 2i)', description: 'Conjugate of a complex number.'}} );

newBuiltin('isint',[TNum],TBool, function(a){ return util.isInt(a); }, {doc: {usage: 'isint(1)', description: 'Returns @true@ if the argument is an integer.', tags: ['test','whole number']}});

newBuiltin('sqrt', [TNum], TNum, math.sqrt, {doc: {usage: 'sqrt(x)', description: 'Square root.'}} );
newBuiltin('ln', [TNum], TNum, math.log, {doc: {usage: 'ln(x)', description: 'Natural logarithm.', tags: ['base e']}} );
newBuiltin('log', [TNum], TNum, math.log10, {doc: {usage: 'log(x)', description: 'Logarithm with base $10$.'}} );
newBuiltin('exp', [TNum], TNum, math.exp, {doc: {usage: 'exp(x)', description: 'Exponentiation. Equivalent to @e^x@. ', tags: ['exponential']}} );
newBuiltin('fact', [TNum], TNum, math.factorial, {doc: {usage: ['fact(x)','x!'], description: 'Factorial.', tags: ['!']}} );
newBuiltin('gamma', [TNum], TNum, math.gamma, {doc: {usage: ['fact(x)','x!'], description: 'Factorial.', tags: ['!']}} );
newBuiltin('sin', [TNum], TNum, math.sin, {doc: {usage: 'sin(x)', description: 'Sine.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('cos', [TNum], TNum, math.cos, {doc: {usage: 'cos(x)', description: 'Cosine.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('tan', [TNum], TNum, math.tan, {doc: {usage: 'tan(x)', description: 'Tangent.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('cosec', [TNum], TNum, math.cosec, {doc: {usage: 'cosec(x)', description: 'Cosecant.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('sec', [TNum], TNum, math.sec, {doc: {usage: 'sec(x)', description: 'Secant.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('cot', [TNum], TNum, math.cot, {doc: {usage: 'cot(x)', description: 'Cotangent.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('arcsin', [TNum], TNum, math.arcsin, {doc: {usage: 'arcsin(x)', description: 'Inverse sine.', tags: ['arcsine']}} );
newBuiltin('arccos', [TNum], TNum, math.arccos, {doc: {usage: 'arccos(x)', description: 'Inverse cosine.', tags: ['arccosine']}} );
newBuiltin('arctan', [TNum], TNum, math.arctan, {doc: {usage: 'arctan(x)', description: 'Inverse tangent.', tags: ['arctangent']}} );
newBuiltin('sinh', [TNum], TNum, math.sinh, {doc: {usage: 'sinh(x)', description: 'Hyperbolic sine.'}} );
newBuiltin('cosh', [TNum], TNum, math.cosh, {doc: {usage: 'cosh(x)', description: 'Hyperbolic cosine.'}} );
newBuiltin('tanh', [TNum], TNum, math.tanh, {doc: {usage: 'tanh(x)', description: 'Hyperbolic tangent.'}} );
newBuiltin('cosech', [TNum], TNum, math.cosech, {doc: {usage: 'cosech(x)', description: 'Hyperbolic cosecant.'}} );
newBuiltin('sech', [TNum], TNum, math.sech, {doc: {usage: 'sech(x)', description: 'Hyperbolic secant.'}} );
newBuiltin('coth', [TNum], TNum, math.coth, {doc: {usage: 'coth(x)', description: 'Hyperbolic cotangent.'}} );
newBuiltin('arcsinh', [TNum], TNum, math.arcsinh, {doc: {usage: 'arcsinh(x)', description: 'Inverse hyperbolic sine.'}} );
newBuiltin('arccosh', [TNum], TNum, math.arccosh, {doc: {usage: 'arccosh(x)', description: 'Inverse hyperbolic cosine.'}} );
newBuiltin('arctanh', [TNum], TNum, math.arctanh, {doc: {usage: 'arctanh(x)', description: 'Inverse hyperbolic tangent.'}} );
newBuiltin('ceil', [TNum], TNum, math.ceil, {doc: {usage: 'ceil(x)', description: 'Round up to nearest integer.', tags: ['ceiling']}} );
newBuiltin('floor', [TNum], TNum, math.floor, {doc: {usage: 'floor(x)', description: 'Round down to nearest integer.'}} );
newBuiltin('trunc', [TNum], TNum, math.trunc, {doc: {usage: 'trunc(x)', description: 'If the argument is positive, round down to the nearest integer; if it is negative, round up to the nearest integer.', tags: ['truncate','integer part']}} );
newBuiltin('fract', [TNum], TNum, math.fract, {doc: {usage: 'fract(x)', description: 'Fractional part of a number. Equivalent to @x-trunc(x)@.'}} );
newBuiltin('degrees', [TNum], TNum, math.degrees, {doc: {usage: 'degrees(pi/2)', description: 'Convert radians to degrees.'}} );
newBuiltin('radians', [TNum], TNum, math.radians, {doc: {usage: 'radians(90)', description: 'Convert degrees to radians.'}} );
newBuiltin('round', [TNum], TNum, math.round, {doc: {usage: 'round(x)', description: 'Round to nearest integer.', tags: ['whole number']}} );
newBuiltin('sign', [TNum], TNum, math.sign, {doc: {usage: 'sign(x)', description: 'Sign of a number. Equivalent to $\\frac{x}{|x|}$, or $0$ when $x=0$.', tags: ['positive','negative']}} );

newBuiltin('random', [TRange], TNum, math.random, {doc: {usage: 'random(1..4)', description: 'A random number in the given range.', tags: ['choose','pick']}} );

newBuiltin('random',[TList],'?',null, {
	evaluate: function(args) 
	{
		return math.choose(args[0].value);
	},

	doc: {
		usage: 'random([1,1,2,3,5])',
		description: 'Choose a random item from a list.',
		tags: ['pick','select']
	}
});

newBuiltin( 'random',[],'?', null, {
	typecheck: function() { return true; },
	evaluate: function(args) { return math.choose(args);},
	doc: {
		usage: 'random(1,2,3,4,5)',
		description: 'Choose at random from the given arguments.',
		tags: ['pick','select']
	}
});

newBuiltin('mod', [TNum,TNum], TNum, function(a,b){b=math.abs(b);return ((a%b)+b)%b;}, {doc: {usage: 'mod(a,b)', description: 'Modulus, i.e. $a \\bmod{b}.$', tags: ['remainder','modulo']}} );
newBuiltin('max', [TNum,TNum], TNum, math.max, {doc: {usage: 'max(x,y)', description: 'Maximum of two numbers.', tags: ['supremum','biggest','largest','greatest']}} );
newBuiltin('min', [TNum,TNum], TNum, math.min, {doc: {usage: 'min(x,y)', description: 'Minimum of two numbers.', tags: ['smallest','least']}} );
newBuiltin('precround', [TNum,TNum], TNum, math.precround, {doc: {usage: 'precround(x,3)', description: 'Round to given number of decimal places.', tags: ['dp']}} );
newBuiltin('siground', [TNum,TNum], TNum, math.siground, {doc: {usage: 'siground(x,3)', description: 'Round to given number of significant figures.', tags: ['sig figs','sigfig']}} );
newBuiltin('dpformat', [TNum,TNum], TString, function(n,p) {return math.niceNumber(n,{precisionType: 'dp', precision:p});}, {doc: {usage: 'dpformat(x,3)', description: 'Round to given number of decimal points and pad with zeroes if necessary.', tags: ['dp','decimal points','format','display','precision']}} );
newBuiltin('sigformat', [TNum,TNum], TString, function(n,p) {return math.niceNumber(n,{precisionType: 'sigfig', precision:p});}, {doc: {usage: 'dpformat(x,3)', description: 'Round to given number of significant figures and pad with zeroes if necessary.', tags: ['sig figs','sigfig','format','display','precision']}} );
newBuiltin('perm', [TNum,TNum], TNum, math.permutations, {doc: {usage: 'perm(6,3)', description: 'Count permutations. $^n \\kern-2pt P_r$.', tags: ['combinatorics']}} );
newBuiltin('comb', [TNum,TNum], TNum, math.combinations , {doc: {usage: 'comb(6,3)', description: 'Count combinations. $^n \\kern-2pt C_r$.', tags: ['combinatorics']}});
newBuiltin('root', [TNum,TNum], TNum, math.root, {doc: {usage: ['root(8,3)','root(x,n)'], description: '$n$<sup>th</sup> root.', tags: ['cube']}} );
newBuiltin('award', [TNum,TBool], TNum, function(a,b){return (b?a:0);}, {doc: {usage: ['award(a,b)','award(5,x=y)'], description: 'If @b@ is @true@, returns @a@, otherwise returns @0@.', tags: ['mark']}} );
newBuiltin('gcd', [TNum,TNum], TNum, math.gcf, {doc: {usage: 'gcd(a,b)', description: 'Greatest common denominator of two integers.', tags: ['highest']}} );
newBuiltin('lcm', [TNum,TNum], TNum, math.lcm, {doc: {usage: 'lcm(a,b)', description: 'Lowest common multiple of two integers.', tags: ['least']}} );
newBuiltin('|', [TNum,TNum], TBool, math.divides, {doc: {usage: 'x|y', description: 'Returns @true@ if @x@ divides @y@.', tags: ['multiple of']}} );

newBuiltin('diff', ['?','?',TNum], '?', null, {doc: {usage: ['diff(f(x),x,n)', 'diff(x^2,x,1)','diff(y,x,1)'], description: '$n$<sup>th</sup> derivative. Currently for display only - can\'t be evaluated.', tags: ['differentiate','differential','differentiation']}});
newBuiltin('pdiff', ['?',TName,TNum], '?', null, {doc: {usage: ['pdiff(f(x,y),x,n)','pdiff(x+y,x,1)'], description: '$n$<sup>th</sup> partial derivative. Currently for display only - can\'t be evaluated.', tags: ['differentiate','differential','differentiation']}});
newBuiltin('int', ['?','?'], '?', null, {doc: {usage: 'int(f(x),x)', description: 'Integral. Currently for display only - can\'t be evaluated.'}});
newBuiltin('defint', ['?','?',TNum,TNum], '?', null, {doc: {usage: 'defint(f(x),y,0,1)', description: 'Definite integral. Currently for display only - can\'t be evaluated.'}});

newBuiltin('deal',[TNum],TList, 
	function(n) {
		return math.deal(n).map(function(i) {
			return new TNum(i);
		});
	},
	{doc: {
		usage: ['deal(n)','deal(5)'],
		description: 'A random shuffling of the integers $[0 \\dots n-1]$.',
		tags: ['permutation','order','shuffle']
	}}
);

newBuiltin('shuffle',[TList],TList,
	function(list) {
		return math.shuffle(list);
	},
	{doc: {
		usage: ['shuffle(list)','shuffle([1,2,3])'],
		description: 'Randomly reorder a list.',
		tags: ['permutation','order','shuffle','deal']	
	}}
);

//if needs to be a bit different because it can return any type
newBuiltin('if', [TBool,'?','?'], '?',null, {
	evaluate: function(args,scope)
	{
		var test = jme.evaluate(args[0],scope).value;

		if(test)
			return jme.evaluate(args[1],scope);
		else
			return jme.evaluate(args[2],scope);
	},

	doc: {
		usage: 'if(test,a,b)',
		description: 'If @test@ is true, return @a@, otherwise return @b@.',
		tags: ['test','decide']
	}
});

newBuiltin('switch',[],'?', null, {
	typecheck: function(variables)
	{
		//should take alternating booleans and [any value]
		//final odd-numbered argument is the 'otherwise' option
		if(variables.length <2)
			return false;

		var check=0;
		if(variables.length % 2 === 0)
			check = variables.length;
		else
			check = variables.length-1;

		for( var i=0; i<check; i+=2 )
		{
			switch(variables[i].tok.type)
			{
			case '?':
			case 'boolean':
				break;
			default:
				return false;
			}
		}
		return true;
	},
	evaluate: function(args,scope)
	{
		for(var i=0; i<args.length-1; i+=2 )
		{
			var result = jme.evaluate(args[i],scope).value;
			if(result)
				return jme.evaluate(args[i+1],scope);
		}
		if(args.length % 2 == 1)
			return jme.evaluate(args[args.length-1],scope);
		else
			throw(new LissaJS.Error('jme.func.switch.no default case'));
	},

	doc: {
		usage: 'switch(test1,a1,test2,a2,b)',
		description: 'Select cases. Alternating boolean expressions with values to return, with the final argument representing the default case.',
		tags: ['choose','test']
	}
});

newBuiltin('isa',['?',TString],TBool, null, {
	evaluate: function(args,scope)
	{
		var kind = jme.evaluate(args[1],scope).value;
		if(args[0].tok.type=='name' && scope.variables[args[0].tok.name.toLowerCase()]===undefined )
			return new TBool(kind=='name');

		var match = false;
		if(kind=='complex')
		{
			match = args[0].tok.type=='number' && args[0].tok.value.complex || false;
		}
		else
		{
			match = args[0].tok.type == kind;
		}
		return new TBool(match);
	},

	doc: {
		usage: 'x isa \'number\'',
		description: 'Determine the data-type of an expression.',
		tags: ['typeof','test','is a']
	}
});

// repeat(expr,n) evaluates expr n times and returns a list of the results
newBuiltin('repeat',['?',TNum],TList, null, {
	evaluate: function(args,scope)
	{
		var size = jme.evaluate(args[1],scope).value;
		var value = [];
		for(var i=0;i<size;i++)
		{
			value[i] = jme.evaluate(args[0],scope);
		}
		return new TList(value);
	},

	doc: {
		usage: ['repeat(expr,n)','repeat( random(1..3), 5)'],
		description: 'Evaluate the given expression $n$ times, returning the results in a list.'
	}
});

newBuiltin('listval',[TList,TNum],'?', null, {
	evaluate: function(args)
	{
		var index = args[1].value;
		var list = args[0];
		if(list.type!='list') {
			if(list.type=='name')
				throw(new LissaJS.Error('jme.variables.variable not defined',list.name));
			else
				throw(new LissaJS.Error('jme.func.listval.not a list'));
		}
		if(index<0)
			index += list.vars;
		if(index in list.value)
			return list.value[index];
		else
			throw(new LissaJS.Error('jme.func.listval.invalid index',index,list.value.length));
	},

	doc: {
		usage: ['list[i]','[0,1,2,3][2]'],
		description: 'Return a particular element of a list.',
		tags: ['index','item','access']
	}
});

newBuiltin('listval',[TList,TRange],TList, null, {
	evaluate: function(args)
	{
		var range = args[1].value;
		var list = args[0];
		var start = range[0];
		var end = range[1];
		var size = list.vars;
		if(start<0)
			start += size;
		if(end<0)
			end += size;
		var value = list.value.slice(start,end);
		return new TList(value);
	},

	doc: {
		usage: ['list[1..3]','[0,1,2,3,4][1..3]'],
		description: 'Slice a list - return the elements with indices in the given range.',
		tags: ['range','section','part']
	}
});

newBuiltin('listval',[TVector,TNum],TNum, null, {
	evaluate: function(args)
	{
		var index = args[1].value;
		var vector = args[0];
		return new TNum(vector.value[index] || 0);
	},

	doc: {
		usage: ['vec[1]','vector(0,1,2)[1]'],
		description: 'Return a particular component of a vector.',
		tags: ['index','item','access']
	}
});

newBuiltin('listval',[TMatrix,TNum],TVector, null, {
	evaluate: function(args)
	{
		var index = args[1].value;
		var matrix = args[0];
		return new TVector(matrix.value[index] || []);
	},

	doc: {
		usage: ['mat[1]','matrix([1,0],[0,1])[1]'],
		description: 'Return a particular row of a matrix.',
		tags: ['index','item','access','element','cell']
	}
});

newBuiltin('map',['?',TName,'?'],TList, null, {
	evaluate: function(args,scope)
	{
		var i;
		var list = jme.evaluate(args[2],scope);
		switch(list.type) {
		case 'list':
			list = list.value;
			break;
		case 'range':
			list = list.value.slice(3);
			for(i=0;i<list.length;i++) {
				list[i] = new TNum(list[i]);
			}
			break;
		default:
			throw(new LissaJS.Error('jme.typecheck.map not on enumerable',list.type));
		}
		var value = [];
		var name = args[1].tok.name;
		scope = new Scope(scope);
		for(i=0;i<list.length;i++)
		{
			scope.variables[name] = list[i];
			value[i] = jme.evaluate(args[0],scope);
		}
		return new TList(value);
	},
	
	doc: {
		usage: ['map(expr,x,list)','map(x^2,x,[0,2,4,6])'],
		description: 'Apply the given expression to every value in a list.'
	}
});

newBuiltin('map',['?',TName,TRange],TList, null, {
	evaluate: function(args,scope)
	{
		var range = jme.evaluate(args[2],scope);
		var name = args[1].tok.name;
		var newlist = new TList(range.size);
		newlist.value = [];
		scope = new Scope(scope);
		for(var i=3;i<range.value.length;i++)
		{
			scope.variables[name] = new TNum(range.value[i]);
			newlist.value[i-3] = jme.evaluate(args[0],scope);
		}
		return newlist;
	},

	doc: {
		usage: ['map(expr,x,range)','map(x^2,x,0..5)'],
		description: 'Apply the given expression to every value in a range.'
	}
});

newBuiltin('sort',[TList],TList, null, {
	evaluate: function(args)
	{
		var list = args[0];
		var newlist = new TList(list.vars);
		newlist.value = list.value.slice().sort(function(a,b){ 
			if(math.gt(a.value,b.value))
				return 1;
			else if(math.lt(a.value,b.value))
				return -1;
			else
				return 0;
		});
		return newlist;
	},

	doc: {
		usage: 'sort(list)',
		description: 'Sort a list.'
	}
});

newBuiltin('vector',['*TNum'],TVector, null, {
	evaluate: function(args)
	{
		var value = [];
		for(var i=0;i<args.length;i++)
		{
			value.push(args[i].value);
		}
		return new TVector(value);
	},

	doc: {
		usage: ['vector(1,2,3)','vector(a,b)'],
		description: 'Create a vector with the given components.',
		tags: ['constructor','new']
	}
});

newBuiltin('vector',[TList],TVector, null, {
	evaluate: function(args)
	{
		var list = args[0];
		var value = list.value.map(function(x){return x.value;});
		return new TVector(value);
	},

	doc: {
		usage: ['vector([1,2,3])','vector(list)'],
		description: 'Create a vector from a list of numbers.',
		tags: ['constructor','new','convert','cast']
	}
});

newBuiltin('matrix',[TList],TMatrix,null, {
	evaluate: function(args)
	{
		var list = args[0];
		var rows = list.vars;
		var columns = 0;
		var value = [];
		switch(list.value[0].type)
		{
		case 'number':
			value = [list.value.map(function(e){return e.value;})];
			rows = 1;
			columns = list.vars;
			break;
		case 'list':
			function getValue(x){ return x.value; }
			for(var i=0;i<rows;i++)
			{
				var row = list.value[i].value;
				value.push(row.map(getValue));
				columns = Math.max(columns,row.length);
			}
			break;
		default:
			throw(new LissaJS.Error('jme.func.matrix.invalid row type',list.value[0].type));
		}
		value.rows = rows;
		value.columns = columns;
		return new TMatrix(value);
	},

	doc: {
		usage: ['matrix([ [1,2], [3,4] ])', 'matrix([ row1, row2 ])'],
		tags: ['convert','cast','constructor','new'],
		description: 'Create a matrix from a list of rows. This constructor is useful if the number of rows is not a constant.'
	}
});

newBuiltin('matrix',['*list'],TMatrix, null, {
	evaluate: function(args)
	{
		var rows = args.length;
		var columns = 0;
		var value = [];
		function getValue(x){ return x.value; }
		for(var i=0;i<args.length;i++)
		{
			var row = args[i].value;
			value.push(row.map(getValue));
			columns = Math.max(columns,row.length);
		}
		value.rows = rows;
		value.columns = columns;
		return new TMatrix(value);
	},

	doc: {
		usage: ['matrix([1,0],[0,1])','matrix(row1,row2,row3)'],
		description: 'Create a matrix. The arguments are lists of numbers, representing the rows.',
		tags: ['constructor', 'new']
	}
});

newBuiltin('rowvector',['*number'],TMatrix, null, {
	evaluate: function(args)
	{
		var row = [];
		for(var i=0;i<args.length;i++)
		{
			row.push(args[i].value);
		}
		var matrix = [row];
		matrix.rows = 1;
		matrix.columns = row.length;
		return new TMatrix(matrix);
	},

	doc: {
		usage: 'rowvector(1,2,3)',
		description: 'Create a row vector, i.e. an $n \\times 1$ matrix, with the given components.',
		tags: ['constructor','new']
	}
});

newBuiltin('rowvector',[TList],TMatrix, null, {
	evaluate: function(args)
	{
		var list = args[0];
		var row = list.value.map(function(x){return x.value;});
		var matrix = [row];
		matrix.rows = 1;
		matrix.columns = row.length;
		return new TMatrix(matrix);
	},

	doc: {
		usage: 'rowvector(1,2,3)',
		description: 'Create a row vector, i.e. an $n \\times 1$ matrix, with the given components.',
		tags: ['constructor','new']
	}
});

//cast vector to list
newBuiltin('list',[TVector],TList,null, {
	evaluate: function(args)
	{
		var vector = args[0];
		var value = vector.value.map(function(n){ return new TNum(n);});
		return new TList(value);
	},

	doc: {
		usage: ['list(vector(0,1,2))','list(vector)'],
		description: 'Cast a vector to a list.',
		tags: ['convert']
	}
});

//cast matrix to list of lists
newBuiltin('list',[TMatrix],TList,null, {
	evaluate: function(args)
	{
		var matrix = args[0];
		var value = [];
		function makeTNum(n){ return new TNum(n); }
		for(var i=0;i<matrix.value.rows;i++)
		{
			var row = new TList(matrix.value[i].map(makeTNum));
			value.push(row);
		}
		return new TList(value);
	},

	doc: {
		usage: ['list(matrix([0,1],[2,3]))'],
		tags: ['convert','cast'],
		description: 'Cast a matrix to a list of its rows.'
	}
});

newBuiltin('table',[TList,TList],THTML,
	function(data,headers) {
		var i;
		var cell;
		var table = document.createElement('table');

		var thead = document.createElement('thead');
		table.appendChild(thead);
		for(i=0;i<headers.length;i++) {
			cell = headers[i];
			if(typeof cell=='number')
				cell = LissaJS.math.niceNumber(cell);
			var th = document.createElement('th');
			th.innerHTML = cell;
			thead.appendChild(th);
		}

		var tbody = document.createElement('tbody');
		table.appendChild(tbody);
		for(i=0;i<data.length;i++) {
			var row = document.createElement('tr');
			tbody.appendChild(row);
			for(var j=0;j<data[i].length;j++) {
				cell = data[i][j];
				if(typeof cell=='number')
					cell = LissaJS.math.niceNumber(cell);
				var td = document.createElement('td');
				td.innerHTML = cell;
				row.appendChild(td);
			}
		}

		return table;
	},
	{
		unwrapValues: true,

		doc: {
			usage: ['table([ [1,2,3], [4,5,6] ], [\'Header 1\', \'Header 2\'])', 'table(data,headers)'],
			tags: ['table','tabular','data','html'],
			description: 'Create a table to display a list of rows of data, with the given headers.'
		}
	}
);


///end of builtins



function randoms(varnames,min,max,times)
{
	times *= varnames.length;
	var rs = [];
	for( var i=0; i<times; i++ )
	{
		var r = {};
		for( var j=0; j<varnames.length; j++ )
		{
			r[varnames[j]] = new TNum(LissaJS.math.randomrange(min,max));
		}
		rs.push(r);
	}
	return rs;
}


function varnamesAgree(array1, array2) {
	var name;
	for(var i=0; i<array1.length; i++) {
		if( (name=array1[i])[0]!='$' && !array2.contains(name) )
			return false;
	}
	
	return true;
}

var checkingFunctions = 
{
	absdiff: function(r1,r2,tolerance) 
	{
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		// finds absolute difference between values, fails if bigger than tolerance
		return math.leq(math.abs(math.sub(r1,r2)), Math.abs(tolerance));
	},

	reldiff: function(r1,r2,tolerance) {
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		// fails if (r1/r2 - 1) is bigger than tolerance
		if(r2!==0) {
			return math.leq(Math.abs(math.sub(r1,r2)), Math.abs(math.mul(tolerance,r2)));
		} else {	//or if correct answer is 0, checks abs difference
			return math.leq(Math.abs(math.sub(r1,r2)), tolerance);
		}
	},

	dp: function(r1,r2,tolerance) {
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		//rounds both values to 'tolerance' decimal places, and fails if unequal 
		tolerance = Math.floor(Math.abs(tolerance));
		return math.eq( math.precround(r1,tolerance), math.precround(r2,tolerance) );
	},

	sigfig: function(r1,r2,tolerance) {
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		//rounds both values to 'tolerance' sig figs, and fails if unequal
		tolerance = Math.floor(Math.abs(tolerance));
		return math.eq(math.siground(r1,tolerance), math.siground(r2,tolerance));
	}
};

var findvars = jme.findvars = function(tree,boundvars,scope)
{
	var i;

	if(!scope)
		scope = jme.builtinScope;
	if(boundvars===undefined)
		boundvars = [];

	if(tree.tok.type=='function' && tree.tok.name=='map')
	{
		boundvars = boundvars.slice();
		boundvars.push(tree.args[1].tok.name.toLowerCase());
	}

	if(tree.args===undefined)
	{
		switch(tree.tok.type)
		{
		case 'name':
			var name = tree.tok.name.toLowerCase();
			if(boundvars.indexOf(name)==-1)
				return [name];
			else
				return [];
			break;
		case 'string':
			var bits = jme.texsplit(tree.tok.value);
			var out = [];
			for(i=0;i<bits.length-3;i+=4)
			{
				var cmd = bits[i+1];
				var expr = bits[i+3];
				var tree2;
				switch(cmd)
				{
				case 'var':
					tree2 = jme.compile(expr,scope,true);
					out = mergeArrays(out,findvars(tree2,boundvars));
					break;
				case 'simplify':
					var sbits = util.splitbrackets(expr,'{','}');
					for(var j=1;j<sbits.length-1;j+=2)
					{
						tree2 = jme.compile(sbits[j],scope,true);
						out = mergeArrays(out,findvars(tree2,boundvars));
					}
					break;
				}
			}
			return out;
		default:
			return [];
		}
	}
	else
	{
		var vars = [];
		for(i=0;i<tree.args.length;i++)
			vars = mergeArrays(vars,findvars(tree.args[i],boundvars));
		return vars;
	}
};


function resultsEqual(r1,r2,checkingFunction,checkingAccuracy)
{	// first checks both expressions are of same type, then uses given checking type to compare results

	var i,j;
	var v1 = r1.value, v2 = r2.value;

	if(r1.type != r2.type)
	{
		return false;
	}
	switch(r1.type)
	{
	case 'number':
		if(v1.complex || v2.complex)
		{
			if(!v1.complex)
				v1 = {re:v1, im:0, complex:true};
			if(!v2.complex)
				v2 = {re:v2, im:0, complex:true};
			return checkingFunction(v1.re, v2.re, checkingAccuracy) && checkingFunction(v1.im,v2.im,checkingAccuracy);
		}
		else
		{
			return checkingFunction( v1, v2, checkingAccuracy );
		}
		break;
	case 'vector':
		if(v1.length != v2.length)
			return false;
		for(i=0;i<v1.length;i++)
		{
			if(!resultsEqual(new TNum(v1[i]),new TNum(v2[i]),checkingFunction,checkingAccuracy))
				return false;
		}
		return true;
	case 'matrix':
		if(v1.rows != v2.rows || v1.columns != v2.columns)
			return false;
		for(i=0;i<v1.rows;i++)
		{
			for(j=0;j<v1.columns;j++)
			{
				if(!resultsEqual(new TNum(v1[i][j]||0),new TNum(v2[i][j]||0),checkingFunction,checkingAccuracy))
					return false;
			}
		}
		return true;
	case 'list':
		if(v1.length != v2.length)
			return false;
		for(i=0;i<v1.length;i++)
		{
			if(!resultsEqual(v1[i],v2[i],checkingFunction,checkingAccuracy))
				return false;
		}
		return true;
	default:
		return v1 == v2;
	}
}

jme.display = {

	//convert a JME expression to LaTeX
	//ruleset can be anything accepted by jme.display.collectRuleset
	//settings are also passed through to the texify function
	exprToLaTeX: function(expr,ruleset,scope)
	{
		if(scope===undefined)
			scope = LissaJS.jme.builtinScope;

		if(!ruleset)
			ruleset = simplificationRules.basic;
		ruleset = jme.collectRuleset(ruleset,scope.rulesets);

		expr+='';	//make sure expr is a string

		if(!expr.trim().length)	//if expr is the empty string, don't bother going through the whole compilation proces
			return '';
		var tree = jme.display.simplify(expr,ruleset,scope); //compile the expression to a tree and simplify it
		var tex = texify(tree,ruleset.flags); //render the tree as TeX
		return tex;
	},

	//simplify a JME expression string according to given ruleset and return it as a JME string
	simplifyExpression: function(expr,ruleset,scope)
	{
		if(expr.trim()==='')
			return '';
		return treeToJME(jme.display.simplify(expr,ruleset,scope),ruleset.flags);
	},

	//simplify a JME expression string according to given ruleset and return it as a syntax tree
	simplify: function(expr,ruleset,scope)
	{
		if(expr.trim()==='')
			return;

		if(!ruleset)
			ruleset = simplificationRules.basic;
		ruleset = jme.collectRuleset(ruleset,scope.rulesets);		//collect the ruleset - replace set names with the appropriate Rule objects

		try 
		{
			var exprTree = jme.compile(expr,{},true);	//compile the expression to a tree. notypecheck is true, so undefined function names can be used.
			return jme.display.simplifyTree(exprTree,ruleset,scope);	// simplify the tree
		}
		catch(e) 
		{
			//e.message += '\nSimplifying expression failed. Expression was: '+expr;
			throw(e);
		}
	},

	//simplify a syntax tree according to given ruleset
	simplifyTree: function(exprTree,ruleset,scope)
	{
		var i;

		if(!scope)
			throw(new LissaJS.Error('jme.display.simplifyTree.no scope given'));
		scope = LissaJS.util.copyobj(scope);
		scope.variables = {};	//remove variables from the scope so they don't accidentally get substituted in
		var applied = true;

		var rules = ruleset.rules;

		// apply rules until nothing can be done
		while( applied )
		{
			//the eval() function is a meta-function which, when used in the result of a rule, allows you to replace an expression with a single data value
			if(exprTree.tok.type=='function' && exprTree.tok.name=='eval')	
			{
				exprTree = {tok: LissaJS.jme.evaluate(exprTree.args[0],scope)};
			}
			else
			{
				if(exprTree.args)	//if this token is an operation with arguments, try to simplify the arguments first
				{
					for(i=0;i<exprTree.args.length;i++)
					{
						exprTree.args[i] = jme.display.simplifyTree(exprTree.args[i],ruleset,scope);
					}
				}
				applied = false;
				for(i=0; i<rules.length;i++)	//check each rule
				{
					var match;
					if(match = rules[i].match(exprTree,scope))	//if rule can be applied, apply it!
					{
						exprTree = jme.substituteTree(LissaJS.util.copyobj(rules[i].result,true),new jme.Scope([{variables:match}]));
						applied = true;
						break;
					}
				}
			}
		}
		return exprTree;
	}
};


/// all private methods below here



// texify turns a syntax tree into a TeX string
//
// data types can be converted to TeX straightforwardly, but operations and functions need a bit more care
// the idea here is that each function and op has a function associated with it which takes a syntax tree with that op at the top and returns the appropriate TeX


//apply brackets to an op argument if appropraite
function texifyOpArg(thing,texArgs,i)
{
	var precedence = jme.precedence;
	var tex = texArgs[i];
	if(thing.args[i].tok.type=='op')	//if this is an op applied to an op, might need to bracket
	{
		var op1 = thing.args[i].tok.name;	//child op
		var op2 = thing.tok.name;			//parent op
		var p1 = precedence[op1];	//precedence of child op
		var p2 = precedence[op2];	//precedence of parent op

		//if leaving out brackets would cause child op to be evaluated after parent op, or precedences the same and parent op not commutative, or child op is negation and parent is exponentiation
		if( p1 > p2 || (p1==p2 && i>0 && !jme.commutative[op2]) || (op1=='-u' && precedence[op2]<=precedence['*']) )	
			tex = '\\left ( '+tex+' \\right )';
	}
	//complex numbers might need brackets round them when multiplied with something else or unary minusing
	else if(thing.args[i].tok.type=='number' && thing.args[i].tok.value.complex && thing.tok.type=='op' && (thing.tok.name=='*' || thing.tok.name=='-u') )	
	{
		var v = thing.args[i].tok.value;
		if(!(v.re===0 || v.im===0))
			tex = '\\left ( '+tex+' \\right )';
	}
	return tex;
}

// helper function for texing infix operators
// returns a function which will convert a syntax tree with the operator at the top to TeX
// 'code' is the TeX code for the operator
function infixTex(code)
{
	return function(thing,texArgs)
	{
		var arity = jme.builtinScope.functions[thing.tok.name][0].intype.length;
		if( arity == 1 )	//if operation is unary, prepend argument with code
		{
			return code+texArgs[0];
		}
		else if ( arity == 2 )	//if operation is binary, put code in between arguments
		{
			return texArgs[0]+' '+code+' '+texArgs[1];
		}
	};
}

//helper for texing nullary functions
//returns a function which returns the appropriate (constant) code
function nullaryTex(code)
{
	return function(){ return '\\textrm{'+code+'}'; };
}

//helper function for texing functions
function funcTex(code)
{
	return function(thing,texArgs)
	{
		return code+' \\left ( '+texArgs.join(', ')+' \\right )';
	};
}

// define how to texify each operation and function
var texOps = jme.display.texOps = {
	//range definition. Should never really be seen
	'#': (function(thing,texArgs) { return texArgs[0]+' \\, \\# \\, '+texArgs[1]; }),	

	//logical negation
	'!': infixTex('\\neg '),	

	//unary addition
	'+u': infixTex('+'),	

	//unary minus
	'-u': (function(thing,texArgs,settings) {
		var tex = texArgs[0];
		if( thing.args[0].tok.type=='op' )
		{
			var op = thing.args[0].tok.name;
			if(!(op=='/' || op=='*') && jme.precedence[op]>jme.precedence['-u'])	//brackets are needed if argument is an operation which would be evaluated after negation
			{
				tex='\\left ( '+tex+' \\right )';
			}
		}
		else if(thing.args[0].tok.type=='number' && thing.args[0].tok.value.complex) {
			var value = thing.args[0].tok.value;
			return settings.texNumber({complex:true,re:-value.re,im:-value.im});
		}
		return '-'+tex;
	}),

	//exponentiation
	'^': (function(thing,texArgs) {
		var tex0 = texArgs[0];
		//if left operand is an operation, it needs brackets round it. Exponentiation is right-associative, so 2^3^4 won't get any brackets, but (2^3)^4 will.
		if(thing.args[0].tok.type=='op')
			tex0 = '\\left ( ' +tex0+' \\right )';	
		return (tex0+'^{ '+texArgs[1]+' }');
	}),


	'*': (function(thing,texArgs) {
		var s = texifyOpArg(thing,texArgs,0);
		for(var i=1; i<thing.args.length; i++ )
		{
			//specials or subscripts
			if(thing.args[i-1].tok.type=='special' || thing.args[i].tok.type=='special')	
			{
				s+=' ';
			}
			//anything times e^(something) or (not number)^(something)
			else if (thing.args[i].tok.type=='op' && thing.args[i].tok.name=='^' && (thing.args[i].args[0].value==Math.E || thing.args[i].args[0].tok.type!='number'))	
			{
				s+=' ';
			}
			//real number times Pi or E
			else if (thing.args[i].tok.type=='number' && (thing.args[i].tok.value==Math.PI || thing.args[i].tok.value==Math.E || thing.args[i].tok.value.complex) && thing.args[i-1].tok.type=='number' && !(thing.args[i-1].tok.value.complex))	
			{
				s+=' ';
			}
			//number times a power of i
			else if (thing.args[i].tok.type=='op' && thing.args[i].tok.name=='^' && thing.args[i].args[0].tok.type=='number' && math.eq(thing.args[i].args[0].tok.value,math.complex(0,1)) && thing.args[i-1].tok.type=='number')	
			{
				s+=' ';
			}
			else if ( !(thing.args[i-1].tok.type=='number' && math.eq(thing.args[i-1].tok.value,math.complex(0,1))) && thing.args[i].tok.type=='number' && math.eq(thing.args[i].tok.value,math.complex(0,1)))	//(anything except i) times i
			{
				s+=' ';
			}
			else if ( thing.args[i].tok.type=='number'
					||
						thing.args[i].tok.type=='op' && thing.args[i].tok.name=='-u'
					||
					(
						!(thing.args[i-1].tok.type=='op' && thing.args[i-1].tok.name=='-u') 
						&& (thing.args[i].tok.type=='op' && jme.precedence[thing.args[i].tok.name]<=jme.precedence['*'] 
							&& (thing.args[i].args[0].tok.type=='number' 
							&& thing.args[i].args[0].tok.value!=Math.E)
						)
					)
			)
			{
				s += ' \\times ';
			}
			else
				s+= ' ';
			s += texifyOpArg(thing,texArgs,i);
		}
		return s;
	}),
	'/': (function(thing,texArgs) { return ('\\frac{ '+texArgs[0]+' }{ '+texArgs[1]+' }'); }),
	'+': infixTex('+'),
	'-': (function(thing,texArgs,settings) {
		var b = thing.args[1];
		if(b.tok.type=='number' && b.tok.value.complex && b.tok.value.re!==0) {
			var texb = settings.texNumber(math.complex(b.tok.value.re,-b.tok.value.im));
			return texArgs[0]+' - '+texb;
		}
		else{
			if(b.tok.type=='op' && b.tok.name=='+')
				return texArgs[0]+' - \\left( '+texArgs[1]+' \\right)';
			else
				return texArgs[0]+' - '+texArgs[1];
		}
	}),
	'dot': infixTex('\\cdot'),
	'cross': infixTex('\\times'),
	'transpose': (function(thing,texArgs) {
		var tex = texArgs[0];
		if(thing.args[0].tok.type=='op')
			tex = '\\left ( ' +tex+' \\right )';
		return (tex+'^{\\mathrm{T}}');
	}),
	'..': infixTex('\\dots'),
	'except': infixTex('\\operatorname{except}'),
	'<': infixTex('\\lt'),
	'>': infixTex('\\gt'),
	'<=': infixTex('\\leq'),
	'>=': infixTex('\\geq'),
	'<>': infixTex('\neq'),
	'=': infixTex('='),
	'and': infixTex('\\wedge'),
	'or': infixTex('\\vee'),
	'xor': infixTex('\\, \\textrm{XOR} \\,'),
	'|': infixTex('|'),
	'abs': (function(thing,texArgs,settings) { 
		var arg;
		if(thing.args[0].tok.type=='vector')
			arg = texVector(thing.args[0].tok.value,settings);
		else if(thing.args[0].tok.type=='function' && thing.args[0].tok.name=='vector')
			arg = texVector(thing.args[0],settings);
		else if(thing.args[0].tok.type=='matrix')
			arg = texMatrix(thing.args[0].tok.value,settings);
		else if(thing.args[0].tok.type=='function' && thing.args[0].tok.name=='matrix')
			arg = texMatrix(thing.args[0],settings);
		else
			arg = texArgs[0];
		return ('\\left | '+arg+' \\right |');
	}),
	'sqrt': (function(thing,texArgs) { return ('\\sqrt{ '+texArgs[0]+' }'); }),
	'exp': (function(thing,texArgs) { return ('e^{ '+texArgs[0]+' }'); }),
	'fact': (function(thing,texArgs)
			{
				if(thing.args[0].tok.type=='number' || thing.args[0].tok.type=='name')
				{
					return texArgs[0]+'!';
				}
				else
				{
					return '\\left ('+texArgs[0]+' \\right)!';
				}
			}),
	'ceil': (function(thing,texArgs) { return '\\left \\lceil '+texArgs[0]+' \\right \\rceil';}),
	'floor': (function(thing,texArgs) { return '\\left \\lfloor '+texArgs[0]+' \\right \\rfloor';}),
	'int': (function(thing,texArgs) { return ('\\int \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
	'defint': (function(thing,texArgs) { return ('\\int_{'+texArgs[2]+'}^{'+texArgs[3]+'} \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
	'diff': (function(thing,texArgs) 
			{
				var degree = (thing.args[2].tok.type=='number' && thing.args[2].tok.value==1) ? '' : '^{'+texArgs[2]+'}';
				if(thing.args[0].tok.type=='name')
				{
					return ('\\frac{\\mathrm{d}'+degree+texArgs[0]+'}{\\mathrm{d}'+texArgs[1]+degree+'}');
				}
				else
				{
					return ('\\frac{\\mathrm{d}'+degree+'}{\\mathrm{d}'+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
				}
			}),
	'partialdiff': (function(thing,texArgs) 
			{ 
				var degree = (thing.args[2].tok.type=='number' && thing.args[2].tok.value==1) ? '' : '^{'+texArgs[2]+'}';
				if(thing.args[0].tok.type=='name')
				{
					return ('\\frac{\\partial '+degree+texArgs[0]+'}{\\partial '+texArgs[1]+degree+'}');
				}
				else
				{
					return ('\\frac{\\partial '+degree+'}{\\partial '+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
				}
			}),
	'limit': (function(thing,texArgs) { return ('\\lim_{'+texArgs[1]+' \\to '+texArgs[2]+'}{'+texArgs[0]+'}'); }),
	'mod': (function(thing,texArgs) {return texArgs[0]+' \\pmod{'+texArgs[1]+'}';}),
	'perm': (function(thing,texArgs) { return '^{'+texArgs[0]+'}\\kern-2pt P_{'+texArgs[1]+'}';}),
	'comb': (function(thing,texArgs) { return '^{'+texArgs[0]+'}\\kern-1pt C_{'+texArgs[1]+'}';}),
	'root': (function(thing,texArgs) { return '\\sqrt['+texArgs[0]+']{'+texArgs[1]+'}'; }),
	'if': (function(thing,texArgs) 
			{
				for(var i=0;i<3;i++)
				{
					if(thing.args[i].args!==undefined)
						texArgs[i] = '\\left ( '+texArgs[i]+' \\right )';
				}
				return '\\textbf{If} \\; '+texArgs[0]+' \\; \\textbf{then} \\; '+texArgs[1]+' \\; \\textbf{else} \\; '+texArgs[2]; 
			}),
	'switch': funcTex('\\operatorname{switch}'),
	'gcd': funcTex('\\operatorname{gcd}'),
	'lcm': funcTex('\\operatorname{lcm}'),
	'trunc': funcTex('\\operatorname{trunc}'),
	'fract': funcTex('\\operatorname{fract}'),
	'degrees': funcTex('\\operatorname{degrees}'),
	'radians': funcTex('\\operatorname{radians}'),
	'round': funcTex('\\operatorname{round}'),
	'sign': funcTex('\\operatorname{sign}'),
	'random': funcTex('\\operatorname{random}'),
	'max': funcTex('\\operatorname{max}'),
	'min': funcTex('\\operatorname{min}'),
	'precround': funcTex('\\operatorname{precround}'),
	'siground': funcTex('\\operatorname{siground}'),
	'award': funcTex('\\operatorname{award}'),
	'hour24': nullaryTex('hour24'),
	'hour': nullaryTex('hour'),
	'ampm': nullaryTex('ampm'),
	'minute': nullaryTex('minute'),
	'second': nullaryTex('second'),
	'msecond': nullaryTex('msecond'),
	'dayofweek': nullaryTex('dayofweek'),
	'sin': funcTex('\\sin'),
	'cos': funcTex('\\cos'),
	'tan': funcTex('\\tan'),
	'sec': funcTex('\\sec'),
	'cot': funcTex('\\cot'),
	'cosec': funcTex('\\csc'),
	'arccos': funcTex('\\arccos'),
	'arcsin': funcTex('\\arcsin'),
	'arctan': funcTex('\\arctan'),
	'cosh': funcTex('\\cosh'),
	'sinh': funcTex('\\sinh'),
	'tanh': funcTex('\\tanh'),
	'coth': funcTex('\\coth'),
	'cosech': funcTex('\\operatorname{cosech}'),
	'sech': funcTex('\\operatorname{sech}'),
	'arcsinh': funcTex('\\operatorname{arcsinh}'),
	'arccosh': funcTex('\\operatorname{arccosh}'),
	'arctanh': funcTex('\\operatorname{arctanh}'),
	'ln': function(thing,texArgs) {
		if(thing.args[0].tok.type=='function' && thing.args[0].tok.name=='abs')
			return '\\ln '+texArgs[0];
		else
			return '\\ln \\left( '+texArgs[0]+' \\right)';
	},
	'log': funcTex('\\log_{10}'),
	'vector': (function(thing,texArgs,settings) {
		return '\\left( '+texVector(thing,settings)+' \\right)';
	}),
	'rowvector': (function(thing,texArgs,settings) {
		if(thing.args[0].tok.type!='list')
			return texMatrix({args:[{args:thing.args}]},settings,true);
		else
			return texMatrix(thing,settings,true);
	}),
	'matrix': (function(thing,texArgs,settings) {
		return texMatrix(thing,settings,true);
	}),
	'listval': (function(thing,texArgs) {
		return texArgs[0]+' \\left['+texArgs[1]+'\\right]';
	}),
	'verbatim': (function(thing) {
		return thing.args[0].tok.value;
	})
};

function texRationalNumber(n)
{
	if(n.complex)
	{
		var re = texRationalNumber(n.re);
		var im = texRationalNumber(n.im)+' i';
		if(n.im===0)
			return re;
		else if(n.re===0)
		{
			if(n.im==1)
				return 'i';
			else if(n.im==-1)
				return '-i';
			else
				return im;
		}
		else if(n.im<0)
		{
			if(n.im==-1)
				return re+' - i';
			else
				return re+' '+im;
		}
		else
		{
			if(n.im==1)
				return re+' + '+'i';
			else
				return re+' + '+im;
		}

	}
	else
	{
		var piD;
		if((piD = math.piDegree(n)) > 0)
			n /= Math.pow(Math.PI,piD);

		var m;
		var out = math.niceNumber(n);
		if(m = out.match(math.re_scientificNumber)) {
			var mantissa = m[1];
			var exponent = m[2];
			if(exponent[0]=='+')
				exponent = exponent.slice(1);
			return mantissa+' \\times 10^{'+exponent+'}';
		}

		var f = math.rationalApproximation(Math.abs(n));
		if(f[1]==1)
			out = Math.abs(f[0]).toString();
		else
			out = '\\frac{'+f[0]+'}{'+f[1]+'}';
		if(n<0)
			out=' - '+out;

		switch(piD)
		{
		case 0:
			return out;
		case 1:
			return out+' \\pi';
		default:
			return out+' \\pi^{'+piD+'}';
		}
	}
}

function texRealNumber(n)
{
	if(n.complex)
	{
		var re = texRealNumber(n.re);
		var im = texRealNumber(n.im)+' i';
		if(n.im===0)
			return re;
		else if(n.re===0)
		{
			if(n.im==1)
				return 'i';
			else if(n.im==-1)
				return '-i';
			else
				return im;
		}
		else if(n.im<0)
		{
			if(n.im==-1)
				return re+' - i';
			else
				return re+' '+im;
		}
		else
		{
			if(n.im==1)
				return re+' + '+'i';
			else
				return re+' + '+im;
		}

	}
	else
	{
		if(n==Infinity)
			return '\\infty';
		else if(n==-Infinity)
			return '-\\infty';

		var piD;
		if((piD = math.piDegree(n)) > 0)
			n /= Math.pow(Math.PI,piD);

		var out = math.niceNumber(n);

		var m;
		if(m = out.match(math.re_scientificNumber)) {
			var mantissa = m[1];
			var exponent = m[2];
			if(exponent[0]=='+')
				exponent = exponent.slice(1);
			return mantissa+' \\times 10^{'+exponent+'}';
		}

		switch(piD)
		{
		case 0:
			return out;
		case 1:
			if(n==1)
				return '\\pi';
			else
				return out+' \\pi';
			break;
		default:
			if(n==1)
				return '\\pi^{'+piD+'}';
			else
				return out+' \\pi^{'+piD+'}';
		}
	}
}

function texVector(v,settings)
{
	var out;
	var elements;
	if(v.args)
	{
		elements = v.args.map(function(x){return texify(x,settings);});
	}
	else
	{
		var texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;
		elements = v.map(function(x){return texNumber(x);});
	}
	if(settings.rowvector)
		out = elements.join(' , ');
	else
		out = '\\begin{matrix} '+elements.join(' \\\\ ')+' \\end{matrix}';
	return out;
}

function texMatrix(m,settings,parens)
{
	var out;
	var rows;

	if(m.args)
	{
		rows = m.args.map(function(x) {
			return x.args.map(function(y){ return texify(y,settings); });
		});
	}
	else
	{
		var texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;
		rows = m.map(function(x){
			return x.map(function(y){ return texNumber(y); });
		});
	}

	if(rows.length==1) {
		out = rows[0].join(', & ');
	}
	else {
		rows = rows.map(function(x) {
			return x.join(' & ');
		});
		out = rows.join(' \\\\ ');
	}

	if(parens)
		return '\\begin{pmatrix} '+out+' \\end{pmatrix}';
	else
		return '\\begin{matrix} '+out+' \\end{matrix}';
}

function texName(name,annotation)
{
	name = greek.contains(name) ? '\\'+name : name;
	name = name.replace(/(.*)_(.*)('*)$/g,'$1_{$2}$3');	//make numbers at the end of a variable name subscripts
	name = name.replace(/^(.*?[^_])(\d+)('*)$/,'$1_{$2}$3');	//make numbers at the end of a variable name subscripts
	if(!annotation)
		return name;

	for(var i=0;i<annotation.length;i++)
	{
		switch(annotation[i])
		{
		case 'verb':	//verbatim - use to get round things like i and e being interpreted as constants
		case 'verbatim':
			break;
		case 'op':	//operator name - use non-italic font
			name = '\\operatorname{'+name+'}';
			break;
		case 'v':	//vector
		case 'vector':
			name = '\\boldsymbol{'+name+'}';
			break;
		case 'unit':	//unit vector
			name = '\\hat{'+name+'}';
			break;
		case 'dot':		//dot on top
			name = '\\dot{'+name+'}';
			break;
		case 'm':	//matrix
		case 'matrix':
			name = '\\mathrm{'+name+'}';
			break;
		default:
			if(annotation[i].length)
				name = '\\'+annotation[i]+'{'+name+'}';
			break;
		}
	}
	return name;
}

var greek = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega'];

var texify = LissaJS.jme.display.texify = function(thing,settings)
{
	var i;

	if(!thing)
		return '';

	if(!settings)
		settings = {};

	var texArgs = [];
	if(thing.args)
	{
		for(i=0; i<thing.args.length; i++ )
		{
			texArgs[i] = texify(thing.args[i],settings);
		}
	}

	var texNumber = settings.texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;

	var tok = thing.tok || thing;
	switch(tok.type)
	{
	case 'number':
		if(tok.value==Math.E)
			return 'e';
		else if(tok.value==Math.PI)
			return '\\pi';
		else
			return texNumber(tok.value);
	case 'string':
		if(tok.latex)
			return tok.value;
		else
			return '\\textrm{'+tok.value+'}';
		break;
	case 'boolean':
		return tok.value ? 'true' : 'false';
	case 'range':
		return tok.value[0]+ ' \\dots '+tok.value[1];
	case 'list':
		if(!texArgs)
		{
			texArgs = [];
			for(i=0;i<tok.vars;i++)
			{
				texArgs[i] = texify(tok.value[i],settings);
			}
		}
		return '\\left[ '+texArgs.join(', ')+' \\right]';
	case 'vector':
		return('\\left( ' 
				+ texVector(tok.value,settings)
				+ ' \\right)' );
	case 'matrix':
		return '\\left( '+texMatrix(tok.value,settings)+' \\right)';
	case 'name':
		return texName(tok.name,tok.annotation);
	case 'special':
		return tok.value;
	case 'conc':
		return texArgs.join(' ');
	case 'op':
		return texOps[tok.name.toLowerCase()](thing,texArgs,settings);
	case 'function':
		if(texOps[tok.name.toLowerCase()])
		{
			return texOps[tok.name.toLowerCase()](thing,texArgs,settings);
		}
		else
		{
			var texname;
			if(tok.name.replace(/[^A-Za-z]/g,'').length==1)
				texname=tok.name;
			else
				texname='\\operatorname{'+tok.name+'}';

			return texName(texname,tok.annotation)+' \\left ( '+texArgs.join(', ')+' \\right )';
		}
		break;
	default:
		throw(new LissaJS.Error('jme.display.unknown token type',tok.type));
	}
};

function jmeRationalNumber(n)
{
	if(n.complex)
	{
		var re = jmeRationalNumber(n.re);
		var im = jmeRationalNumber(n.im)+'i';
		if(n.im===0)
			return re;
		else if(n.re===0)
		{
			if(n.im==1)
				return 'i';
			else if(n.im==-1)
				return '-i';
			else
				return im;
		}
		else if(n.im<0)
		{
			if(n.im==-1)
				return re+' - i';
			else
				return re+' - '+jmeRationalNumber(-n.im)+'i';
		}
		else
		{
			if(n.im==1)
				return re+' + '+'i';
			else
				return re+' + '+im;
		}

	}
	else
	{
		var piD;
		if((piD = math.piDegree(n)) > 0)
			n /= Math.pow(Math.PI,piD);

		
		var m;
		var out = math.niceNumber(n);
		if(m = out.match(math.re_scientificNumber)) {
			var mantissa = m[1];
			var exponent = m[2];
			if(exponent[0]=='+')
				exponent = exponent.slice(1);
			return mantissa+'*10^('+exponent+')';
		}

		var f = math.rationalApproximation(Math.abs(n));
		if(f[1]==1)
			out = Math.abs(f[0]).toString();
		else
			out = f[0]+'/'+f[1];
		if(n<0)
			out=' - '+out;

		switch(piD)
		{
		case 0:
			return out;
		case 1:
			return out+' pi';
		default:
			return out+' pi^'+piD;
		}
	}
}

function jmeRealNumber(n)
{
	if(n.complex)
	{
		var re = jmeRealNumber(n.re);
		var im = jmeRealNumber(n.im);
		if(im[im.length-1].match(/[a-zA-Z]/))
			im += '*i';
		else
			im += 'i';

		if(n.im===0)
			return re;
		else if(n.re===0)
		{
			if(n.im==1)
				return 'i';
			else if(n.im==-1)
				return '-i';
			else
				return im;
		}
		else if(n.im<0)
		{
			if(n.im==-1)
				return re+' - i';
			else
				return re+' - '+jmeRealNumber(-n.im)+'i';
		}
		else
		{
			if(n.im==1)
				return re+' + i';
			else
				return re+' + '+im;
		}

	}
	else
	{
		if(n==Infinity)
			return 'infinity';
		else if(n==-Infinity)
			return '-infinity';

		var piD;
		if((piD = math.piDegree(n)) > 0)
			n /= Math.pow(Math.PI,piD);

		var out = math.niceNumber(n);

		var m;
		if(m = out.match(math.re_scientificNumber)) {
			var mantissa = m[1];
			var exponent = m[2];
			if(exponent[0]=='+')
				exponent = exponent.slice(1);
			return mantissa+'*10^('+exponent+')';
		}

		
		switch(piD)
		{
		case 0:
			return out;
		case 1:
			if(n==1)
				return 'pi';
			else
				return out+' pi';
			break;
		default:
			if(n==1)
				return 'pi^'+piD;
			else
				return out+' pi^'+piD;
		}
	}
}


//turns an evaluation tree back into a JME expression
//(used when an expression is simplified)
var treeToJME = jme.display.treeToJME = function(tree,settings)
{
	if(!tree)
		return '';

	settings = settings || {};

	var args=tree.args, l;

	var bits;
	if(args!==undefined && ((l=args.length)>0))
	{
		bits = args.map(function(i){return treeToJME(i,settings);});
	}

    var jmeNumber = settings.fractionnumbers ? jmeRationalNumber : jmeRealNumber;

	var tok = tree.tok;
	switch(tok.type)
	{
	case 'number':
		switch(tok.value)
		{
		case Math.E:
			return 'e';
		case Math.PI:
			return 'pi';
		default:
			return jmeNumber(tok.value);
		}
	case 'name':
		return tok.name;
	case 'string':
		var str = tok.value.replace(/\\/g,'\\\\').replace(/\\([{}])/g,'$1').replace(/\n/g,'\\n').replace(/"/g,'\\"').replace(/'/g,"\\'");
		return '"'+str+'"';
	case 'html':
		var html = tok.value.outerHTML;
		html = html.replace(/"/g,'\\"');
		return 'html("'+html+'")';
	case 'boolean':
		return (tok.value ? 'true' : 'false');
	case 'range':
		return tok.value[0]+'..'+tok.value[1]+(tok.value[2]==1 ? '' : '#'+tok.value[2]);
	case 'list':
		if(!bits)
		{
			bits = tok.value.map(function(b){return treeToJME({tok:b},settings);});
		}
		return '[ '+bits.join(', ')+' ]';
	case 'vector':
		return 'vector('+tok.value.map(jmeNumber).join(',')+')';
	case 'matrix':
		return 'matrix('+
			tok.value.map(function(row){return '['+row.map(jmeNumber).join(',')+']';}).join(',')+')';
	case 'special':
		return tok.value;
	case 'conc':
		return '';
	case 'function':
		return tok.name+'('+bits.join(',')+')';
	case 'op':
		var op = tok.name;

		for(var i=0;i<l;i++)
		{
			if(args[i].tok.type=='op' && opBrackets[op][i][args[i].tok.name]===true)
			{
				bits[i]='('+bits[i]+')';
				args[i].bracketed=true;
			}
			else if(args[i].tok.type=='number' && args[i].tok.value.complex && (op=='*' || op=='-u' || op=='/'))
			{
				if(!(args[i].tok.value.re===0 || args[i].tok.value.im===0))
				{
					bits[i] = '('+bits[i]+')';
					args[i].bracketed = true;
				}
			}
		}
		
		//omit multiplication symbol when not necessary
		if(op=='*')
		{
			//number or brackets followed by name or brackets doesn't need a times symbol
			//except <anything>*(-<something>) does
			if( (args[0].tok.type=='number' || args[0].bracketed) && (args[1].tok.type == 'name' || args[1].bracketed && !(args[1].tok.type=='op' && args[1].tok.name=='-u')) )	
			{
				op = '';
			}
		}

		switch(op)
		{
		case '+u':
			op='+';
			break;
		case '-u':
			op='-';
			if(args[0].tok.type=='number' && args[0].tok.value.complex)
				return jmeNumber({complex:true, re: -args[0].tok.value.re, im: -args[0].tok.value.im});
			break;
		case '-':
			var b = args[1].tok.value;
			if(args[1].tok.type=='number' && args[1].tok.value.complex && args[1].tok.value.re!==0) {
				return bits[0]+' - '+jmeNumber(math.complex(b.re,-b.im));
			}
			op = ' - ';
			break;
		case 'and':
		case 'or':
		case 'isa':
		case 'except':
		case '+':
			op=' '+op+' ';
			break;
		case 'not':
			op = 'not ';
		}

		if(l==1)
			{return op+bits[0];}
		else
			{return bits[0]+op+bits[1];}
	}
};

//does each argument (of an operation) need brackets around it?
//arrays consisting of one object for each argument of the operation
var opBrackets = {
	'+u':[{}],
	'-u':[{'+':true,'-':true}],
	'+': [{},{}],
	'-': [{},{'+':true}],
	'*': [{'+u':true,'-u':true,'+':true, '-':true, '/':true},{'+u':true,'-u':true,'+':true, '-':true, '/':true}],
	'/': [{'+u':true,'-u':true,'+':true, '-':true, '*':true},{'+u':true,'-u':true,'+':true, '-':true, '*':true}],
	'^': [{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true},{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true}],
	'and': [{'or':true, 'xor':true},{'or':true, 'xor':true}],
	'or': [{'xor':true},{'xor':true}],
	'xor':[{},{}],
	'=': [{},{}]
};

var Rule = jme.display.Rule = function(pattern,conditions,result)
{
	this.patternString = pattern;
	this.tree = jme.compile(pattern,{},true);

	this.result = jme.compile(result,{},true);

	this.conditions = [];
	for(var i=0;i<conditions.length;i++)
	{
		this.conditions.push(jme.compile(conditions[i],{},true));
	}
};

Rule.prototype = {
	match: function(exprTree,scope)
	{
		//see if expression matches rule
		var match = matchTree(this.tree,exprTree);
		if(match===false)
			return false;

		//if expression matches rule, then match is a dictionary of matched variables
		//check matched variables against conditions
		if(this.matchConditions(match,scope))
			return match;
		else
			return false;
	},

	matchConditions: function(match,scope)
	{
		for(var i=0;i<this.conditions.length;i++)
		{
			var c = LissaJS.util.copyobj(this.conditions[i],true);
			c = jme.substituteTree(c,new jme.Scope([{variables:match}]));
			try
			{
				var result = jme.evaluate(c,scope);
				if(result.value===false)
					return false;
			}
			catch(e)
			{
				return false;
			}
		}
		return true;
	}
};


function matchTree(ruleTree,exprTree)
{
	if(!exprTree)
		return false;

	var ruleTok = ruleTree.tok;
	var exprTok = exprTree.tok;

	var d = {};

	if(ruleTok.type=='name')
	{
		d[ruleTok.name] = exprTree;
		return d;
	}

	if(ruleTok.type != exprTok.type)
	{
		return false;
	}

	switch(ruleTok.type)
	{
	case 'number':
		if( !math.eq(ruleTok.value,exprTok.value) )
			return false;
		return d;

	case 'string':
	case 'boolean':
	case 'special':
	case 'range':
		if(ruleTok.value != exprTok.value)
			return false;
		return d;

	case 'function':
	case 'op':
		if(ruleTok.name != exprTok.name)
			return false;
		
		for(var i=0;i<ruleTree.args.length;i++)
		{
			var m = matchTree(ruleTree.args[i],exprTree.args[i]);
			if(m===false)
				return false;
			else
			{
				for(var x in m)	//get matched variables
				{
					d[x]=m[x];
				}
			}
		}
		return d;
	default:
		return d;
	}
}


var simplificationRules = jme.display.simplificationRules = {
	basic: [
		['+x',[],'x'],					//get rid of unary plus
		['x+(-y)',[],'x-y'],			//plus minus = minus
		['x+y',['y<0'],'x-eval(-y)'],
		['x-y',['y<0'],'x+eval(-y)'],
		['x-(-y)',[],'x+y'],			//minus minus = plus
		['-(-x)',[],'x'],				//unary minus minus = plus
		['-x',['x isa "complex"','re(x)<0'],'eval(-x)'],
		['x+y',['x isa "number"','y isa "complex"','re(y)=0'],'eval(x+y)'],
		['-x+y',['x isa "number"','y isa "complex"','re(y)=0'],'-eval(x-y)'],
		['(-x)/y',[],'-(x/y)'],			//take negation to left of fraction
		['x/(-y)',[],'-(x/y)'],			
		['(-x)*y',[],'-(x*y)'],			//take negation to left of multiplication
		['x*(-y)',[],'-(x*y)'],		
		['x+(y+z)',[],'(x+y)+z'],		//make sure sums calculated left-to-right
		['x-(y+z)',[],'(x-y)-z'],
		['x+(y-z)',[],'(x+y)-z'],
		['x-(y-z)',[],'(x-y)+z'],
		['(x*y)*z',[],'x*(y*z)'],		//make sure multiplications go right-to-left
		['n*i',['n isa "number"'],'eval(n*i)'],			//always collect multiplication by i
		['i*n',['n isa "number"'],'eval(n*i)']
	],

	unitFactor: [
		['1*x',[],'x'],
		['x*1',[],'x']
	],

	unitPower: [
		['x^1',[],'x']
	],

	unitDenominator: [
		['x/1',[],'x']
	],

	zeroFactor: [
		['x*0',[],'0'],
		['0*x',[],'0'],
		['0/x',[],'0']
	],

	zeroTerm: [
		['0+x',[],'x'],
		['x+0',[],'x'],
		['x-0',[],'x'],
		['0-x',[],'-x']
	],

	zeroPower: [
		['x^0',[],'1']
	],

	noLeadingMinus: [
		['-x+y',[],'y-x']											//don't start with a unary minus
	],

	collectNumbers: [
		['-x-y',['x isa "number"','y isa "number"'],'-(x+y)'],										//collect minuses
		['n+m',['n isa "number"','m isa "number"'],'eval(n+m)'],	//add numbers
		['n-m',['n isa "number"','m isa "number"'],'eval(n-m)'],	//subtract numbers
		['n+x',['n isa "number"','!(x isa "number")'],'x+n'],		//add numbers last

		['(x+n)+m',['n isa "number"','m isa "number"'],'x+eval(n+m)'],	//collect number sums
		['(x-n)+m',['n isa "number"','m isa "number"'],'x+eval(m-n)'],	
		['(x+n)-m',['n isa "number"','m isa "number"'],'x+eval(n-m)'],	
		['(x-n)-m',['n isa "number"','m isa "number"'],'x-eval(n+m)'],	
		['(x+n)+y',['n isa "number"'],'(x+y)+n'],						//shift numbers to right hand side
		['(x+n)-y',['n isa "number"'],'(x-y)+n'],
		['(x-n)+y',['n isa "number"'],'(x+y)-n'],
		['(x-n)-y',['n isa "number"'],'(x-y)-n'],

		['n*m',['n isa "number"','m isa "number"'],'eval(n*m)'],		//multiply numbers
		['x*n',['n isa "number"','!(x isa "number")','n<>i'],'n*x'],			//shift numbers to left hand side
		['m*(n*x)',['m isa "number"','n isa "number"'],'eval(n*m)*x']
	],

	simplifyFractions: [
		['n/m',['n isa "number"','m isa "number"','gcd(n,m)>1'],'eval(n/gcd(n,m))/eval(m/gcd(n,m))'],			//cancel simple fraction
		['(n*x)/m',['n isa "number"','m isa "number"','gcd(n,m)>1'],'(eval(n/gcd(n,m))*x)/eval(m/gcd(n,m))'],	//cancel algebraic fraction
		['n/(m*x)',['n isa "number"','m isa "number"','gcd(n,m)>1'],'eval(n/gcd(n,m))/(eval(m/gcd(n,m))*x)'],	
		['(n*x)/(m*y)',['n isa "number"','m isa "number"','gcd(n,m)>1'],'(eval(n/gcd(n,m))*x)/(eval(m/gcd(n,m))*y)']	
	],

	zeroBase: [
		['0^x',[],'0']
	],

	constantsFirst: [
		['x*n',['n isa "number"','!(x isa "number")','n<>i'],'n*x'],
		['x*(n*y)',['n isa "number"','n<>i','!(x isa "number")'],'n*(x*y)']
	],

	sqrtProduct: [
		['sqrt(x)*sqrt(y)',[],'sqrt(x*y)']
	],

	sqrtDivision: [
		['sqrt(x)/sqrt(y)',[],'sqrt(x/y)']
	],

	sqrtSquare: [
		['sqrt(x^2)',[],'x'],
		['sqrt(x)^2',[],'x'],
		['sqrt(n)',['n isa "number"','isint(sqrt(n))'],'eval(sqrt(n))']
	],

	trig: [
		['sin(n)',['n isa "number"','isint(2*n/pi)'],'eval(sin(n))'],
		['cos(n)',['n isa "number"','isint(2*n/pi)'],'eval(cos(n))'],
		['tan(n)',['n isa "number"','isint(n/pi)'],'0'],
		['cosh(0)',[],'1'],
		['sinh(0)',[],'0'],
		['tanh(0)',[],'0']
	],

	otherNumbers: [
		['n^m',['n isa "number"','m isa "number"'],'eval(n^m)']
	]
};

var compileRules = jme.display.compileRules = function(rules)
{
	var pattern, conditions, result;
	for(var i=0;i<rules.length;i++)
	{
		pattern = rules[i][0];
		conditions = rules[i][1];
		result = rules[i][2];
		rules[i] = new Rule(pattern,conditions,result);
	}
	return new jme.Ruleset(rules,{});
};

var all=[];
var nsimplificationRules = LissaJS.jme.display.simplificationRules = {};
for(var x in simplificationRules)
{
	nsimplificationRules[x] = nsimplificationRules[x.toLowerCase()] = compileRules(simplificationRules[x]);
	all = all.concat(nsimplificationRules[x].rules);
}
simplificationRules = nsimplificationRules;
simplificationRules['all'] = new jme.Ruleset(all,{});
LissaJS.jme.builtinScope = new LissaJS.jme.Scope([LissaJS.jme.builtinScope,{rulesets: simplificationRules}]);

return LissaJS;
})();
