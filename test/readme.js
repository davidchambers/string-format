'use strict';

/* jshint node: true */

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var R = require('ramda');

var format = require('..');


//  quote :: String -> String
var quote = function(s) {
  return "'" + s.replace(/'/g, "\\'") + "'";
};


var extractChunks = R.pipe(
  R.lPartial(path.join, __dirname, '..'),
  fs.readFileSync,
  String,
  R.split(/^/m),
  R.reduce(function(accum, line) {
    return (
      accum.inExample && line !== '```\n' ?
        {
          inExample: true,
          examples: R.append(R.last(accum.examples) + line,
                             R.slice(0, -1, accum.examples))
        } :
      line === '```javascript\n' ?
        {
          inExample: true,
          examples: R.append('', accum.examples)
        } :
      // else
        {
          inExample: false,
          examples: accum.examples
        }
    );
  }, {inExample: false, examples: []}),
  R.prop('examples'),
  R.map(R.split(/^/m)),
  R.map(R.reduce(function(result, line) {
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
  }, '')),
  R.map(R.concat('format.extend(String.prototype, {});\n\n'))
);

extractChunks('README.md').forEach(function(chunk) {
  try {
    vm.createScript(chunk).runInNewContext({
      assert: require('assert'),
      format: format,
      require: R.always(format),
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
