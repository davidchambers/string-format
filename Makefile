COFFEE = node_modules/.bin/coffee
MOCHA = node_modules/.bin/mocha --compilers coffee:coffee-script/register
XYZ = node_modules/.bin/xyz --message X.Y.Z --tag X.Y.Z --repo git@github.com:davidchambers/string-format.git

SRC = $(shell find src -name '*.coffee')
LIB = $(patsubst src/%.coffee,lib/%.js,$(SRC))


.PHONY: all
all: $(LIB)

lib/%.js: src/%.coffee
	$(COFFEE) --compile --output $(@D) -- $<


.PHONY: clean
clean:
	rm -f -- $(LIB)


.PHONY: release-major release-minor release-patch
release-major release-minor release-patch:
	@$(XYZ) --increment $(@:release-%=%)


.PHONY: setup
setup:
	npm install


.PHONY: test
test: all
	$(MOCHA)
	$(COFFEE) test/readme.coffee
