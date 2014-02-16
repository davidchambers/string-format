COFFEE = node_modules/.bin/coffee
MOCHA = node_modules/.bin/mocha --compilers coffee:coffee-script

JS_FILES = $(patsubst src/%.coffee,lib/%.js,$(shell find src -type f))


.PHONY: all
all: $(JS_FILES)

lib/%.js: src/%.coffee
	@mkdir -p $(@D)
	@cat $< | $(COFFEE) --compile --stdio > $@


.PHONY: clean
clean:
	@rm -rf node_modules
	@rm -f $(JS_FILES)


.PHONY: release
release:
ifndef VERSION
	$(error VERSION is undefined)
endif
	@sed -i '' 's!\("version": "\)[0-9.]*\("\)!\1$(VERSION)\2!' package.json
	@sed -i '' "s!\(.version = '\)[0-9.]*\('\)!\1$(VERSION)\2!" src/string-format.coffee
	@make
	@git add package.json src/string-format.coffee lib/string-format.js
	@git commit --message $(VERSION)
	@echo 'remember to run `npm publish`'


.PHONY: setup
setup:
	@npm install


.PHONY: test
test:
	@$(MOCHA)
