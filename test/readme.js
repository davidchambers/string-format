'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var format = require('..');


//  quote :: String -> String
function quote(s) {
  return "'" + s.replace(/'/g, "\\'") + "'";
}


function extractChunks(filename) {
  return fs
  .readFileSync(path.join(__dirname, '..', filename), 'utf8')
  .split(/^/m)
  .reduce(function(accum, line) {
    if (accum.inExample && line !== '```\n') {
      accum.examples[accum.examples.length - 1] += line;
    } else if (line === '```javascript\n') {
      accum.inExample = true;
      accum.examples.push('');
    } else {
      accum.inExample = false;
    }
    return accum;
  }, {inExample: false, examples: []})
  .examples
  .map(function(s) {
    return s.split(/^/m).reduce(function(result, line) {
      var match = /^[/][/] => (?:([A-Za-z]*Error): )?(.*)\n/.exec(line);
      return match == null ?
        result + line :
        result.replace(/(.*)\n$/, function($0, $1) {
          return match[1] == null ?
            'assert.strictEqual(' + $1 + ', ' + match[2] + ');\n' :
            'assert.throws(\n' +
            '  function() { ' + $1 + '; },\n' +
            '  function(err) {\n' +
            '    assert.strictEqual(err.name, ' + quote(match[1]) + ');\n' +
            '    assert.strictEqual(err.message, ' + quote(match[2]) + ');\n' +
            '    return true;\n' +
            '  }\n' +
            ');\n';
        });
    }, '');
  })
  .map(function(s) { return 'format.extend(String.prototype, {});\n\n' + s; });
}

extractChunks('README.md').forEach(function(chunk) {
  try {
    vm.createScript(chunk).runInNewContext({
      assert: require('assert'),
      format: format,
      user: {firstName: 'Jane', lastName: 'Smith', email: 'jsmith@example.com'}
    }, {
      displayErrors: false
    });
  } catch (err) {
    process.stderr.write('\n' + String(err) + '\n\n');
    process.stderr.write(chunk.replace(/^(?=[\s\S])/gm, '> ') + '\n');
    process.exit(1);
  }
});
