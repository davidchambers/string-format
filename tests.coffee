require './string-format'


count = passes = 0

ok = (actual, expected) ->
  count += 1
  passes += 1 if actual is expected

throws = (fn, expected_error) ->
  count += 1
  try
    do fn
  catch error
    passes += 1 if error is expected_error


ok '{0}, you have {1} unread message{2}'.format('Holly', 2, 's')
 , 'Holly, you have 2 unread messages'

ok '{0}, you have {1} unread message{2}'.format('Steve', 1)
 , 'Steve, you have 1 unread message'

ok 'the meaning of life is {0} ({1} x {2} is also {0})'.format(42, 6, 7)
 , 'the meaning of life is 42 (6 x 7 is also 42)'

ok '{}, you have {} unread message{}'.format('Steve', 1)
 , 'Steve, you have 1 unread message'

throws (-> '{} {0}'.format 'foo', 'bar')
 , 'cannot switch from implicit to explicit numbering'

throws (-> '{1} {}'.format 'foo', 'bar')
 , 'cannot switch from explicit to implicit numbering'

template = '{1} {}'.format()

throws (-> template 'foo', 'bar')
 , 'cannot switch from explicit to implicit numbering'

ok '{{ {}: "{}" }}'.format('foo', 'bar')
 , '{ foo: "bar" }'

bobby = first_name: 'Bobby', last_name: 'Fischer'
garry = first_name: 'Garry', last_name: 'Kasparov'

ok '{0.first_name} {0.last_name} vs. {1.first_name} {1.last_name}'.format(bobby, garry)
 , 'Bobby Fischer vs. Garry Kasparov'

ok '{first_name} {last_name}'.format(bobby)
 , 'Bobby Fischer'

String::format.transformers.s = -> 's' unless +this is 1

ok '{0}, you have {1} unread message{1!s}'.format('Holly', 2)
 , 'Holly, you have 2 unread messages'

ok '{0}, you have {1} unread message{1!s}'.format('Steve', 1)
 , 'Steve, you have 1 unread message'

ok '<a href="/inbox">view message{!s}</a>'.format(2)
 , '<a href="/inbox">view messages</a>'

ok '<a href="/inbox">view message{!s}</a>'.format(1)
 , '<a href="/inbox">view message</a>'

ok '<a href="/inbox">view message{length!s}</a>'.format(['foo', 'bar'])
 , '<a href="/inbox">view messages</a>'

ok '<a href="/inbox">view message{length!s}</a>'.format(['baz'])
 , '<a href="/inbox">view message</a>'

# From Python's test suite:
ok ''.format(null), ''
ok 'abc'.format(null), 'abc'
ok '{0}'.format('abc'), 'abc'
ok 'X{0}'.format('abc'), 'Xabc'
ok '{0}X'.format('abc'), 'abcX'
ok 'X{0}Y'.format('abc'), 'XabcY'
ok '{1}'.format(1, 'abc'), 'abc'
ok 'X{1}'.format(1, 'abc'), 'Xabc'
ok '{1}X'.format(1, 'abc'), 'abcX'
ok 'X{1}Y'.format(1, 'abc'), 'XabcY'
ok '{0}'.format(-15), '-15'
ok '{0}{1}'.format(-15, 'abc'), '-15abc'
ok '{0}X{1}'.format(-15, 'abc'), '-15Xabc'
ok '{{'.format(null), '{'
ok '}}'.format(null), '}'
ok '{{}}'.format(null), '{}'
ok '{{x}}'.format(null), '{x}'
ok '{{{0}}}'.format(123), '{123}'
ok '{{{{0}}}}'.format(null), '{{0}}'
ok '}}{{'.format(null), '}{'
ok '}}x{{'.format(null), '}x{'


console.log "#{passes} of #{count} tests passed"
