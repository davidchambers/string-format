'use strict';

/* global describe, it */
/* jshint maxlen: 999, node: true */

var assert = require('assert');

var R = require('ramda');

var format = require('..');


var eq = assert.strictEqual;

var s = function(num) { return num === 1 ? '' : 's'; };


describe('format', function() {

  it('is a function with "create" and "extend" functions', function() {
    eq(typeof format, 'function');
    eq(typeof format.create, 'function');
    eq(typeof format.extend, 'function');
  });

  it('interpolates positional arguments', function() {
    eq(format('{0}, you have {1} unread message{2}', 'Holly', 2, 's'),
       'Holly, you have 2 unread messages');
  });

  it('strips unmatched placeholders', function() {
    eq(format('{0}, you have {1} unread message{2}', 'Steve', 1),
       'Steve, you have 1 unread message');
  });

  it('allows indexes to be omitted if they are entirely sequential', function() {
    eq(format('{}, you have {} unread message{}', 'Steve', 1),
       'Steve, you have 1 unread message');
  });

  it('replaces all occurrences of a placeholder', function() {
    eq(format('the meaning of life is {0} ({1} x {2} is also {0})', 42, 6, 7),
       'the meaning of life is 42 (6 x 7 is also 42)');
  });

  it('does not allow explicit and implicit numbering to be intermingled', function() {
    assert.throws(
      function() { format('{} {0}', 'foo', 'bar'); },
      function(err) {
        return err instanceof Error &&
               err.name === 'ValueError' &&
               err.message === 'cannot switch from ' +
                               'implicit to explicit numbering';
      }
    );
    assert.throws(
      function() { format('{1} {}', 'foo', 'bar'); },
      function(err) {
        return err instanceof Error &&
               err.name === 'ValueError' &&
               err.message === 'cannot switch from ' +
                               'explicit to implicit numbering';
      }
    );
  });

  it('treats "{{" and "}}" as "{" and "}"', function() {
    eq(format('{{ {}: "{}" }}', 'foo', 'bar'), '{ foo: "bar" }');
  });

  it('supports property access via dot notation', function() {
    var bobby = {first: 'Bobby', last: 'Fischer'};
    var garry = {first: 'Garry', last: 'Kasparov'};
    eq(format('{0.first} {0.last} vs. {1.first} {1.last}', bobby, garry),
       'Bobby Fischer vs. Garry Kasparov');
  });

  it('accepts a shorthand for properties of the first positional argument', function() {
    var bobby = {first: 'Bobby', last: 'Fischer'};
    eq(format('{first} {last}', bobby), 'Bobby Fischer');
  });

  it('invokes methods', function() {
    eq(format('{0.toLowerCase}', 'III'), 'iii');
    eq(format('{0.toUpperCase}', 'iii'), 'III');
    eq(format('{0.getFullYear}', new Date('26 Apr 1984')), '1984');
    eq(format('{pop}{pop}{pop}', ['one', 'two', 'three']), 'threetwoone');
    eq(format('{quip.toUpperCase}', {quip: R.always('Bazinga!')}), 'BAZINGA!');
  });

  it("passes applicable tests from Python's test suite", function() {
    eq(format(''), '');
    eq(format('abc'), 'abc');
    eq(format('{0}', 'abc'), 'abc');
    eq(format('X{0}', 'abc'), 'Xabc');
    eq(format('{0}X', 'abc'), 'abcX');
    eq(format('X{0}Y', 'abc'), 'XabcY');
    eq(format('{1}', 1, 'abc'), 'abc');
    eq(format('X{1}', 1, 'abc'), 'Xabc');
    eq(format('{1}X', 1, 'abc'), 'abcX');
    eq(format('X{1}Y', 1, 'abc'), 'XabcY');
    eq(format('{0}', -15), '-15');
    eq(format('{0}{1}', -15, 'abc'), '-15abc');
    eq(format('{0}X{1}', -15, 'abc'), '-15Xabc');
    eq(format('{{'), '{');
    eq(format('}}'), '}');
    eq(format('{{}}'), '{}');
    eq(format('{{x}}'), '{x}');
    eq(format('{{{0}}}', 123), '{123}');
    eq(format('{{{{0}}}}'), '{{0}}');
    eq(format('}}{{'), '}{');
    eq(format('}}x{{'), '}x{');
  });

  describe('format.create', function() {

    it('returns a format function with access to provided transformers', function() {
      var append = R.flip(R.concat);
      var formatA = format.create({x: append(' (formatA)')});
      var formatB = format.create({x: append(' (formatB)')});

      eq(formatA('{!x}', 'abc'), 'abc (formatA)');
      eq(formatB('{!x}', 'abc'), 'abc (formatB)');
    });

  });

  it('applies transformers to explicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = '{0}, you have {1} unread message{1!s}';
    eq($format(text, 'Steve', 1), 'Steve, you have 1 unread message');
    eq($format(text, 'Holly', 2), 'Holly, you have 2 unread messages');
  });

  it('applies transformers to implicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = 'The Cure{!s}, The Door{!s}, The Smith{!s}';
    eq($format(text, 1, 2, 3), 'The Cure, The Doors, The Smiths');
  });

  it('applies transformers to properties of explicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = '<a href="/inbox">view message{0.length!s}</a>';
    eq($format(text, new Array(1)), '<a href="/inbox">view message</a>');
    eq($format(text, new Array(2)), '<a href="/inbox">view messages</a>');
  });

  it('applies transformers to properties of implicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = '<a href="/inbox">view message{length!s}</a>';
    eq($format(text, new Array(1)), '<a href="/inbox">view message</a>');
    eq($format(text, new Array(2)), '<a href="/inbox">view messages</a>');
  });

  it('throws if no such transformer is defined', function() {
    assert.throws(
      function() { format('foo-{!toString}-baz', 'bar'); },
      function(err) {
        return err instanceof Error &&
               err.name === 'ValueError' &&
               err.message === 'no transformer named "toString"';
      }
    );
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

});
