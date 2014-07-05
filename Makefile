COFFEE = node_modules/.bin/coffee
MOCHA = node_modules/.bin/mocha --compilers coffee:coffee-script
XYZ = node_modules/.bin/xyz --message X.Y.Z --tag X.Y.Z --repo git@github.com:davidchambers/string-format.git --script scripts/prepublish

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
release-major: LEVEL = major
release-minor: LEVEL = minor
release-patch: LEVEL = patch

release-major release-minor release-patch:
	@$(XYZ) --increment $(LEVEL)


.PHONY: setup
setup:
	npm install
	make clean
	git update-index --assume-unchanged -- $(LIB)


.PHONY: test
test: all
	$(MOCHA)
