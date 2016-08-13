require('proof')(1, prove)

function prove (assert) {
    var path = require('path')
    var compiler = require('../../../compiler/require')
    var composer = require('../../../compose/parser/all.js')
    var filename = path.resolve(__filename, '../../../generated/integer.parse.bff.js')

    var parsers = composer(compiler(filename), [{
        type: 'structure',
        name: 'object',
        fields: [{
            name: 'integer',
            type: 'integer',
            endianness: 'b',
            bits: 16
        }]
    }], { bff: true })

    var buffer = new Buffer([ 0xab, 0xcd ])
    assert((new parsers.object).parse(buffer, 0), {
        start: 2,
        object: { integer: 0xabcd },
        parser: null
    }, 'compiled')
}
