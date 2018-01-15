# NETPRO  
[![](https://badge.fury.io/js/netpro.svg)](https://www.npmjs.com/package/netpro)  

Node.js internet protocol address utility

## Installation

###  npm
```shell
npm install netpro
```

### git

```shell
git clone https://github.com/Joaquin6/netpro.git
```
  
## Usage
Get your ip address, compare ip addresses, validate ip addresses, etc.

```js
const netpro = require('netpro');

netpro.address();                                   // my ip address
netpro.fromPrefixLen(24);                           // 255.255.255.0
netpro.not('255.255.255.0');                        // 0.0.0.255
netpro.toBuffer('127.0.0.1');                       // Buffer([127, 0, 0, 1])
netpro.isPrivate('127.0.0.1');                      // true
netpro.isEqual('::1', '::0:1');                     // true
netpro.isV4Format('127.0.0.1');                     // true
netpro.cidr('192.168.1.134/26');                    // 192.168.1.128
netpro.isV6Format('::ffff:127.0.0.1');              // true
netpro.or('192.168.1.134', '0.0.0.255');            // 192.168.1.255
netpro.toString(new Buffer([127, 0, 0, 1]));        // 127.0.0.1
netpro.mask('192.168.1.134', '255.255.255.0');      // 192.168.1.0

// Operate on buffers in-place
const buf = new Buffer(128);
const offset = 64;
netpro.toBuffer('127.0.0.1', buf, offset);          // [127, 0, 0, 1] at offset 64
netpro.toString(buf, offset, 4);                    // '127.0.0.1'

// Subnet Information
netpro.subnet('192.168.1.134', '255.255.255.192');
// { networkAddress: '192.168.1.128',
//   firstAddress: '192.168.1.129',
//   lastAddress: '192.168.1.190',
//   broadcastAddress: '192.168.1.191',
//   subnetMask: '255.255.255.192',
//   subnetMaskLength: 26,
//   numHosts: 62,
//   length: 64,
//   contains: function(addr){...} }
netpro.cidrSubnet('192.168.1.134/26');
// Same as previous.

// Range Checking
netpro.cidrSubnet('192.168.1.134/26')
    .contains('192.168.1.190');                 // true


// ipv4 long conversion
netpro.toLong('127.0.0.1');                         // 2130706433
netpro.fromLong(2130706433);                        // '127.0.0.1'
```

### License

This software is licensed under the MIT License.

Copyright Joaquin Briceno, 2018.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.
