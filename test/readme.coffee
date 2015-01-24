fs = require 'fs'
path = require 'path'
vm = require 'vm'

R = require 'ramda'

format = require '..'


extractChunks = R.pipe(
  R.lPartial path.join, __dirname, '..'
  fs.readFileSync
  String
  R.split /^/m
  R.reduce (accum, line) ->
    if accum.inExample and line isnt '```\n'
      [init..., last] = accum.examples
      inExample: true, examples: [init..., "#{last}#{line}"]
    else if line is '```javascript\n'
      inExample: true, examples: [accum.examples..., '']
    else
      inExample: false, examples: accum.examples
  , inExample: false, examples: []
  R.prop 'examples'
  R.map R.pipe(
    R.split /^/m
    R.reduce (result, line) ->
      match = /^[/][/] => (?:([A-Za-z]*Error): )?(.*)\n/.exec line
      if match is null then "#{result}#{line}"
      else result.replace /(.*)(?=\n$)/, (actual) ->
        if match[1] then """
          assert.throws(function() {
            #{actual}
          }, function(err) {
            return err.name === '#{match[1]}' &&
                   err.message === '#{match[2].replace /'/g, "\\'"}';
          });
        """
        else """
          assert.strictEqual(
            #{actual},
            #{match[2]}
          );
        """
    , ''
    R.concat 'format.extend(String.prototype);\n\n'
  )
)

# blockquote :: String -> String
blockquote = R.replace /^(?=[\s\S])/gm, '> '

extractChunks 'README.md'
.forEach (chunk) ->
  try
    vm.createScript "format.extend(String.prototype);\n\n#{chunk}"
    .runInNewContext
      assert: require 'assert'
      format: format
      require: R.always format
      user: firstName: 'Jane', lastName: 'Smith', email: 'jsmith@example.com'
  catch err
    process.stderr.write "\n#{err}\n\n#{blockquote chunk}\n"
    process.exit 1
