# fix to build on windows
SHELL=C:/Windows/System32/cmd.exe

FILES = math.js util.js jme.js jme-builtins.js jme-variables.js jme-display.js # JME scripts; the order is important
JMEFILES = $(patsubst %,src/jme/%,$(FILES))

default: clean lissajs.js

lissajs.js: src/wrapper/top.js $(JMEFILES) src/wrapper/bottom.js
	cat $^ > lissajs.js.tmp
	sed s/Numbas/LissaJS/g < lissajs.js.tmp > lissajs.js
	rm lissajs.js.tmp

clean:
	rm lissajs.js
