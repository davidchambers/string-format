last = (array) ->
  array[array.length - 1]


class ValueError extends Error
  constructor: (@message) ->
  name: 'ValueError'


class Literal
  constructor: (@value) ->


class Expression
  constructor: (@source) ->
    @field_name = ''
    @transformer = ''
    @format_spec = ''


tokenize = (source) ->
  tokens = [new Literal '']
  idx = 0
  next = -> source[idx + 1]
  until idx is source.length
    chr = source[idx]
    if last(tokens) instanceof Literal
      if chr is '{'
        if next() is '{'
          last(tokens).value += '{'
          idx += 1
        else
          tokens.push new Expression ''
      else if chr is '}'
        if next() is '}'
          last(tokens).value += '}'
          idx += 1
        else
          throw new ValueError 'unmatched, unescaped "}" in format string'
      else
        last(tokens).value += chr
    else
      if chr is '}'
        tokens.push new Literal ''
      else
        last(tokens).source += chr
    idx += 1
  if last(tokens) instanceof Expression
    throw new ValueError 'unmatched, unescaped "{" in format string'

  FIELD_NAME = {}; TRANSFORMER = {}; FORMAT_SPEC = {}
  for token in tokens when token instanceof Expression
    states = [FIELD_NAME]
    for chr in token.source
      switch last states
        when FIELD_NAME
          if chr is '!' then states.push TRANSFORMER; continue
          if chr is ':' then states.push FORMAT_SPEC; continue
          token.field_name += chr
        when TRANSFORMER
          if chr is ':' then states.push FORMAT_SPEC; continue
          token.transformer += chr
        when FORMAT_SPEC
          token.format_spec += chr
    if TRANSFORMER in states and token.transformer is ''
      throw new ValueError 'invalid transformer name'
  tokens


eval_ = (expr, ctx) ->
  for key in expr.field_name.split('.')
    if Object::toString.call(ctx[key]) is '[object Function]'
      ctx = ctx[key]()
    else
      ctx = ctx[key]

  if expr.transformer is ''
    ctx
  else if Object::hasOwnProperty.call String::format.transformers, expr.transformer
    String::format.transformers[expr.transformer].call(ctx)
  else
    throw new ValueError 'unknown transformer "{}"'
                         .format expr.transformer.replace(/"/g, '\\"')


format = (template, args...) ->
  idx = 0
  modes = []
  values = for token in tokenize template then switch token.constructor
    when Literal
      token.value
    when Expression
      modes.push if token.field_name then 'explicit' else 'implicit'
      if last(modes) isnt modes[0]
        throw new ValueError 'cannot switch from {} to {} numbering'
                             .format modes[0], last(modes)
      if /^\D/.test token.field_name
        token.field_name = "0.#{token.field_name}"
      token.field_name or= "#{idx++}"
      eval_ token, args
  values.join('')


String::format = (args...) -> format this, args...

String::format.transformers = format.transformers = {}

String::format.version = format.version = '0.2.1'


module?.exports = format
