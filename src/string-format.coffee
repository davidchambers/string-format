class ValueError extends Error
  constructor: (@message) ->
  name: 'ValueError'


implicitToExplicit = 'cannot switch from implicit to explicit numbering'
explicitToImplicit = 'cannot switch from explicit to implicit numbering'

create = (transformers = {}) -> (template, args...) ->

  idx = 0
  explicit = implicit = no
  message = 'cannot switch from {} to {} numbering'

  template.replace \
  /([{}])\1|[{](.*?)(?:!(.+?))?[}]/g,
  (match, literal, key, transformer) ->
    return literal if literal

    if key.length
      throw new ValueError implicitToExplicit if implicit
      explicit = yes
      value = lookup(args, key) ? ''
    else
      throw new ValueError explicitToImplicit if explicit
      implicit = yes
      value = args[idx++] ? ''

    if Object::hasOwnProperty.call transformers, transformer
      transformers[transformer] value
    else
      value


lookup = (object, key) ->
  unless /^(\d+)([.]|$)/.test key
    key = '0.' + key
  while match = /(.+?)[.](.+)/.exec key
    object = resolve object, match[1]
    key = match[2]
  resolve object, key


resolve = (object, key) ->
  value = object[key]
  if typeof value is 'function' then value.call object else value


# format :: String,*... -> String
format = create {}

# format.create :: Object? -> String,*... -> String
format.create = create

# format.extend :: Object,Object? -> ()
format.extend = (prototype, transformers) ->
  $format = create transformers
  prototype.format = -> $format this, arguments...
  return


if typeof module isnt 'undefined' then module.exports = format
else if typeof define is 'function' and define.amd then define format
else window.format = format
