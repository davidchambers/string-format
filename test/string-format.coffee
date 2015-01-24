assert = require 'assert'

format = require '..'


eq = assert.strictEqual

s = (num) -> if num is 1 then '' else 's'


describe 'format', ->

  it 'is a function with "create" and "extend" functions', ->
    eq Object::toString.call(format), '[object Function]'
    eq Object::toString.call(format.create), '[object Function]'
    eq Object::toString.call(format.extend), '[object Function]'

  it 'interpolates positional arguments', -> eq(
    format '{0}, you have {1} unread message{2}', 'Holly', 2, 's'
    'Holly, you have 2 unread messages'
  )

  it 'strips unmatched placeholders', -> eq(
    format '{0}, you have {1} unread message{2}', 'Steve', 1
    'Steve, you have 1 unread message'
  )

  it 'allows indexes to be omitted if they are entirely sequential', -> eq(
    format '{}, you have {} unread message{}', 'Steve', 1
    'Steve, you have 1 unread message'
  )

  it 'replaces all occurrences of a placeholder', -> eq(
    format 'the meaning of life is {0} ({1} x {2} is also {0})', 42, 6, 7
    'the meaning of life is 42 (6 x 7 is also 42)'
  )

  it 'does not allow explicit and implicit numbering to be intermingled', ->
    assert.throws (-> format '{} {0}', 'foo', 'bar'), (err) ->
      err instanceof Error and
      err.name is 'ValueError' and
      err.message is 'cannot switch from implicit to explicit numbering'

    assert.throws (-> format '{1} {}', 'foo', 'bar'), (err) ->
      err instanceof Error and
      err.name is 'ValueError' and
      err.message is 'cannot switch from explicit to implicit numbering'

  it 'treats "{{" and "}}" as "{" and "}"', ->
    eq format('{{ {}: "{}" }}', 'foo', 'bar'), '{ foo: "bar" }'

  it 'supports property access via dot notation', ->
    bobby = first: 'Bobby', last: 'Fischer'
    garry = first: 'Garry', last: 'Kasparov'
    eq(
      format '{0.first} {0.last} vs. {1.first} {1.last}', bobby, garry
      'Bobby Fischer vs. Garry Kasparov'
    )

  it 'accepts a shorthand for properties of the first positional argument', ->
    bobby = first: 'Bobby', last: 'Fischer'
    eq format('{first} {last}', bobby), 'Bobby Fischer'

  it 'invokes methods', ->
    eq format('{0.toLowerCase}', 'III'), 'iii'
    eq format('{0.toUpperCase}', 'iii'), 'III'
    eq format('{0.getFullYear}', new Date '26 Apr 1984'), '1984'
    eq format('{pop}{pop}{pop}', ['one', 'two', 'three']), 'threetwoone'
    eq format('{quip.toUpperCase}', quip: -> 'Bazinga!'), 'BAZINGA!'

  it "passes applicable tests from Python's test suite", ->
    eq format(''), ''
    eq format('abc'), 'abc'
    eq format('{0}', 'abc'), 'abc'
    eq format('X{0}', 'abc'), 'Xabc'
    eq format('{0}X', 'abc'), 'abcX'
    eq format('X{0}Y', 'abc'), 'XabcY'
    eq format('{1}', 1, 'abc'), 'abc'
    eq format('X{1}', 1, 'abc'), 'Xabc'
    eq format('{1}X', 1, 'abc'), 'abcX'
    eq format('X{1}Y', 1, 'abc'), 'XabcY'
    eq format('{0}', -15), '-15'
    eq format('{0}{1}', -15, 'abc'), '-15abc'
    eq format('{0}X{1}', -15, 'abc'), '-15Xabc'
    eq format('{{'), '{'
    eq format('}}'), '}'
    eq format('{{}}'), '{}'
    eq format('{{x}}'), '{x}'
    eq format('{{{0}}}', 123), '{123}'
    eq format('{{{{0}}}}'), '{{0}}'
    eq format('}}{{'), '}{'
    eq format('}}x{{'), '}x{'

  describe 'format.create', ->

    it 'returns a format function with access to provided transformers', ->
      formatA = format.create x: (s) -> "#{s} (formatA)"
      formatB = format.create x: (s) -> "#{s} (formatB)"

      eq formatA('{!x}', 'abc'), 'abc (formatA)'
      eq formatB('{!x}', 'abc'), 'abc (formatB)'

  it 'applies transformers to explicit positional arguments', ->
    $format = format.create {s}
    text = '{0}, you have {1} unread message{1!s}'
    eq $format(text, 'Steve', 1), 'Steve, you have 1 unread message'
    eq $format(text, 'Holly', 2), 'Holly, you have 2 unread messages'

  it 'applies transformers to implicit positional arguments', ->
    $format = format.create {s}
    text = 'The Cure{!s}, The Door{!s}, The Smith{!s}'
    eq $format(text, 1, 2, 3), 'The Cure, The Doors, The Smiths'

  it 'applies transformers to properties of explicit positional arguments', ->
    $format = format.create {s}
    text = '<a href="/inbox">view message{0.length!s}</a>'
    eq $format(text, new Array 1), '<a href="/inbox">view message</a>'
    eq $format(text, new Array 2), '<a href="/inbox">view messages</a>'

  it 'applies transformers to properties of implicit positional arguments', ->
    $format = format.create {s}
    text = '<a href="/inbox">view message{length!s}</a>'
    eq $format(text, new Array 1), '<a href="/inbox">view message</a>'
    eq $format(text, new Array 2), '<a href="/inbox">view messages</a>'

  it 'ignores inherited properties of the transformers object', ->
    eq format('foo-{!toString}-baz', 'bar'), 'foo-bar-baz'

  describe 'format.extend', ->

    it 'defines String::format in the global environment', ->
      format.extend String.prototype
      eq Object::toString.call(String::format), '[object Function]'
      eq 'Hello, {}!'.format('Alice'), 'Hello, Alice!'
      delete String::format

    it 'defines String::format in a custom environment', ->
      class Foo
      format.extend Foo.prototype
      eq Object::toString.call(Foo::format), '[object Function]'
      eq Foo::format.call('Hello, {}!', 'Alice'), 'Hello, Alice!'
