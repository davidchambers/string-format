COFFEE = node_modules/.bin/coffee
MOCHA = node_modules/.bin/mocha --compilers coffee:coffee-script
SEMVER = node_modules/.bin/semver

JS_FILES = $(patsubst src/%.coffee,lib/%.js,$(shell find src -type f))


.PHONY: all
all: $(JS_FILES)

lib/%.js: src/%.coffee
	$(COFFEE) --compile --output $(@D) $<


.PHONY: clean
clean:
	rm -f $(JS_FILES)


.PHONY: release-patch release-minor release-major
VERSION = $(shell node -p 'require("./package.json").version')
release-patch: NEXT_VERSION = $(shell $(SEMVER) -i patch $(VERSION))
release-minor: NEXT_VERSION = $(shell $(SEMVER) -i minor $(VERSION))
release-major: NEXT_VERSION = $(shell $(SEMVER) -i major $(VERSION))
release-patch: release
release-minor: release
release-major: release

.PHONY: release
release:
	sed -i '' 's/"version": "[^"]*"/"version": "$(NEXT_VERSION)"/' package.json
	sed -i '' "s/.version = '[^']*'/.version = '$(NEXT_VERSION)'/" src/string-format.coffee
	make
	git add package.json src/string-format.coffee lib/string-format.js
	git commit --message $(NEXT_VERSION)
	git tag $(NEXT_VERSION)
	@echo 'remember to run `npm publish`'


.PHONY: setup
setup:
	npm install


.PHONY: test
test: all
	$(MOCHA)
