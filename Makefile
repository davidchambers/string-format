bin = node_modules/.bin

lib/string-format.js: src/string-format.coffee
	@mkdir -p $(@D)
	@cat $< | $(bin)/coffee --compile --stdio > $@

.PHONY: clean
clean:
	@rm -rf node_modules
	@git checkout -- lib

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
	@$(bin)/mocha --compilers coffee:coffee-script
