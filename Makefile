.PHONY: compile clean release setup test

bin = node_modules/.bin

compile:
	@$(bin)/coffee --compile --output lib src

clean:
	@rm -rf node_modules
	@git checkout -- lib

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

setup:
	@npm install

test:
	@$(bin)/mocha --compilers coffee:coffee-script
