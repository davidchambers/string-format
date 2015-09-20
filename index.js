/* global module, require */

;(function(global) {

  'use strict';

  //  exponent :: Number -> Number
  var exponent = function(_n) {
    var n = Math.abs(_n);
    return n < 1 ? exponent(n * 10) - 1 : n < 10 ? 0 : exponent(n / 10) + 1;
  };

  var base = 1e7;

  var multiply = function(n, _c, data) {
    var result = [];
    var c = _c;
    for (var idx = 0; idx < data.length; idx += 1) {
      c += n * data[idx];
      result.push(c % base);
      c = Math.floor(c / base);
    }
    return result;
  };

  var divide = function(n, data) {
    var result = [];
    var c = 0;
    for (var idx = data.length - 1; idx >= 0; idx -= 1) {
      c += data[idx];
      result[idx] = Math.floor(c / n);
      c = (c % n) * base;
    }
    return result;
  };

  var numToString = function(data) {
    var s = '';
    for (var idx = data.length - 1; idx >= 0; idx -= 1) {
      if (s !== '' || idx === 0 || data[idx] !== 0) {
        var t = String(data[idx]);
        if (s === '') {
          s = t;
        } else {
          s += '0000000'.slice(0, 7 - t.length) + t;
        }
      }
    }
    return s;
  };

  var log = function log(x, acc) {
    return x < 2 ? acc : log(x / 2, acc + 1);
  };

  var toFixed = function(x, f, data) {
    if (x !== x) {
      return 'NaN';
    }

    if (x <= -1e21 || x >= 1e21) {
      return String(x);
    }

    var m = '0';

    if (x > 1e-21) {
      var e = log(x * Math.pow(2, 69), 0) - 69;

      data = multiply(
        0,
        (e < 0 ? x * Math.pow(2, -e) : x / Math.pow(2, e)) * Math.pow(2, 52),
        data
      );

      for (var j = f; j >= 7; j -= 7) {
        data = multiply(1e7, 0, data);
      }

      data = multiply(Math.pow(10, j, 1), 0, data);

      for (j = 51 - e; j >= 23; j -= 23) {
        data = divide(1 << 23, data);
      }

      data = divide(1 << j, data);
      data = multiply(1, 1, data);
      data = divide(2, data);
      m = numToString(data);
    }

    if (f === 0) {
      return m;
    } else if (f >= m.length) {
      return '0.0000000000000000000'.slice(0, f - m.length + 2) + m;
    } else {
      return m = m.slice(0, m.length - f) + '.' + m.slice(m.length - f);
    }
  };

  //  KeyError :: String -> Error
  var KeyError = function(message) {
    var err = new Error(message);
    err.name = 'KeyError';
    return err;
  };

  //  ValueError :: String -> Error
  var ValueError = function(message) {
    var err = new Error(message);
    err.name = 'ValueError';
    return err;
  };

  var pad = function(string, fill, align, width) {
    var padding = Array(Math.max(0, width - string.length + 1)).join(fill);
    switch (align) {
      case '<':
        return string + padding;
      case '>':
        return padding + string;
      case '^':
        var idx = Math.floor(padding.length / 2);
        return padding.slice(0, idx) + string + padding.slice(idx);
    }
  };

  var toString = Object.prototype.toString;

  var tokenizeFormatSpec = function(spec) {
    var tokens = {
      'fill':       '',
      'align':      '',
      'sign':       '',
      '#':          false,
      '0':          false,
      'width':      '',
      ',':          false,
      'precision':  '',
      'type':       ''
    };

    var idx = 0;

    // The presence of a fill character is signalled by the character
    // following it, which must be one of the alignment options. Unless
    // the second character of spec is a valid alignment option, the fill
    // character is assumed to be are absent.
    var match = /^(.)?([<>=^])/.exec(spec);
    if (match != null) {
      if (match[1] != null) {
        tokens['fill'] = match[1];
      }
      tokens['align'] = match[2];
      idx += match[0].length;
    }

    match = /^[ +-]/.exec(spec.slice(idx));
    if (match != null) {
      tokens['sign'] = match[0];
      idx += match[0].length;
    }

    if (spec.charAt(idx) === '#') {
      tokens['#'] = true;
      idx += 1;
    }

    if (spec.charAt(idx) === '0') {
      tokens['0'] = true;
      idx += 1;
    }

    match = /^\d*/.exec(spec.slice(idx));
    tokens['width'] = match[0];
    idx += match[0].length;

    if (spec.charAt(idx) === ',') {
      tokens[','] = true;
      idx += 1;
    }

    if (spec.charAt(idx) === '.') {
      idx += 1;
      match = /^\d+/.exec(spec.slice(idx));
      if (match == null) {
        throw ValueError('Format specifier missing precision');
      }
      tokens['precision'] = match[0];
      idx += match[0].length;
    }

    if (idx < spec.length) {
      tokens['type'] = spec.charAt(idx);
      idx += 1;
    }

    if (idx < spec.length) {
      throw ValueError('Invalid conversion specification');
    }

    if (tokens[','] && tokens['type'] === 's') {
      throw ValueError("Cannot specify ',' with 's'");
    }

    return tokens;
  };

  var formatString = function(value, tokens) {
    var fill = tokens['fill'] || (tokens['0'] ? '0' : ' ');
    var align = tokens['align'] || (tokens['0'] ? '=' : '<');
    var precision = Number(tokens['precision'] || value.length);

    if (tokens['type'] !== '' && tokens['type'] !== 's') {
      throw ValueError('unknown format code "' + tokens['type'] + '" ' +
                       'for String object');
    }
    if (tokens[',']) {
      throw ValueError("Cannot specify ',' with 's'");
    }
    if (tokens['sign']) {
      throw ValueError('Sign not allowed in string format specifier');
    }
    if (tokens['#']) {
      throw ValueError('Alternate form (#) not allowed ' +
                       'in string format specifier');
    }
    if (align === '=') {
      throw ValueError('"=" alignment not allowed in string format specifier');
    }
    return pad(value.slice(0, precision),
               fill,
               align,
               Number(tokens['width']));
  };

  //  stripTrailingZeros :: String -> String
  var stripTrailingZeros = function(s) {
    return s.replace(/([.][0-9]*?)0*$/, '$1').replace(/[.]$/, '');
  };

  //  _formatNumber :: Number,Number,String -> String
  var _formatNumber = function _formatNumber(n, precision, type) {
    if (/[A-Z]/.test(type)) {
      return _formatNumber(n, precision, type.toLowerCase()).toUpperCase();
    } else if (type === 'c') {
      return String.fromCharCode(n);
    } else if (type === 'd') {
      return n.toString(10);
    } else if (type === 'b') {
      return n.toString(2);
    } else if (type === 'o') {
      return n.toString(8);
    } else if (type === 'x') {
      return n.toString(16);
    } else if (type === 'e') {
      var x = Math.pow(10, precision - exponent(n));
      return (n * x % 1 === 0.5 && n * x + 0.05 !== n * x ?
                Math.round(n * x / 2) * 2 / x :
                n)
             .toExponential(precision).replace(/e[+-](?=\d$)/, '$&0');
    } else if (type === 'f') {
      var x = Math.pow(10, precision);
      return toFixed(n * x % 1 === 0.5 && n * x + 0.05 !== n * x ?
                       Math.round(n * x / 2) * 2 / x :
                       n,
                     precision,
                     [0, 0, 0, 0, 0, 0]);
    } else if (type === 'g') {
      // A precision of 0 is treated as equivalent to a precision of 1.
      var p = precision === 0 ? 1 : precision;
      var exp = exponent(n);
      if (exp >= -4 && exp < p) {
        return stripTrailingZeros(_formatNumber(n, p - 1 - exp, 'f'));
      } else {
        var pair = _formatNumber(n, p - 1, 'e').split('e');
        return stripTrailingZeros(pair[0]) + 'e' + pair[1];
      }
    } else if (type === '%') {
      return _formatNumber(n * 100, precision, 'f') + '%';
    } else if (type === '') {
      return _formatNumber(n, precision, 'd');
    } else {
      throw ValueError("Unknown format code '" + type + "' " +
                       "for object of type 'float'");
    }
  };

  var formatNumber = function(value, tokens) {
    var fill  = tokens['fill'] || (tokens['0'] ? '0' : ' ');
    var align = tokens['align'] || (tokens['0'] ? '=' : '>');
    var width = tokens['width'];
    var type  = tokens['type'] || (tokens['precision'] ? 'g' : '');

    if (type === 'c' || type === 'd' ||
        type === 'b' || type === 'o' ||
        type === 'x' || type === 'X') {
      if (value % 1 < 0 || value % 1 > 0) {
        throw ValueError('cannot format non-integer ' +
                         'with format specifier "' + type + '"');
      }
      if (tokens['sign'] !== '' && type === 'c') {
        throw ValueError("Sign not allowed with integer format specifier 'c'");
      }
      if (tokens[','] && type !== 'd') {
        throw ValueError("Cannot specify ',' with '" + type + "'");
      }
      if (tokens['precision'] !== '') {
        throw ValueError('Precision not allowed in integer format specifier');
      }
    } else if (type === 'e' || type === 'E' ||
               type === 'f' || type === 'F' ||
               type === 'g' || type === 'G' ||
               type === '%') {
      if (tokens['#']) {
        throw ValueError('Alternate form (#) not allowed ' +
                         'in float format specifier');
      }
    }

    var s = _formatNumber(Math.abs(value),
                          Number(tokens['precision'] || '6'),
                          type);

    var sign = value < 0 || 1 / value < 0 ? '-' :
               tokens['sign'] === '-' ? '' : tokens['sign'];

    var prefix = tokens['#'] &&
                 (type === 'b' || type === 'o' ||
                  type === 'x' || type === 'X') ? '0' + type : '';

    if (tokens[',']) {
      var match = /^(\d*)(.*)$/.exec(s);
      var separated = match[1].replace(/.(?=(...)+$)/g, '$&,') + match[2];

      if (align !== '=') {
        return pad(sign + separated, fill, align, width);
      } else if (fill === '0') {
        var shortfall =
          Math.max(0, width - sign.length - separated.length);
        var digits = /^\d*/.exec(separated)[0].length;
        var padding = '';
        for (var n = 0; n < shortfall; n += 1) {
          padding = ((digits + n) % 4 === 3 ? ',' : '0') + padding;
        }
        return sign + (/^,/.test(padding) ? '0' : '') + padding + separated;
      } else {
        return sign + pad(separated, fill, '>', width - sign.length);
      }
    } else if (width === '') {
      return sign + prefix + s;
    } else if (align === '=') {
      return sign + prefix +
             pad(s, fill, '>', width - sign.length - prefix.length);
    } else {
      return pad(sign + prefix + s, fill, align, width);
    }
  };

  var quote = function(s) {
    return '"' + s.replace(/"/g, '\\"') + '"';
  };

  var descend = function(x, path) {
    if (path.length === 0) {
      return x;
    } else if (path[0] in Object(x)) {
      return descend(
        typeof x[path[0]] === 'function' ? x[path[0]]() : x[path[0]],
        path.slice(1)
      );
    } else {
      throw KeyError(quote(path[0]));
    }
  };

  var create = function(transformers) {
    return function(template, args) {
      var mode = 'UNDEFINED';
      var _idx = -1;
      var normalize = function(field) {
        if (field === '') {
          if (mode === 'EXPLICIT') {
            throw ValueError('cannot switch from ' +
                             'explicit to implicit numbering');
          }
          mode = 'IMPLICIT';
          return String(_idx += 1);
        } else {
          if (mode === 'IMPLICIT') {
            throw ValueError('cannot switch from ' +
                             'implicit to explicit numbering');
          }
          mode = 'EXPLICIT';
          return /^\d+(?:[.]|$)/.test(field) ? field : '0.' + field;
        }
      };

      var state = 'LITERAL';
      var field = '';
      var transformer = [];
      var spec = '';
      var output = '';

      var evaluate = function() {
        state = 'LITERAL';

        var value = descend(args, normalize(field).split('.'));
        if (transformer.length > 0) {
          var xf = transformer[0];
          if (!Object.prototype.hasOwnProperty.call(transformers, xf)) {
            throw ValueError('no transformer named ' + quote(xf));
          }
          value = transformers[xf](value);
        }

        var tokens = tokenizeFormatSpec(
          spec.replace(/\{(.*?)\}/g, function(match, field) {
            return descend(args, normalize(field).split('.'));
          })
        );

        if (toString.call(value) === '[object Number]') {
          output += formatNumber(value, tokens);
        } else if (toString.call(value) === '[object String]') {
          output += formatString(value, tokens);
        } else {
          for (var prop in tokens) {
            if (tokens[prop]) {
              throw ValueError('non-empty format string for ' +
                               toString.call(value).split(/\W/)[2] +
                               ' object');
            }
          }
          output += String(value);
        }

        field = spec = '';
        transformer = [];
      };

      for (var idx = 0; idx < template.length; idx += 1) {
        var c = template.charAt(idx);

        if (state === 'LITERAL' && c === '{') {
          state = '{';
        } else if (state === 'LITERAL' && c === '}') {
          state = '}';
        } else if (state === 'LITERAL') {
          output += c;
        } else if (state === '{' && c === '{') {
          state = 'LITERAL';
          output += '{';
        } else if (state === '{' && c === '!') {
          state = '!';
          transformer = [''];
        } else if (state === '{' && c === ':') {
          state = ':';
        } else if (state === '{' && c === '}') {
          evaluate();
        } else if (state === '{') {
          state = 'FIELD NAME';
          field += c;
        } else if (state === 'FIELD NAME' && c === '!') {
          state = '!';
          transformer = [''];
        } else if (state === 'FIELD NAME' && c === ':') {
          state = ':';
        } else if (state === 'FIELD NAME' && c === '}') {
          evaluate();
        } else if (state === 'FIELD NAME') {
          field += c;
        } else if (state === '!' && c === ':') {
          state = c;
        } else if (state === '!' && c === '}') {
          if (transformer[0] === '') {
            throw ValueError('end of format ' +
                             'while looking for conversion specifier');
          }
          evaluate();
        } else if (state === '!') {
          transformer[0] += c;
        } else if (state === ':' && c === '{') {
          spec += '{';
          state = ':{';
        } else if (state === ':' && c === '}') {
          evaluate();
        } else if (state === ':') {
          spec += c;
        } else if (state === ':{' && c === '{') {
          throw ValueError('Max string recursion exceeded');
        } else if (state === ':{' && c === '}') {
          spec += '}';
          state = ':';
        } else if (state === ':{') {
          spec += c;
        } else if (state === '}' && c === '}') {
          state = 'LITERAL';
          output += '}';
        }
      }

      switch (state) {
        case '{':
          throw ValueError("Single '{' encountered in format string");
        case '}':
          throw ValueError("Single '}' encountered in format string");
        case 'FIELD NAME':
        case '!':
        case ':':
          throw ValueError("unmatched '{' in format");
        default:
          return output;
      }
    };
  };

  //  format :: String,*... -> String
  var format = create({});

  //  format.create :: Object? -> String,*... -> String
  format.create = create;

  //  format.extend :: Object,Object? -> ()
  format.extend = function(prototype, transformers) {
    var $format = create(transformers);
    prototype.format = function() { return $format(this, arguments); };
  };

  /* istanbul ignore else */
  if (typeof module !== 'undefined') {
    module.exports = format;
  } else {
    global.format = format;
  }

}.call(this, this));
