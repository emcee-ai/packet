#!/usr/bin/env node

require('./proof')(3, function (offsetsOf) {
  offsetsOf('-b8 => number', [ 1 ], [
    { name: 'number', pattern: '-b8', value: 1, offset: 0, length: 1, hex: '01' }
  ], 'byte');
});
