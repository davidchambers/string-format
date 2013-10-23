class ValueError extends Error
  constructor: (@message) ->
  name: 'ValueError'


format = (template, args...) ->

  idx = 0
  explicit = implicit = no
  message = 'cannot switch from {} to {} numbering'

  template.replace \
  /([{}])\1|[{](.*?)(?:!(.+?))?[}]/g,
  (match, literal, key, transformer) ->
    return literal if literal

    if key.length
      explicit = yes
      throw new ValueError message.format('implicit', 'explicit') if implicit
      value = lookup(args, key) ? ''
    else
      implicit = yes
      throw new ValueError message.format('explicit', 'implicit') if explicit
      value = args[idx++] ? ''

    if fn = format.transformers[transformer] then fn value else value

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


String::format = (args...) -> format this, args...

String::format.transformers = format.transformers = {}

String::format.version = format.version = '0.2.1'


module?.exports = format
