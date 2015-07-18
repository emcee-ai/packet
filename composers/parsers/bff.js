var $ = require('programmatic')
var signage = require('./signage')
var composeIncrementalParser = require('./inc')
var unpackAll = require('./unpack')

function composeParser (ranges) {
    composeIncrementalParser(ranges)

    var tmp = '', variables = [ 'next' ], rangeIndex = 0, source = '', step = 0

    ranges.forEach(function (range, rangeIndex) {
        if (rangeIndex) {
            tmp = $('                                                       \n\
                ', tmp, '                                                   \n\
                // __blank__                                                \n\
            ')
        }
        if (range.fixed) {
            tmp = $('                                                       \n\
                ', tmp, '                                                   \n\
                if (end - start < ' + range.size + ') {                     \n\
                    return inc.call(this, buffer, start, end, ' + step + ') \n\
                }                                                           \n\
                // __blank__                                                \n\
            ')
        } else if (range.lengthEncoded) {
            tmp = $('                                                       \n\
                ', tmp, '                                                   \n\
                if (end - start < value) {                                  \n\
                    return inc.call(this, buffer, start, end, ' + step + ') \n\
                }                                                           \n\
                // __blank__                                                \n\
            ')
        }

        var offset = 0
        range.pattern.forEach(function (field, index) {
            step += 2
            if (field.endianness == 'x') {
                offset += field.bytes * field.repeat
            } else if (field.type == 'f') {
                var name = 'value'
                var little = field.endianness == 'l'
                var bytes = field.bytes
                var bite = little ? 0 : bytes - 1
                var direction = little ? 1 : -1
                var stop = little ? bytes : -1
                var index = little ? 0 : bytes - 1

                variables.push(name)

                var copy = [], inc
                while (bite != stop) {
                    copy.push(
                        name +
                        '[' +
                            index +
                        '] = buffer[start++]')
                    offset++
                    index += direction
                    bite += direction
                }
                copy = copy.join('\n')

                tmp = $('                                                   \n\
                    ', tmp, '                                               \n\
                    ' + name + ' = new ArrayBuffer(' + field.bytes + ')     \n\
                    ', copy, '                                              \n\
                    object.' + field.name + ' = new DataView(' +
                            name +
                        ').getFloat' +
                            field.bits +
                        '(0, true)                                          \n\
                ')
            } else {
                if (field.bytes == 1 && ! field.signed) {
                    tmp = $('                                               \n\
                        ', tmp, '                                           \n\
                        object.' + field.name + ' = buffer[start++]   \n\
                    ')
                    offset++
                } else {
                    var little = field.endianness == 'l'
                    var bytes = field.bytes
                    var bite = little ? 0 : bytes - 1
                    var direction = little ? 1 : -1
                    var stop = little ? bytes : -1

                    var piece = ''
                    var read = [], inc = ''
                    while (bite != stop) {
                        read.unshift('buffer[start++]')
                        if (bite) {
                            read[0] += ' * 0x' + Math.pow(256, bite).toString(16)
                        }
                        offset++
                        bite += direction
                    }
                    read = read.reverse().join(' + \n')
                    if (field.packing || field.signed) {
                        var variable = 'value'
                        variables.push(variable)
                        if (field.bytes == 1) {
                            var assignment = $(variable + ' = ' + read)
                        } else {
                            var assignment = $('\n\
                                ' + variable + ' =                          \n\
                                    ', read, '')
                        }
                        tmp = $('                                           \n\
                            ', tmp, '                                       \n\
                            ', assignment, '                                \n\
                            ', signage(field), '                            \n\
                        ')
                        if (field.packing) {
                            tmp = $('                                       \n\
                                ', tmp, '                                   \n\
                                ', unpackAll(field), '                      \n\
                            ')
                        } else {
                            tmp = $('                                       \n\
                                ', tmp, '                                   \n\
                                object.' +
                                    field.name + ' = ' +
                                    variable + '                            \n\
                            ')
                        }
                    } else if (field.arrayed) {
                        if (field.bytes == 1) {
                        } else {
                            assignment = $('\n\
                                array[i] =                                  \n\
                                    ', read, '                              \n\
                                // __reference__                            \n\
                            ')
                        }
                        var stop = range.lengthEncoded ? 'value' : field.repeat
                        variables.push('array', 'i')
                        tmp = $('                                           \n\
                            ', tmp, '                                                   \n\
                            object.' + field.name + ' = array = new Array(' + stop + ') \n\
                            for (i = 0; i < ' + stop + '; i++) {                        \n\
                                ', assignment, '                            \n\
                            }                                               \n\
                            object[' + str(field.name) + '] = array         \n\
                        ')
                    } else if (field.lengthEncoding) {
                        variables.push('value')
                        var assignment = $('                                \n\
                            value =                                         \n\
                                ', read, '')
                        tmp = $('                                           \n\
                            ', tmp, '                                       \n\
                            ', assignment, '                                \n\
                            object.' + range.name + ' = array = new Array(value) \n\
                        ')
                    } else {
                        var assignment = $('                                \n\
                            object.' + field.name + ' =                     \n\
                                ', read, '')
                        tmp = $('                                           \n\
                            ', tmp, '                                       \n\
                            ', assignment, '                                \n\
                        ')
                    }
                }
            }
        })
    })

    var vars = variables.map(function (variable) {
        return 'var ' + variable
    }).join('\n')

    tmp = $('                                                               \n\
        ', vars, '                                                          \n\
        // __blank__                                                        \n\
        ', tmp, '                                                           \n\
        // __blank__                                                        \n\
        if (next = callback(object)) {                                      \n\
            this.parse = next                                               \n\
            return this.parse(buffer, start, end)                           \n\
        }                                                                   \n\
        // __blank__                                                        \n\
        return start                                                        \n\
    ')
    tmp = $('                                                               \n\
            ', composeIncrementalParser(ranges), '                          \n\
            // __blank__                                                    \n\
            return function (buffer, start, end) {                          \n\
                ', tmp, '                                                   \n\
        }')

    console.log($([tmp]))
    return tmp
}

module.exports = composeParser