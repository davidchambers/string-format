assert = require 'assert'

format = require '../src/string-format'


describe 'String::format', ->


  it 'interpolates positional arguments', ->
    assert.strictEqual(
      '{0}, you have {1} unread message{2}'.format('Holly', 2, 's')
      'Holly, you have 2 unread messages')


  it 'strips unmatched placeholders', ->
    assert.strictEqual(
      '{0}, you have {1} unread message{2}'.format('Steve', 1)
      'Steve, you have 1 unread message')


  it 'allows indexes to be omitted if they are entirely sequential', ->
    assert.strictEqual(
      '{}, you have {} unread message{}'.format('Steve', 1)
      'Steve, you have 1 unread message')


  it 'replaces all occurrences of a placeholder', ->
    assert.strictEqual(
      'the meaning of life is {0} ({1} x {2} is also {0})'.format(42, 6, 7)
      'the meaning of life is 42 (6 x 7 is also 42)')


  it 'does not allow explicit and implicit numbering to be intermingled', ->
    assert.throws(
      (-> '{} {0}'.format 'foo', 'bar')
      /cannot switch from implicit to explicit numbering/)

    assert.throws(
      (-> '{1} {}'.format 'foo', 'bar')
      /cannot switch from explicit to implicit numbering/)


  it 'treats "{{" and "}}" as "{" and "}"', ->
    assert.strictEqual '{{ {}: "{}" }}'.format('foo', 'bar'), '{ foo: "bar" }'


  it 'supports property access via dot notation', ->
    bobby = first_name: 'Bobby', last_name: 'Fischer'
    garry = first_name: 'Garry', last_name: 'Kasparov'
    assert.strictEqual(
      '{0.first_name} {0.last_name} vs. {1.first_name} {1.last_name}'.format(bobby, garry)
      'Bobby Fischer vs. Garry Kasparov')


  it 'accepts a shorthand for properties of the first positional argument', ->
    bobby = first_name: 'Bobby', last_name: 'Fischer'
    assert.strictEqual '{first_name} {last_name}'.format(bobby), 'Bobby Fischer'


  it 'invokes methods', ->
    assert.strictEqual '{0.toLowerCase}'.format('III'), 'iii'
    assert.strictEqual '{0.toUpperCase}'.format('iii'), 'III'
    assert.strictEqual '{0.getFullYear}'.format(new Date '26 Apr 1984'), '1984'
    assert.strictEqual '{pop}{pop}{pop}'.format(['one', 'two', 'three']), 'threetwoone'
    assert.strictEqual '{quip.toUpperCase}'.format(quip: -> 'Bazinga!'), 'BAZINGA!'


  String::format.transformers.s = -> 's' unless +this is 1


  it 'applies transformers to explicit positional arguments', ->
    text = '{0}, you have {1} unread message{1!s}'
    assert.strictEqual text.format('Steve', 1), 'Steve, you have 1 unread message'
    assert.strictEqual text.format('Holly', 2), 'Holly, you have 2 unread messages'


  it 'applies transformers to implicit positional arguments', ->
    text = 'The Cure{!s}, The Door{!s}, The Smith{!s}'
    assert.strictEqual text.format(1, 2, 3), 'The Cure, The Doors, The Smiths'


  it 'applies transformers to properties of explicit positional arguments', ->
    text = '<a href="/inbox">view message{0.length!s}</a>'
    assert.strictEqual text.format(new Array 1), '<a href="/inbox">view message</a>'
    assert.strictEqual text.format(new Array 2), '<a href="/inbox">view messages</a>'


  it 'applies transformers to properties of implicit positional arguments', ->
    text = '<a href="/inbox">view message{length!s}</a>'
    assert.strictEqual text.format(new Array 1), '<a href="/inbox">view message</a>'
    assert.strictEqual text.format(new Array 2), '<a href="/inbox">view messages</a>'


  it 'provides a format function when "required"', ->
    assert.strictEqual(
      format("The name's {1}. {0} {1}.", 'James', 'Bond')
      "The name's Bond. James Bond.")


  it "passes applicable tests from Python's test suite", ->
    assert.strictEqual ''.format(), ''
    assert.strictEqual 'abc'.format(), 'abc'
    assert.strictEqual '{0}'.format('abc'), 'abc'
    assert.strictEqual 'X{0}'.format('abc'), 'Xabc'
    assert.strictEqual '{0}X'.format('abc'), 'abcX'
    assert.strictEqual 'X{0}Y'.format('abc'), 'XabcY'
    assert.strictEqual '{1}'.format(1, 'abc'), 'abc'
    assert.strictEqual 'X{1}'.format(1, 'abc'), 'Xabc'
    assert.strictEqual '{1}X'.format(1, 'abc'), 'abcX'
    assert.strictEqual 'X{1}Y'.format(1, 'abc'), 'XabcY'
    assert.strictEqual '{0}'.format(-15), '-15'
    assert.strictEqual '{0}{1}'.format(-15, 'abc'), '-15abc'
    assert.strictEqual '{0}X{1}'.format(-15, 'abc'), '-15Xabc'
    assert.strictEqual '{{'.format(), '{'
    assert.strictEqual '}}'.format(), '}'
    assert.strictEqual '{{}}'.format(), '{}'
    assert.strictEqual '{{x}}'.format(), '{x}'
    assert.strictEqual '{{{0}}}'.format(123), '{123}'
    assert.strictEqual '{{{{0}}}}'.format(), '{{0}}'
    assert.strictEqual '}}{{'.format(), '}{'
    assert.strictEqual '}}x{{'.format(), '}x{'
