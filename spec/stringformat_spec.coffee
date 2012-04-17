require '../string-format'

describe 'String::format', ->

  it 'interpolates positional arguments', ->
    '{0}, you have {1} unread message{2}'.format('Holly', 2, 's')
    .should_be 'Holly, you have 2 unread messages'

  it 'strips unmatched placeholders', ->
    '{0}, you have {1} unread message{2}'.format('Steve', 1)
    .should_be 'Steve, you have 1 unread message'

  it 'allows indexes to be omitted if they are entirely sequential', ->
    '{}, you have {} unread message{}'.format('Steve', 1)
    .should_be 'Steve, you have 1 unread message'

  it 'replaces all occurrences of a placeholder', ->
    'the meaning of life is {0} ({1} x {2} is also {0})'.format(42, 6, 7)
    .should_be 'the meaning of life is 42 (6 x 7 is also 42)'

  it 'creates a reusable template function when invoked with no arguments', ->
    explicit = '{0}, you have {1} unread message{2}'.format()
    implicit = '{}, you have {} unread message{}'.format()
    explicit('Holly', 2, 's').should_be 'Holly, you have 2 unread messages'
    implicit('Holly', 2, 's').should_be 'Holly, you have 2 unread messages'
    explicit('Steve', 1).should_be 'Steve, you have 1 unread message'
    implicit('Steve', 1).should_be 'Steve, you have 1 unread message'

  it 'does not allow explicit and implicit numbering to be intermingled', ->
    expect(-> '{} {0}'.format 'foo', 'bar')
    .toThrow 'cannot switch from implicit to explicit numbering'
    expect(-> '{1} {}'.format 'foo', 'bar')
    .toThrow 'cannot switch from explicit to implicit numbering'
    expect(-> '{1} {}'.format() 'foo', 'bar')
    .toThrow 'cannot switch from explicit to implicit numbering'

  it 'treats "{{" and "}}" as "{" and "}"', ->
    '{{ {}: "{}" }}'.format('foo', 'bar').should_be '{ foo: "bar" }'

  it 'supports property access via dot notation', ->
    bobby = first_name: 'Bobby', last_name: 'Fischer'
    garry = first_name: 'Garry', last_name: 'Kasparov'
    '{0.first_name} {0.last_name} vs. {1.first_name} {1.last_name}'.format(bobby, garry)
    .should_be 'Bobby Fischer vs. Garry Kasparov'

  it 'accepts a shorthand for properties of the first positional argument', ->
    bobby = first_name: 'Bobby', last_name: 'Fischer'
    '{first_name} {last_name}'.format(bobby).should_be 'Bobby Fischer'

  it 'invokes methods', ->
    '{0.toLowerCase}'.format('III').should_be 'iii'
    '{0.toUpperCase}'.format('iii').should_be 'III'
    '{0.getFullYear}'.format(new Date '26 Apr 1984').should_be '1984'
    '{pop}{pop}{pop}'.format(['one', 'two', 'three']).should_be 'threetwoone'
    '{quip.toUpperCase}'.format(quip: -> 'Bazinga!').should_be 'BAZINGA!'

  String::format.transformers.s = -> 's' unless +this is 1

  it 'applies transformers to explicit positional arguments', ->
    text = '{0}, you have {1} unread message{1!s}'
    text.format('Steve', 1).should_be 'Steve, you have 1 unread message'
    text.format('Holly', 2).should_be 'Holly, you have 2 unread messages'

  it 'applies transformers to implicit positional arguments', ->
    text = 'The Cure{!s}, The Door{!s}, The Smith{!s}'
    text.format(1, 2, 3).should_be 'The Cure, The Doors, The Smiths'

  it 'applies transformers to properties of explicit positional arguments', ->
    text = '<a href="/inbox">view message{0.length!s}</a>'
    text.format(new Array 1).should_be '<a href="/inbox">view message</a>'
    text.format(new Array 2).should_be '<a href="/inbox">view messages</a>'

  it 'applies transformers to properties of implicit positional arguments', ->
    text = '<a href="/inbox">view message{length!s}</a>'
    text.format(new Array 1).should_be '<a href="/inbox">view message</a>'
    text.format(new Array 2).should_be '<a href="/inbox">view messages</a>'

  it "passes applicable tests from Python's test suite", ->
    ''.format(null).should_be ''
    'abc'.format(null).should_be 'abc'
    '{0}'.format('abc').should_be 'abc'
    'X{0}'.format('abc').should_be 'Xabc'
    '{0}X'.format('abc').should_be 'abcX'
    'X{0}Y'.format('abc').should_be 'XabcY'
    '{1}'.format(1, 'abc').should_be 'abc'
    'X{1}'.format(1, 'abc').should_be 'Xabc'
    '{1}X'.format(1, 'abc').should_be 'abcX'
    'X{1}Y'.format(1, 'abc').should_be 'XabcY'
    '{0}'.format(-15).should_be '-15'
    '{0}{1}'.format(-15, 'abc').should_be '-15abc'
    '{0}X{1}'.format(-15, 'abc').should_be '-15Xabc'
    '{{'.format(null).should_be '{'
    '}}'.format(null).should_be '}'
    '{{}}'.format(null).should_be '{}'
    '{{x}}'.format(null).should_be '{x}'
    '{{{0}}}'.format(123).should_be '{123}'
    '{{{{0}}}}'.format(null).should_be '{{0}}'
    '}}{{'.format(null).should_be '}{'
    '}}x{{'.format(null).should_be '}x{'
