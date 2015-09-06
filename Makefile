ISTANBUL = node --harmony node_modules/.bin/istanbul
JSCS = node_modules/.bin/jscs
JSHINT = node_modules/.bin/jshint
XYZ = node_modules/.bin/xyz --message X.Y.Z --tag X.Y.Z --repo git@github.com:davidchambers/string-format.git


.PHONY: all
all:


.PHONY: lint
lint: index.js test/index.js test/readme.js
	$(JSHINT) -- $^
	$(JSCS) -- $^


.PHONY: release-major release-minor release-patch
release-major release-minor release-patch:
	@$(XYZ) --increment $(@:release-%=%)


.PHONY: setup
setup:
	npm install


.PHONY: test
test:
	$(ISTANBUL) cover node_modules/.bin/_mocha -- test/index.js
	$(ISTANBUL) check-coverage --branches 100
	node test/readme.js
