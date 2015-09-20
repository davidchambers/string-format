'use strict';

/* global describe, it */
/* jshint maxlen: 999, node: true */

var assert = require('assert');
var exec = require('child_process').exec;

var random = require('lodash.random');
var sample = require('lodash.sample');
var R = require('ramda');

var format = require('..');


var eq = assert.strictEqual;

var s = function(num) { return num === 1 ? '' : 's'; };

var throws = function(s, block) {
  var sep = ': ';
  var idx = s.indexOf(sep);
  if (idx >= 0) {
    assert.throws(block, function(err) {
      return err instanceof Error &&
             err.name === s.slice(0, idx) &&
             err.message === s.slice(idx + sep.length);
    });
  } else {
    assert.throws(block, function(err) {
      return err instanceof Error && err.name === s;
    });
  }
};


describe('format', function() {

  it('is a function with "create" and "extend" functions', function() {
    eq(typeof format, 'function');
    eq(typeof format.create, 'function');
    eq(typeof format.extend, 'function');
  });

  it('interpolates positional arguments', function() {
    eq(format('{0}, you have {1} unread message{2}', ['Holly', 2, 's']),
       'Holly, you have 2 unread messages');
  });

  it('throws a KeyError if there are unmatched placeholders', function() {
    throws('KeyError: "2"', function() { format('{0} {1} {2}', ['x', 'y']); });
  });

  it('allows indexes to be omitted if they are entirely sequential', function() {
    eq(format('{}, you have {} unread message{}', ['Steve', 1, '']),
       'Steve, you have 1 unread message');
  });

  it('replaces all occurrences of a placeholder', function() {
    eq(format('the meaning of life is {0} ({1} x {2} is also {0})', [42, 6, 7]),
       'the meaning of life is 42 (6 x 7 is also 42)');
  });

  it('does not allow explicit and implicit numbering to be intermingled', function() {
    throws('ValueError: cannot switch from implicit to explicit numbering',
           function() { format('{} {0}', ['foo', 'bar']); });

    throws('ValueError: cannot switch from explicit to implicit numbering',
           function() { format('{1} {}', ['foo', 'bar']); });
  });

  it('treats "{{" and "}}" as "{" and "}"', function() {
    eq(format('{{ {}: "{}" }}', ['foo', 'bar']), '{ foo: "bar" }');
  });

  it('supports property access via dot notation', function() {
    var bobby = {first: 'Bobby', last: 'Fischer'};
    var garry = {first: 'Garry', last: 'Kasparov'};
    eq(format('{0.first} {0.last} vs. {1.first} {1.last}', [bobby, garry]),
       'Bobby Fischer vs. Garry Kasparov');
  });

  it('accepts a shorthand for properties of the first positional argument', function() {
    var bobby = {first: 'Bobby', last: 'Fischer'};
    eq(format('{first} {last}', [bobby]), 'Bobby Fischer');
  });

  it('invokes methods', function() {
    eq(format('{0.toLowerCase}', ['III']), 'iii');
    eq(format('{0.toUpperCase}', ['iii']), 'III');
    eq(format('{0.getFullYear}', [new Date('26 Apr 1984')]), '1984');
    eq(format('{pop}{pop}{pop}', [['one', 'two', 'three']]), 'threetwoone');
    eq(format('{quip.toUpperCase}', [{quip: R.always('Bazinga!')}]), 'BAZINGA!');
  });

  it("passes applicable tests from Python's test suite", function() {
    eq(format('', []), '');
    eq(format('abc', []), 'abc');
    eq(format('{0}', ['abc']), 'abc');
    eq(format('X{0}', ['abc']), 'Xabc');
    eq(format('{0}X', ['abc']), 'abcX');
    eq(format('X{0}Y', ['abc']), 'XabcY');
    eq(format('{1}', [1, 'abc']), 'abc');
    eq(format('X{1}', [1, 'abc']), 'Xabc');
    eq(format('{1}X', [1, 'abc']), 'abcX');
    eq(format('X{1}Y', [1, 'abc']), 'XabcY');
    eq(format('{0}', [-15]), '-15');
    eq(format('{0}{1}', [-15, 'abc']), '-15abc');
    eq(format('{0}X{1}', [-15, 'abc']), '-15Xabc');
    eq(format('{{', []), '{');
    eq(format('}}', []), '}');
    eq(format('{{}}', []), '{}');
    eq(format('{{x}}', []), '{x}');
    eq(format('{{{0}}}', [123]), '{123}');
    eq(format('{{{{0}}}}', []), '{{0}}');
    eq(format('}}{{', []), '}{');
    eq(format('}}x{{', []), '}x{');

    // computed format specifiers
    eq(format('{0:.{1}}', ['hello world', 5]), 'hello');
    eq(format('{0:.{1}s}', ['hello world', 5]), 'hello');
    eq(format('{1:.{precision}s}', [{precision: 5}, 'hello world']), 'hello');
    eq(format('{1:{width}.{precision}s}', [{width: 10, precision: 5}, 'hello world']), 'hello     ');
    eq(format('{1:{width}.{precision}s}', [{width: '10', precision: '5'}, 'hello world']), 'hello     ');

    // test various errors
    throws('ValueError', function() { format('{', []);              });
    throws('ValueError', function() { format('}', []);              });
    throws('ValueError', function() { format('a{', []);             });
    throws('ValueError', function() { format('a}', []);             });
    throws('ValueError', function() { format('{a', []);             });
    throws('ValueError', function() { format('}a', []);             });
    throws('KeyError',   function() { format('{0}', []);            });
    throws('KeyError',   function() { format('{1}', ['abc']);       });
    throws('KeyError',   function() { format('{x}', []);            });
    throws('ValueError', function() { format('}{', []);             });
    throws('ValueError', function() { format('abc{0:{}', []);       });
    throws('ValueError', function() { format('{0', []);             });
    throws('KeyError',   function() { format('{0.}', []);           });
    throws('KeyError',   function() { format('{0.}', [0]);          });
    throws('KeyError',   function() { format('{0[}', []);           });
    throws('KeyError',   function() { format('{0[}', [[]]);         });
    throws('KeyError',   function() { format('{0]}', []);           });
    throws('KeyError',   function() { format('{0.[]}', [0]);        });
    throws('KeyError',   function() { format('{0..foo}', [0]);      });
    throws('KeyError',   function() { format('{0[0}', [0]);         });
    throws('KeyError',   function() { format('{0[0:foo}', [0]);     });
    throws('KeyError',   function() { format('{c]}', []);           });
    throws('ValueError', function() { format('{{ {{{0}}', [0]);     });
    throws('ValueError', function() { format('{0}}', [0]);          });
    throws('KeyError',   function() { format('{foo}', [{bar: 3}]);  });
    throws('ValueError', function() { format('{0!x}', [3]);         });
    throws('ValueError', function() { format('{0!}', [0]);          });
    throws('ValueError', function() { format('{!}', []);            });
    throws('KeyError',   function() { format('{:}', []);            });
    throws('KeyError',   function() { format('{:s}', []);           });
    throws('KeyError',   function() { format('{}', []);             });

    // exceed maximum recursion depth
    throws('ValueError: Max string recursion exceeded',
           function() { format('{0:{1:{2}}}', ['abc', 's', '']); });
    throws('ValueError: Max string recursion exceeded',
           function() { format('{0:{1:{2:{3:{4:{5:{6}}}}}}}',
                               [0, 1, 2, 3, 4, 5, 6, 7]); });

    // string format spec errors
    throws('ValueError', function() { format('{0:-s}', ['']); });
    throws('ValueError', function() { format('{0:=s}', ['']); });
  });

  describe('format.create', function() {

    it('returns a format function with access to provided transformers', function() {
      var append = R.flip(R.concat);
      var formatA = format.create({x: append(' (formatA)')});
      var formatB = format.create({x: append(' (formatB)')});

      eq(formatA('{!x}', ['abc']), 'abc (formatA)');
      eq(formatB('{!x}', ['abc']), 'abc (formatB)');
    });

  });

  it('applies transformers to explicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = '{0}, you have {1} unread message{1!s}';
    eq($format(text, ['Steve', 1]), 'Steve, you have 1 unread message');
    eq($format(text, ['Holly', 2]), 'Holly, you have 2 unread messages');
  });

  it('applies transformers to implicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = 'The Cure{!s}, The Door{!s}, The Smith{!s}';
    eq($format(text, [1, 2, 3]), 'The Cure, The Doors, The Smiths');
  });

  it('applies transformers to properties of explicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = '<a href="/inbox">view message{0.length!s}</a>';
    eq($format(text, [new Array(1)]), '<a href="/inbox">view message</a>');
    eq($format(text, [new Array(2)]), '<a href="/inbox">view messages</a>');
  });

  it('applies transformers to properties of implicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = '<a href="/inbox">view message{length!s}</a>';
    eq($format(text, [new Array(1)]), '<a href="/inbox">view message</a>');
    eq($format(text, [new Array(2)]), '<a href="/inbox">view messages</a>');
  });

  it('throws a ValueError if no such transformer is defined', function() {
    throws('ValueError: no transformer named "toString"',
           function() { format('foo-{!toString:}-baz', ['bar']); });
    throws('ValueError: no transformer named "toString"',
           function() { format('foo-{!toString}-baz', ['bar']); });
    throws('ValueError: no transformer named ""',
           function() { format('foo-{!:}-baz', ['bar']); });
    throws('ValueError: end of format while looking for conversion specifier',
           function() { format('foo-{!}-baz', ['bar']); });
  });

  describe('format.extend', function() {

    it('defines String.prototype.format', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('Hello, {}!'.format('Alice'), 'Hello, Alice!');
      delete String.prototype.format;
    });

    it('defines "format" method on arbitrary object', function() {
      var prototype = {};
      format.extend(prototype, {});
      eq(typeof String.prototype.format, 'undefined');
      eq(typeof prototype.format, 'function');
      eq(prototype.format.call('Hello, {}!', 'Alice'), 'Hello, Alice!');
    });

  });

  it('throws a ValueError if format specifier contains unused characters', function() {
    throws('ValueError: Invalid conversion specification',
           function() { format('{:ff}', [42]); });
  });

  it('tests:type', function() {
    eq(format('{:}', ['abc']), 'abc');
    eq(format('{:s}', ['abc']), 'abc');

    eq(format('{:}', [42]), '42');
    eq(format('{:c}', [42]), '*');
    eq(format('{:d}', [42]), '42');
    eq(format('{:b}', [42]), '101010');
    eq(format('{:o}', [42]), '52');
    eq(format('{:x}', [42]), '2a');
    eq(format('{:X}', [42]), '2A');
    eq(format('{:e}', [42]), '4.200000e+01');
    eq(format('{:E}', [42]), '4.200000E+01');
    eq(format('{:f}', [42]), '42.000000');
    eq(format('{:g}', [42]), '42');
    eq(format('{:G}', [42]), '42');
    eq(format('{:%}', [42]), '4200.000000%');

    eq(format('{:}', [3.14]), '3.14');
    eq(format('{:e}', [3.14]), '3.140000e+00');
    eq(format('{:E}', [3.14]), '3.140000E+00');
    eq(format('{:f}', [3.14]), '3.140000');
    eq(format('{:g}', [3.14]), '3.14');
    eq(format('{:G}', [3.14]), '3.14');
    eq(format('{:%}', [3.14]), '314.000000%');

    throws('ValueError: cannot format non-integer with format specifier "c"',
           function() { format('{:c}', [3.14]); });

    throws('ValueError: cannot format non-integer with format specifier "d"',
           function() { format('{:d}', [3.14]); });

    throws('ValueError: cannot format non-integer with format specifier "b"',
           function() { format('{:b}', [3.14]); });

    throws('ValueError: cannot format non-integer with format specifier "o"',
           function() { format('{:o}', [3.14]); });

    throws('ValueError: cannot format non-integer with format specifier "x"',
           function() { format('{:x}', [3.14]); });

    throws('ValueError: cannot format non-integer with format specifier "X"',
           function() { format('{:X}', [3.14]); });

    eq(format('{:}', [[1, 2, 3]]), '1,2,3');
  });

  it('tests:align', function() {
    eq(format('{:<1s}', ['abc']),  'abc');
    eq(format('{:<8s}', ['abc']),  'abc     ');
    eq(format('{:<15s}', ['abc']), 'abc            ');

    eq(format('{:^1s}', ['abc']),  'abc');
    eq(format('{:^8s}', ['abc']),  '  abc   ');
    eq(format('{:^15s}', ['abc']), '      abc      ');

    eq(format('{:>1s}', ['abc']),  'abc');
    eq(format('{:>8s}', ['abc']),  '     abc');
    eq(format('{:>15s}', ['abc']), '            abc');

    throws('ValueError: "=" alignment not allowed in string format specifier',
           function() { format('{:=}', ['abc']); });
    throws('ValueError: "=" alignment not allowed in string format specifier',
           function() { format('{:=s}', ['abc']); });

    eq(format('{:<1c}', [42]),   '*');
    eq(format('{:<8c}', [42]),   '*       ');
    eq(format('{:<15c}', [42]),  '*              ');

    eq(format('{:^1c}', [42]),   '*');
    eq(format('{:^8c}', [42]),   '   *    ');
    eq(format('{:^15c}', [42]),  '       *       ');

    eq(format('{:>1c}', [42]),   '*');
    eq(format('{:>8c}', [42]),   '       *');
    eq(format('{:>15c}', [42]),  '              *');

    eq(format('{:=1c}', [42]),   '*');
    eq(format('{:=8c}', [42]),   '       *');
    eq(format('{:=15c}', [42]),  '              *');

    eq(format('{:<1d}', [-42]),  '-42');
    eq(format('{:<1b}', [-42]),  '-101010');
    eq(format('{:<1o}', [-42]),  '-52');
    eq(format('{:<1x}', [-42]),  '-2a');

    eq(format('{:^1d}', [-42]),  '-42');
    eq(format('{:^1b}', [-42]),  '-101010');
    eq(format('{:^1o}', [-42]),  '-52');
    eq(format('{:^1x}', [-42]),  '-2a');

    eq(format('{:>1d}', [-42]),  '-42');
    eq(format('{:>1b}', [-42]),  '-101010');
    eq(format('{:>1o}', [-42]),  '-52');
    eq(format('{:>1x}', [-42]),  '-2a');

    eq(format('{:=1d}', [-42]),  '-42');
    eq(format('{:=1b}', [-42]),  '-101010');
    eq(format('{:=1o}', [-42]),  '-52');
    eq(format('{:=1x}', [-42]),  '-2a');

    eq(format('{:<8d}', [-42]),  '-42     ');
    eq(format('{:<8b}', [-42]),  '-101010 ');
    eq(format('{:<8o}', [-42]),  '-52     ');
    eq(format('{:<8x}', [-42]),  '-2a     ');

    eq(format('{:^8d}', [-42]),  '  -42   ');
    eq(format('{:^8b}', [-42]),  '-101010 ');
    eq(format('{:^8o}', [-42]),  '  -52   ');
    eq(format('{:^8x}', [-42]),  '  -2a   ');

    eq(format('{:>8d}', [-42]),  '     -42');
    eq(format('{:>8b}', [-42]),  ' -101010');
    eq(format('{:>8o}', [-42]),  '     -52');
    eq(format('{:>8x}', [-42]),  '     -2a');

    eq(format('{:=8d}', [-42]),  '-     42');
    eq(format('{:=8b}', [-42]),  '- 101010');
    eq(format('{:=8o}', [-42]),  '-     52');
    eq(format('{:=8x}', [-42]),  '-     2a');

    eq(format('{:<15d}', [-42]), '-42            ');
    eq(format('{:<15b}', [-42]), '-101010        ');
    eq(format('{:<15o}', [-42]), '-52            ');
    eq(format('{:<15x}', [-42]), '-2a            ');

    eq(format('{:^15d}', [-42]), '      -42      ');
    eq(format('{:^15b}', [-42]), '    -101010    ');
    eq(format('{:^15o}', [-42]), '      -52      ');
    eq(format('{:^15x}', [-42]), '      -2a      ');

    eq(format('{:>15d}', [-42]), '            -42');
    eq(format('{:>15b}', [-42]), '        -101010');
    eq(format('{:>15o}', [-42]), '            -52');
    eq(format('{:>15x}', [-42]), '            -2a');

    eq(format('{:=15d}', [-42]), '-            42');
    eq(format('{:=15b}', [-42]), '-        101010');
    eq(format('{:=15o}', [-42]), '-            52');
    eq(format('{:=15x}', [-42]), '-            2a');

    eq(format('{:<1}', [-42]),   '-42');
    eq(format('{:<1e}', [-42]),  '-4.200000e+01');
    eq(format('{:<1f}', [-42]),  '-42.000000');
    eq(format('{:<1g}', [-42]),  '-42');
    eq(format('{:<1%}', [-42]),  '-4200.000000%');

    eq(format('{:^1}', [-42]),   '-42');
    eq(format('{:^1e}', [-42]),  '-4.200000e+01');
    eq(format('{:^1f}', [-42]),  '-42.000000');
    eq(format('{:^1g}', [-42]),  '-42');
    eq(format('{:^1%}', [-42]),  '-4200.000000%');

    eq(format('{:>1}', [-42]),   '-42');
    eq(format('{:>1e}', [-42]),  '-4.200000e+01');
    eq(format('{:>1f}', [-42]),  '-42.000000');
    eq(format('{:>1g}', [-42]),  '-42');
    eq(format('{:>1%}', [-42]),  '-4200.000000%');

    eq(format('{:=1}', [-42]),   '-42');
    eq(format('{:=1e}', [-42]),  '-4.200000e+01');
    eq(format('{:=1f}', [-42]),  '-42.000000');
    eq(format('{:=1g}', [-42]),  '-42');
    eq(format('{:=1%}', [-42]),  '-4200.000000%');

    eq(format('{:<8}', [-42]),   '-42     ');
    eq(format('{:<8e}', [-42]),  '-4.200000e+01');
    eq(format('{:<8f}', [-42]),  '-42.000000');
    eq(format('{:<8g}', [-42]),  '-42     ');
    eq(format('{:<8%}', [-42]),  '-4200.000000%');

    eq(format('{:^8}', [-42]),   '  -42   ');
    eq(format('{:^8e}', [-42]),  '-4.200000e+01');
    eq(format('{:^8f}', [-42]),  '-42.000000');
    eq(format('{:^8g}', [-42]),  '  -42   ');
    eq(format('{:^8%}', [-42]),  '-4200.000000%');

    eq(format('{:>8}', [-42]),   '     -42');
    eq(format('{:>8e}', [-42]),  '-4.200000e+01');
    eq(format('{:>8f}', [-42]),  '-42.000000');
    eq(format('{:>8g}', [-42]),  '     -42');
    eq(format('{:>8%}', [-42]),  '-4200.000000%');

    eq(format('{:=8}', [-42]),   '-     42');
    eq(format('{:=8e}', [-42]),  '-4.200000e+01');
    eq(format('{:=8f}', [-42]),  '-42.000000');
    eq(format('{:=8g}', [-42]),  '-     42');
    eq(format('{:=8%}', [-42]),  '-4200.000000%');

    eq(format('{:<15}', [-42]),  '-42            ');
    eq(format('{:<15e}', [-42]), '-4.200000e+01  ');
    eq(format('{:<15f}', [-42]), '-42.000000     ');
    eq(format('{:<15g}', [-42]), '-42            ');
    eq(format('{:<15%}', [-42]), '-4200.000000%  ');

    eq(format('{:^15}', [-42]),  '      -42      ');
    eq(format('{:^15e}', [-42]), ' -4.200000e+01 ');
    eq(format('{:^15f}', [-42]), '  -42.000000   ');
    eq(format('{:^15g}', [-42]), '      -42      ');
    eq(format('{:^15%}', [-42]), ' -4200.000000% ');

    eq(format('{:>15}', [-42]),  '            -42');
    eq(format('{:>15e}', [-42]), '  -4.200000e+01');
    eq(format('{:>15f}', [-42]), '     -42.000000');
    eq(format('{:>15g}', [-42]), '            -42');
    eq(format('{:>15%}', [-42]), '  -4200.000000%');

    eq(format('{:=15}', [-42]),  '-            42');
    eq(format('{:=15e}', [-42]), '-  4.200000e+01');
    eq(format('{:=15f}', [-42]), '-     42.000000');
    eq(format('{:=15g}', [-42]), '-            42');
    eq(format('{:=15%}', [-42]), '-  4200.000000%');
  });

  it('tests:fill+align', function() {
    eq(format('{:*<1}', ['abc']),   'abc');
    eq(format('{:*<1s}', ['abc']),  'abc');
    eq(format('{:*<8}', ['abc']),   'abc*****');
    eq(format('{:*<8s}', ['abc']),  'abc*****');
    eq(format('{:*<15}', ['abc']),  'abc************');
    eq(format('{:*<15s}', ['abc']), 'abc************');

    eq(format('{:*^1}', ['abc']),   'abc');
    eq(format('{:*^1s}', ['abc']),  'abc');
    eq(format('{:*^8}', ['abc']),   '**abc***');
    eq(format('{:*^8s}', ['abc']),  '**abc***');
    eq(format('{:*^15}', ['abc']),  '******abc******');
    eq(format('{:*^15s}', ['abc']), '******abc******');

    eq(format('{:*>1}', ['abc']),   'abc');
    eq(format('{:*>1s}', ['abc']),  'abc');
    eq(format('{:*>8}', ['abc']),   '*****abc');
    eq(format('{:*>8s}', ['abc']),  '*****abc');
    eq(format('{:*>15}', ['abc']),  '************abc');
    eq(format('{:*>15s}', ['abc']), '************abc');

    eq(format('{:-<15c}', [42]), '*--------------');
    eq(format('{:-^15c}', [42]), '-------*-------');
    eq(format('{:->15c}', [42]), '--------------*');
    eq(format('{:-=15c}', [42]), '--------------*');

    eq(format('{:*<15d}', [-42]), '-42************');
    eq(format('{:*<15b}', [-42]), '-101010********');
    eq(format('{:*<15o}', [-42]), '-52************');
    eq(format('{:*<15x}', [-42]), '-2a************');

    eq(format('{:*^15d}', [-42]), '******-42******');
    eq(format('{:*^15b}', [-42]), '****-101010****');
    eq(format('{:*^15o}', [-42]), '******-52******');
    eq(format('{:*^15x}', [-42]), '******-2a******');

    eq(format('{:*>15d}', [-42]), '************-42');
    eq(format('{:*>15b}', [-42]), '********-101010');
    eq(format('{:*>15o}', [-42]), '************-52');
    eq(format('{:*>15x}', [-42]), '************-2a');

    eq(format('{:0=15d}', [-42]), '-00000000000042');
    eq(format('{:0=15b}', [-42]), '-00000000101010');
    eq(format('{:0=15o}', [-42]), '-00000000000052');
    eq(format('{:0=15x}', [-42]), '-0000000000002a');

    eq(format('{:*<15}', [-42]),  '-42************');
    eq(format('{:*<15e}', [-42]), '-4.200000e+01**');
    eq(format('{:*<15E}', [-42]), '-4.200000E+01**');
    eq(format('{:*<15f}', [-42]), '-42.000000*****');
    eq(format('{:*<15g}', [-42]), '-42************');
    eq(format('{:*<15G}', [-42]), '-42************');
    eq(format('{:*<15%}', [-42]), '-4200.000000%**');

    eq(format('{:*^15}', [-42]),  '******-42******');
    eq(format('{:*^15e}', [-42]), '*-4.200000e+01*');
    eq(format('{:*^15E}', [-42]), '*-4.200000E+01*');
    eq(format('{:*^15f}', [-42]), '**-42.000000***');
    eq(format('{:*^15g}', [-42]), '******-42******');
    eq(format('{:*^15G}', [-42]), '******-42******');
    eq(format('{:*^15%}', [-42]), '*-4200.000000%*');

    eq(format('{:*>15}', [-42]),  '************-42');
    eq(format('{:*>15e}', [-42]), '**-4.200000e+01');
    eq(format('{:*>15E}', [-42]), '**-4.200000E+01');
    eq(format('{:*>15f}', [-42]), '*****-42.000000');
    eq(format('{:*>15g}', [-42]), '************-42');
    eq(format('{:*>15G}', [-42]), '************-42');
    eq(format('{:*>15%}', [-42]), '**-4200.000000%');

    eq(format('{:0=15}', [-42]),  '-00000000000042');
    eq(format('{:0=15e}', [-42]), '-004.200000e+01');
    eq(format('{:0=15E}', [-42]), '-004.200000E+01');
    eq(format('{:0=15f}', [-42]), '-0000042.000000');
    eq(format('{:0=15g}', [-42]), '-00000000000042');
    eq(format('{:0=15G}', [-42]), '-00000000000042');
    eq(format('{:0=15%}', [-42]), '-004200.000000%');
  });

  it('tests:sign', function() {
    throws('ValueError: Sign not allowed in string format specifier',
           function() { format('{:+}', ['abc']); });
    throws('ValueError: Sign not allowed in string format specifier',
           function() { format('{:+s}', ['abc']); });

    throws("ValueError: Sign not allowed with integer format specifier 'c'",
           function() { format('{:+c}', [42]); });

    eq(format('{:-d}',  [42]),  '42');
    eq(format('{:-d}', [-42]), '-42');
    eq(format('{: d}',  [42]), ' 42');
    eq(format('{: d}', [-42]), '-42');
    eq(format('{:+d}',  [42]), '+42');
    eq(format('{:+d}', [-42]), '-42');

    eq(format('{:-b}',  [42]),  '101010');
    eq(format('{:-b}', [-42]), '-101010');
    eq(format('{: b}',  [42]), ' 101010');
    eq(format('{: b}', [-42]), '-101010');
    eq(format('{:+b}',  [42]), '+101010');
    eq(format('{:+b}', [-42]), '-101010');

    eq(format('{:-o}',  [42]),  '52');
    eq(format('{:-o}', [-42]), '-52');
    eq(format('{: o}',  [42]), ' 52');
    eq(format('{: o}', [-42]), '-52');
    eq(format('{:+o}',  [42]), '+52');
    eq(format('{:+o}', [-42]), '-52');

    eq(format('{:-x}',  [42]),  '2a');
    eq(format('{:-x}', [-42]), '-2a');
    eq(format('{: x}',  [42]), ' 2a');
    eq(format('{: x}', [-42]), '-2a');
    eq(format('{:+x}',  [42]), '+2a');
    eq(format('{:+x}', [-42]), '-2a');

    eq(format('{:-}',  [42]),   '42');
    eq(format('{:-}', [-42]),  '-42');
    eq(format('{: }',  [42]),  ' 42');
    eq(format('{: }', [-42]),  '-42');
    eq(format('{:+}',  [42]),  '+42');
    eq(format('{:+}', [-42]),  '-42');

    eq(format('{:-e}',  [42]),  '4.200000e+01');
    eq(format('{:-e}', [-42]), '-4.200000e+01');
    eq(format('{: e}',  [42]), ' 4.200000e+01');
    eq(format('{: e}', [-42]), '-4.200000e+01');
    eq(format('{:+e}',  [42]), '+4.200000e+01');
    eq(format('{:+e}', [-42]), '-4.200000e+01');

    eq(format('{:-f}',  [42]),  '42.000000');
    eq(format('{:-f}', [-42]), '-42.000000');
    eq(format('{: f}',  [42]), ' 42.000000');
    eq(format('{: f}', [-42]), '-42.000000');
    eq(format('{:+f}',  [42]), '+42.000000');
    eq(format('{:+f}', [-42]), '-42.000000');

    eq(format('{:-g}',  [42]),  '42');
    eq(format('{:-g}', [-42]), '-42');
    eq(format('{: g}',  [42]), ' 42');
    eq(format('{: g}', [-42]), '-42');
    eq(format('{:+g}',  [42]), '+42');
    eq(format('{:+g}', [-42]), '-42');

    eq(format('{:-%}',  [42]),  '4200.000000%');
    eq(format('{:-%}', [-42]), '-4200.000000%');
    eq(format('{: %}',  [42]), ' 4200.000000%');
    eq(format('{: %}', [-42]), '-4200.000000%');
    eq(format('{:+%}',  [42]), '+4200.000000%');
    eq(format('{:+%}', [-42]), '-4200.000000%');
  });

  it('tests:#', function() {
    throws('ValueError: Alternate form (#) not allowed in string format specifier',
           function() { format('{:#}', ['abc']); });
    throws('ValueError: Alternate form (#) not allowed in string format specifier',
           function() { format('{:#s}', ['abc']); });

    eq(format('{:#}', [42]),  '42');
    eq(format('{:#c}', [42]), '*');
    eq(format('{:#d}', [42]), '42');
    eq(format('{:#b}', [42]), '0b101010');
    eq(format('{:#o}', [42]), '0o52');
    eq(format('{:#x}', [42]), '0x2a');
    eq(format('{:#X}', [42]), '0X2A');
  });

  it('tests:0', function() {
    throws('ValueError: "=" alignment not allowed in string format specifier',
           function() { format('{:0}', ['abc']); });
    throws('ValueError: "=" alignment not allowed in string format specifier',
           function() { format('{:0s}', ['abc']); });

    eq(format('{:0c}', [42]),  '*');
    eq(format('{:0d}', [-42]), '-42');
    eq(format('{:0b}', [-42]), '-101010');
    eq(format('{:0o}', [-42]), '-52');
    eq(format('{:0x}', [-42]), '-2a');
    eq(format('{:0X}', [-42]), '-2A');

    eq(format('{:0}', [-42]),  '-42');
    eq(format('{:0e}', [-42]), '-4.200000e+01');
    eq(format('{:0E}', [-42]), '-4.200000E+01');
    eq(format('{:0f}', [-42]), '-42.000000');
    eq(format('{:0g}', [-42]), '-42');
    eq(format('{:0G}', [-42]), '-42');
    eq(format('{:0%}', [-42]), '-4200.000000%');

    eq(format('{:08c}', [42]),  '0000000*');
    eq(format('{:08d}', [-42]), '-0000042');
    eq(format('{:08b}', [-42]), '-0101010');
    eq(format('{:08o}', [-42]), '-0000052');
    eq(format('{:08x}', [-42]), '-000002a');
    eq(format('{:08X}', [-42]), '-000002A');

    eq(format('{:08}', [-42]),  '-0000042');
    eq(format('{:08e}', [-42]), '-4.200000e+01');
    eq(format('{:08E}', [-42]), '-4.200000E+01');
    eq(format('{:08f}', [-42]), '-42.000000');
    eq(format('{:08g}', [-42]), '-0000042');
    eq(format('{:08G}', [-42]), '-0000042');
    eq(format('{:08%}', [-42]), '-4200.000000%');

    eq(format('{:015c}', [42]),  '00000000000000*');
    eq(format('{:015d}', [-42]), '-00000000000042');
    eq(format('{:015b}', [-42]), '-00000000101010');
    eq(format('{:015o}', [-42]), '-00000000000052');
    eq(format('{:015x}', [-42]), '-0000000000002a');
    eq(format('{:015X}', [-42]), '-0000000000002A');

    eq(format('{:015}', [-42]),  '-00000000000042');
    eq(format('{:015e}', [-42]), '-004.200000e+01');
    eq(format('{:015E}', [-42]), '-004.200000E+01');
    eq(format('{:015f}', [-42]), '-0000042.000000');
    eq(format('{:015g}', [-42]), '-00000000000042');
    eq(format('{:015G}', [-42]), '-00000000000042');
    eq(format('{:015%}', [-42]), '-004200.000000%');
  });

  it('tests:width', function() {
    eq(format('{:1}', ['abc']),   'abc');
    eq(format('{:1s}', ['abc']),  'abc');
    eq(format('{:8}', ['abc']),   'abc     ');
    eq(format('{:8s}', ['abc']),  'abc     ');
    eq(format('{:15}', ['abc']),  'abc            ');
    eq(format('{:15s}', ['abc']), 'abc            ');

    eq(format('{:1c}', [42]),  '*');
    eq(format('{:1d}', [42]),  '42');
    eq(format('{:1b}', [42]),  '101010');
    eq(format('{:1o}', [42]),  '52');
    eq(format('{:1x}', [42]),  '2a');
    eq(format('{:1X}', [42]),  '2A');

    eq(format('{:1}', [42]),   '42');
    eq(format('{:1e}', [42]),  '4.200000e+01');
    eq(format('{:1E}', [42]),  '4.200000E+01');
    eq(format('{:1f}', [42]),  '42.000000');
    eq(format('{:1g}', [42]),  '42');
    eq(format('{:1G}', [42]),  '42');
    eq(format('{:1%}', [42]),  '4200.000000%');

    eq(format('{:8c}', [42]),  '       *');
    eq(format('{:8d}', [42]),  '      42');
    eq(format('{:8b}', [42]),  '  101010');
    eq(format('{:8o}', [42]),  '      52');
    eq(format('{:8x}', [42]),  '      2a');
    eq(format('{:8X}', [42]),  '      2A');

    eq(format('{:8}', [42]),   '      42');
    eq(format('{:8e}', [42]),  '4.200000e+01');
    eq(format('{:8E}', [42]),  '4.200000E+01');
    eq(format('{:8f}', [42]),  '42.000000');
    eq(format('{:8g}', [42]),  '      42');
    eq(format('{:8G}', [42]),  '      42');
    eq(format('{:8%}', [42]),  '4200.000000%');

    eq(format('{:15c}', [42]), '              *');
    eq(format('{:15d}', [42]), '             42');
    eq(format('{:15b}', [42]), '         101010');
    eq(format('{:15o}', [42]), '             52');
    eq(format('{:15x}', [42]), '             2a');
    eq(format('{:15X}', [42]), '             2A');

    eq(format('{:15}', [42]),  '             42');
    eq(format('{:15e}', [42]), '   4.200000e+01');
    eq(format('{:15E}', [42]), '   4.200000E+01');
    eq(format('{:15f}', [42]), '      42.000000');
    eq(format('{:15g}', [42]), '             42');
    eq(format('{:15G}', [42]), '             42');
    eq(format('{:15%}', [42]), '   4200.000000%');
  });

  it('tests:,', function() {
    throws("ValueError: Cannot specify ',' with 's'",
           function() { format('{:,}', ['abc']); });
    throws("ValueError: Cannot specify ',' with 's'",
           function() { format('{:,s}', ['abc']); });
    throws("ValueError: Cannot specify ',' with 'c'",
           function() { format('{:,c}', [42]); });
    throws("ValueError: Cannot specify ',' with 'b'",
           function() { format('{:,b}', [42]); });
    throws("ValueError: Cannot specify ',' with 'o'",
           function() { format('{:,o}', [42]); });
    throws("ValueError: Cannot specify ',' with 'x'",
           function() { format('{:,x}', [42]); });
    throws("ValueError: Cannot specify ',' with 'X'",
           function() { format('{:,X}', [42]); });

    eq(format('{:,}', [1234567.89]),  '1,234,567.89');
    eq(format('{:,d}', [1234567]),    '1,234,567');
    eq(format('{:,e}', [1234567.89]), '1.234568e+06');
    eq(format('{:,E}', [1234567.89]), '1.234568E+06');
    eq(format('{:,f}', [1234567.89]), '1,234,567.890000');
    eq(format('{:,g}', [1234567.89]), '1.23457e+06');
    eq(format('{:,G}', [1234567.89]), '1.23457E+06');
    eq(format('{:,%}', [1234567.89]), '123,456,789.000000%');
  });

  it('tests:precision', function() {
    eq(format('{:.0}', ['abc']), '');
    eq(format('{:.1}', ['abc']), 'a');
    eq(format('{:.2}', ['abc']), 'ab');
    eq(format('{:.3}', ['abc']), 'abc');
    eq(format('{:.4}', ['abc']), 'abc');

    eq(format('{:.0s}', ['abc']), '');
    eq(format('{:.1s}', ['abc']), 'a');
    eq(format('{:.2s}', ['abc']), 'ab');
    eq(format('{:.3s}', ['abc']), 'abc');
    eq(format('{:.4s}', ['abc']), 'abc');

    throws('ValueError: Precision not allowed in integer format specifier',
           function() { format('{:.4c}', [42]); });

    throws('ValueError: Precision not allowed in integer format specifier',
           function() { format('{:.4d}', [42]); });

    throws('ValueError: Precision not allowed in integer format specifier',
           function() { format('{:.4b}', [42]); });

    throws('ValueError: Precision not allowed in integer format specifier',
           function() { format('{:.4o}', [42]); });

    throws('ValueError: Precision not allowed in integer format specifier',
           function() { format('{:.4x}', [42]); });

    throws('ValueError: Precision not allowed in integer format specifier',
           function() { format('{:.4X}', [42]); });

    eq(format('{:.0}', [3.14]), '3');
    eq(format('{:.1}', [3.14]), '3');
    eq(format('{:.2}', [3.14]), '3.1');
    eq(format('{:.3}', [3.14]), '3.14');
    eq(format('{:.4}', [3.14]), '3.14');

    eq(format('{:.0e}', [3.14]), '3e+00');
    eq(format('{:.1e}', [3.14]), '3.1e+00');
    eq(format('{:.2e}', [3.14]), '3.14e+00');
    eq(format('{:.3e}', [3.14]), '3.140e+00');
    eq(format('{:.4e}', [3.14]), '3.1400e+00');

    eq(format('{:.0E}', [3.14]), '3E+00');
    eq(format('{:.1E}', [3.14]), '3.1E+00');
    eq(format('{:.2E}', [3.14]), '3.14E+00');
    eq(format('{:.3E}', [3.14]), '3.140E+00');
    eq(format('{:.4E}', [3.14]), '3.1400E+00');

    eq(format('{:.0f}', [3.14]), '3');
    eq(format('{:.1f}', [3.14]), '3.1');
    eq(format('{:.2f}', [3.14]), '3.14');
    eq(format('{:.3f}', [3.14]), '3.140');
    eq(format('{:.4f}', [3.14]), '3.1400');

    eq(format('{:.0g}', [3.14]), '3');
    eq(format('{:.1g}', [3.14]), '3');
    eq(format('{:.2g}', [3.14]), '3.1');
    eq(format('{:.3g}', [3.14]), '3.14');
    eq(format('{:.4g}', [3.14]), '3.14');

    eq(format('{:.0G}', [3.14]), '3');
    eq(format('{:.1G}', [3.14]), '3');
    eq(format('{:.2G}', [3.14]), '3.1');
    eq(format('{:.3G}', [3.14]), '3.14');
    eq(format('{:.4G}', [3.14]), '3.14');

    throws('ValueError: Format specifier missing precision',
           function() { format('{:.f}', [3.14]); });
  });

  it('asdf 1', function() {
    eq(format('{0.@#$.%^&}', [{'@#$': {'%^&': 42}}]), '42');
  });

  it('asdf 2', function() {
    format.extend(String.prototype, {'@#$': R.always('xyz')});
    eq('{!@#$}'.format('abc'), 'xyz');
    delete String.prototype.format;
  });

  it('asdf 3', function() {
    eq(format('{:d}', [0]),         '0');
    eq(format('{:d}', [-0]),        '-0');
    eq(format('{:d}', [Infinity]),  'Infinity');
    eq(format('{:d}', [-Infinity]), '-Infinity');
    eq(format('{:d}', [NaN]),       'NaN');

    eq(format('{}', [0]),           '0');
    eq(format('{}', [-0]),          '-0');
    eq(format('{}', [Infinity]),    'Infinity');
    eq(format('{}', [-Infinity]),   '-Infinity');
    eq(format('{}', [NaN]),         'NaN');

    eq(format('{:f}', [0]),         '0.000000');
    eq(format('{:f}', [-0]),        '-0.000000');
    eq(format('{:f}', [Infinity]),  'Infinity');
    eq(format('{:f}', [-Infinity]), '-Infinity');
    eq(format('{:f}', [NaN]),       'NaN');
  });

  it('allows "," to be used as a thousands separator', function() {
    eq(format('{:,}', [42]),             '42');
    eq(format('{:,}', [420]),           '420');
    eq(format('{:,}', [4200]),        '4,200');
    eq(format('{:,}', [42000]),      '42,000');
    eq(format('{:,}', [420000]),    '420,000');
    eq(format('{:,}', [4200000]), '4,200,000');

    eq(format('{:00,}', [42]),           '42');
    eq(format('{:01,}', [42]),           '42');
    eq(format('{:02,}', [42]),           '42');
    eq(format('{:03,}', [42]),          '042');
    eq(format('{:04,}', [42]),        '0,042');
    eq(format('{:05,}', [42]),        '0,042');
    eq(format('{:06,}', [42]),       '00,042');
    eq(format('{:07,}', [42]),      '000,042');
    eq(format('{:08,}', [42]),    '0,000,042');
    eq(format('{:09,}', [42]),    '0,000,042');
    eq(format('{:010,}', [42]),  '00,000,042');
  });

  it('allows non-string, non-number arguments', function() {
    throws('ValueError: non-empty format string for Array object',
           function() { format('{:,}', [[1, 2, 3]]); });

    throws('ValueError: non-empty format string for Array object',
           function() { format('{:z}', [[1, 2, 3]]); });
  });

  it('throws if a number is passed to a string formatter', function() {
    throws("ValueError: Unknown format code 's' for object of type 'float'",
           function() { format('{:s}', [42]); });
  });

  it('throws if a string is passed to a number formatter', function() {
    throws('ValueError: unknown format code "c" for String object',
           function() { format('{:c}', ['42']); });

    throws('ValueError: unknown format code "d" for String object',
           function() { format('{:d}', ['42']); });

    throws('ValueError: unknown format code "b" for String object',
           function() { format('{:b}', ['42']); });

    throws('ValueError: unknown format code "o" for String object',
           function() { format('{:o}', ['42']); });

    throws('ValueError: unknown format code "x" for String object',
           function() { format('{:x}', ['42']); });

    throws('ValueError: unknown format code "X" for String object',
           function() { format('{:X}', ['42']); });

    throws('ValueError: unknown format code "f" for String object',
           function() { format('{:f}', ['42']); });

    throws('ValueError: unknown format code "e" for String object',
           function() { format('{:e}', ['42']); });

    throws('ValueError: unknown format code "E" for String object',
           function() { format('{:E}', ['42']); });

    throws('ValueError: unknown format code "g" for String object',
           function() { format('{:g}', ['42']); });

    throws('ValueError: unknown format code "G" for String object',
           function() { format('{:G}', ['42']); });

    throws('ValueError: unknown format code "%" for String object',
           function() { format('{:%}', ['42']); });
  });

  it('provides a format function when "required"', function() {
    eq(format("The name's {1}. {0} {1}.", ['James', 'Bond']),
       "The name's Bond. James Bond.");
  });

  it('asdf 4', function() {
    throws('ValueError: ' +
           'Alternate form (#) not allowed in float format specifier',
           function() { format('{:#%}', [42]); });
  });

  var random_spec = function(types) {
    var align     = sample(['', '<', '>', '=', '^']);
    var fill      = sample(['', String.fromCharCode(random(0x20, 0x7E))]);
    var sign      = sample(['', '+', '-', ' ']);
    var hash      = sample(['', '#']);
    var zero      = sample(['', '0']);
    var width     = sample(['', String(random(0, 24))]);
    var comma     = sample(['', ',']);
    var precision = sample(['', '.' + String(random(0, 13))]);
    var type      = sample(types);

    var spec =
      fill + align + sign + hash + zero + width + comma + precision + type;

    if (random(1, 10) < 10) {
      return spec;
    } else {
      // Replace one character at random to test error handling.
      var chars = spec.split('');
      chars[random(0, chars.length - 1)] = String.fromCharCode(0x20, 0x7E);
      return chars.join('');
    }
  };

  //  fromError :: Error -> String
  var fromError = R.pipe(
    R.prop('message'),
    R.split(/^/m),
    R.last,
    R.replace(/\n$/, ''),
    R.replace(/\.$/, '')
  );

  it('matches the Python implementation (float)', function(done) {
    var specs = R.map(function() {
      return random_spec(['e', 'E', 'f', 'F', 'g', 'G', '%']);
    }, R.range(0, 1000));

    var recur = function recur() {
      if (specs.length > 0) {
        var spec = specs.pop();
        var n = random(1, sample([10, 1000000])) /
                random(1, sample([10, 1000000]));
        var thunk = function() { return format('{:' + spec + '}', [n]); };
        var cmd =
          'python -c \u0027' +
          'import sys; ' +
          'sys.stdout.write("{0:' +
          spec.replace(/['"]/g, function(c) {
            return '\\x' + c.charCodeAt(0).toString(16);
          }) +
          '}".format(' + n + '))\u0027';
        console.log(cmd);

        exec(cmd, function(err, stdout) {
          if (err == null) {
            eq(thunk(), String(stdout));
          } else {
            throws(fromError(err), thunk);
          }
          recur();
        });
      } else {
        done();
      }
    };
    recur();
  });

  it.skip('matches the Python implementation (int)', function(done) {
    var specs = R.map(function() {
      return random_spec(['b', 'c', 'd', 'o', 'x', 'X']);
    }, R.range(0, 1000));

    var recur = function recur() {
      if (specs.length > 0) {
        var spec = specs.pop();
        var thunk = function() { return format('{:' + spec + '}', [42]); };
        console.log("      format('{:" + spec.replace(/'/g, '\\$&') + "}', [42])");
        exec(
          "python -c 'import sys; sys.stdout.write(\"{:" + spec.replace(/"/g, '\\$&').replace(/'/g, '$&"$&"$&') + "}\".format(42))'",
          function(err, stdout) {
            if (err == null) {
              eq(thunk(),
                 String(stdout),
                 "format('{:" + spec + "}', [42]) === '" + stdout.replace(/'/g, '\\$&') + "'");
            } else {
              throws(fromError(err), thunk, "format('{:" + spec + "}', [42])");
            }
            recur();
          }
        );
      } else {
        done();
      }
    };
    recur();
  });

});
