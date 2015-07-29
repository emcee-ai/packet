module.exports = function (object, callback) {
    var inc

    inc = function (buffer, start, end, step) {
        var value
        var bite
        var next

        this.parse = function (buffer, start, end) {
            switch (step) {
            case 0:
                value = 0
                bite = 0
                step = 1
            case 1:
                while (bite != -1) {
                    if (start == end) {
                        return start
                    }
                    value += Math.pow(256, bite) * buffer[start++]
                    bite--
                }
                value = value & 0x80 ? (0xff - value + 1) * -1 : value
                object.foo = value
            }

            if (next = callback(object)) {
                this.parse = next
                return this.parse(buffer, start, end)
            }

            return start
        }

        return this.parse(buffer, start, end)
    }

    return function (buffer, start, end) {
        var next
        var value

        if (end - start < 1) {
            return inc.call(this, buffer, start, end, 0)
        }

        value = buffer[start++]
        object.foo = value & 0x80 ? (0xff - value + 1) * -1 : value

        if (next = callback(object)) {
            this.parse = next
            return this.parse(buffer, start, end)
        }

        return start
    }
}
