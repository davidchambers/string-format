void function(global) {

  'use strict';

  //  ValueError :: String -> Error
  function ValueError(message) {
    var err = new Error (message);
    err.name = 'ValueError';
    return err;
  }

  //  create :: Object -> String,*... -> String
  function create(transformers) {
    return function(template) {
      var args = Array.prototype.slice.call (arguments, 1);
      var idx = 0;
      var state = 'UNDEFINED';

      return template.replace (
        /([{}])\1|[{](.*?)(?:!(.+?))?[}]/g,
        function(match, literal, _key, xf) {
          if (literal != null) {
            return literal;
          }
          var key = _key;
          if (key.length > 0) {
            if (state === 'IMPLICIT') {
              throw ValueError ('cannot switch from ' +
                                'implicit to explicit numbering');
            }
            state = 'EXPLICIT';
          } else {
            if (state === 'EXPLICIT') {
              throw ValueError ('cannot switch from ' +
                                'explicit to implicit numbering');
            }
            state = 'IMPLICIT';
            key = String (idx);
            idx += 1;
          }

          //  1.  Split the key into a lookup path.
          //  2.  If the first path component is not an index, prepend '0'.
          //  3.  Reduce the lookup path to a single result. If the lookup
          //      succeeds the result is a singleton array containing the
          //      value at the lookup path; otherwise the result is [].
          //  4.  Unwrap the result by reducing with '' as the default value.
          var path = key.split ('.');
          var value = (/^\d+$/.test (path[0]) ? path : ['0'].concat (path))
            .reduce (function(maybe, key) {
              return maybe.reduce (function(_, x) {
                return x != null && key in Object (x) ?
                  [typeof x[key] === 'function' ? x[key] () : x[key]] :
                  [];
              }, []);
            }, [args])
            .reduce (function(_, x) { return x; }, '');

          if (xf == null) {
            return value;
          } else if (Object.prototype.hasOwnProperty.call (transformers, xf)) {
            return transformers[xf] (value);
          } else {
            throw ValueError ('no transformer named "' + xf + '"');
          }
        }
      );
    };
  }

  //  format :: String,*... -> String
  var format = create ({});

  //  format.create :: Object -> String,*... -> String
  format.create = create;

  //  format.extend :: Object,Object -> ()
  format.extend = function(prototype, transformers) {
    var $format = create (transformers);
    prototype.format = function() {
      var args = Array.prototype.slice.call (arguments);
      args.unshift (this);
      return $format.apply (global, args);
    };
  };

  /* istanbul ignore else */
  if (typeof module !== 'undefined') {
    module.exports = format;
  } else if (typeof define === 'function' && define.amd) {
    define (function() { return format; });
  } else {
    global.format = format;
  }

  /* istanbul ignore if */
  if (typeof __doctest !== 'undefined') {
    format.extend (String.prototype, {});
  }

  //. # string-format
  //.
  //. string-format is a small JavaScript library for formatting strings,
  //. based on Python's [`str.format()`][1]. For example:
  //.
  //. ```javascript
  //. > const user = {
  //. .   firstName: 'Jane',
  //. .   lastName: 'Smith',
  //. .   email: 'jsmith@example.com',
  //. . }
  //. ```
  //.
  //. ```javascript
  //. > '"{firstName} {lastName}" <{email}>'.format (user)
  //. '"Jane Smith" <jsmith@example.com>'
  //. ```
  //.
  //. The equivalent concatenation:
  //.
  //. ```javascript
  //. > '"' + user.firstName + ' ' + user.lastName + '" <' + user.email + '>'
  //. '"Jane Smith" <jsmith@example.com>'
  //. ```
  //.
  //. ### Installation
  //.
  //. #### Node
  //.
  //. 1.  Install:
  //.
  //.     ```console
  //.     $ npm install string-format
  //.     ```
  //.
  //. 2.  Require:
  //.
  //.     ```javascript
  //.     const format = require ('string-format')
  //.     ```
  //.
  //. #### Browser
  //.
  //. 1.  Define `window.format`:
  //.
  //.     ```html
  //.     <script src="path/to/string-format.js"></script>
  //.     ```
  //.
  //. ### Modes
  //.
  //. string-format can be used in two modes: [function mode](#function-mode)
  //. and [method mode](#method-mode).
  //.
  //. #### Function mode
  //.
  //. ```javascript
  //. > format ('Hello, {}!', 'Alice')
  //. 'Hello, Alice!'
  //. ```
  //.
  //. In this mode the first argument is a template string and the remaining
  //. arguments are values to be interpolated.
  //.
  //. #### Method mode
  //.
  //. ```javascript
  //. > 'Hello, {}!'.format ('Alice')
  //. 'Hello, Alice!'
  //. ```
  //.
  //. In this mode values to be interpolated are supplied to the `format`
  //. method of a template string. This mode is not enabled by default.
  //. The method must first be defined via [`format.extend`](#format.extend):
  //.
  //. ```javascript
  //. > format.extend (String.prototype, {})
  //. ```
  //.
  //. `format (template, $0, $1, …, $N)` and `template.format ($0, $1, …, $N)`
  //. can then be used interchangeably.
  //.
  //. <a name="format"></a>
  //.
  //. ### `format (template, $0, $1, …, $N)`
  //.
  //. Returns the result of replacing each `{…}` placeholder in the template
  //. string with its corresponding replacement.
  //.
  //. Placeholders may contain numbers which refer to positional arguments:
  //.
  //. ```javascript
  //. > '{0}, you have {1} unread message{2}'.format ('Holly', 2, 's')
  //. 'Holly, you have 2 unread messages'
  //. ```
  //.
  //. Unmatched placeholders produce no output:
  //.
  //. ```javascript
  //. > '{0}, you have {1} unread message{2}'.format ('Steve', 1)
  //. 'Steve, you have 1 unread message'
  //. ```
  //.
  //. A format string may reference a positional argument multiple times:
  //.
  //. ```javascript
  //. > "The name's {1}. {0} {1}.".format ('James', 'Bond')
  //. "The name's Bond. James Bond."
  //. ```
  //.
  //. Positional arguments may be referenced implicitly:
  //.
  //. ```javascript
  //. > '{}, you have {} unread message{}'.format ('Steve', 1)
  //. 'Steve, you have 1 unread message'
  //. ```
  //.
  //. A format string must not contain both implicit and explicit references:
  //.
  //. ```javascript
  //. > 'My name is {} {}. Do you like the name {0}?'.format ('Lemony', 'Snicket')
  //. ! ValueError: cannot switch from implicit to explicit numbering
  //. ```
  //.
  //. `{{` and `}}` in format strings produce `{` and `}`:
  //.
  //. ```javascript
  //. > '{{}} creates an empty {} in {}'.format ('dictionary', 'Python')
  //. '{} creates an empty dictionary in Python'
  //. ```
  //.
  //. Dot notation may be used to reference object properties:
  //.
  //. ```javascript
  //. > const bobby = {firstName: 'Bobby', lastName: 'Fischer'}
  //. > const garry = {firstName: 'Garry', lastName: 'Kasparov'}
  //.
  //. > '{0.firstName} {0.lastName} vs. {1.firstName} {1.lastName}'.format (bobby, garry)
  //. 'Bobby Fischer vs. Garry Kasparov'
  //. ```
  //.
  //. `0.` may be omitted when referencing a property of `{0}`:
  //.
  //. ```javascript
  //. > const repo = {owner: 'davidchambers', slug: 'string-format'}
  //.
  //. > 'https://github.com/{owner}/{slug}'.format (repo)
  //. 'https://github.com/davidchambers/string-format'
  //. ```
  //.
  //. If the referenced property is a method, it is invoked with no arguments
  //. to determine the replacement:
  //.
  //. ```javascript
  //. > const sheldon = {
  //. .   firstName: 'Sheldon',
  //. .   lastName: 'Cooper',
  //. .   dob: new Date ('1970-01-01'),
  //. .   fullName: function() { return this.firstName + ' ' + this.lastName },
  //. .   quip: function() { return 'Bazinga!' },
  //. . }
  //.
  //. > '{fullName} was born at precisely {dob.toISOString}'.format (sheldon)
  //. 'Sheldon Cooper was born at precisely 1970-01-01T00:00:00.000Z'
  //.
  //. > "I've always wanted to go to a goth club. {quip.toUpperCase}".format (sheldon)
  //. "I've always wanted to go to a goth club. BAZINGA!"
  //. ```
  //.
  //. <a name="format.create"></a>
  //.
  //. ### `format.create (transformers)`
  //.
  //. This function takes an object mapping names to transformers and returns
  //. a formatting function. A transformer is applied if its name appears,
  //. prefixed with `!`, after a field name in a template string.
  //.
  //. ```javascript
  //. > const fmt = format.create ({
  //. .   escape: s =>
  //. .     s.replace (/[&<>"'`]/g, c => '&#' + c.charCodeAt (0) + ';'),
  //. .   upper: s =>
  //. .     s.toUpperCase (),
  //. . })
  //.
  //. > fmt ('Hello, {!upper}!', 'Alice')
  //. 'Hello, ALICE!'
  //.
  //. > fmt ('<a href="{url!escape}">{name!escape}</a>', {
  //. .   name: 'Anchor & Hope',
  //. .   url: 'http://anchorandhopesf.com/',
  //. . })
  //. '<a href="http://anchorandhopesf.com/">Anchor &#38; Hope</a>'
  //. ```
  //.
  //. <a name="format.extend"></a>
  //.
  //. ### `format.extend (prototype, transformers)`
  //.
  //. This function takes a prototype (presumably `String.prototype`) and an
  //. object mapping names to transformers, and defines a `format` method on
  //. the prototype. A transformer is applied if its name appears, prefixed
  //. with `!`, after a field name in a template string.
  //.
  //. ```javascript
  //. > format.extend (String.prototype, {
  //. .   escape: s =>
  //. .     s.replace (/[&<>"'`]/g, c => '&#' + c.charCodeAt (0) + ';'),
  //. .   upper: s =>
  //. .     s.toUpperCase (),
  //. . })
  //.
  //. > 'Hello, {!upper}!'.format ('Alice')
  //. 'Hello, ALICE!'
  //.
  //. > '<a href="{url!escape}">{name!escape}</a>'.format ({
  //. .   name: 'Anchor & Hope',
  //. .   url: 'http://anchorandhopesf.com/',
  //. . })
  //. '<a href="http://anchorandhopesf.com/">Anchor &#38; Hope</a>'
  //. ```
  //.
  //. ### Running the test suite
  //.
  //. ```console
  //. $ npm install
  //. $ npm test
  //. ```
  //.
  //. [1]: http://docs.python.org/library/stdtypes.html#str.format

}.call (this, this);
