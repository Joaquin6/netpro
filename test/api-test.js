'use strict';

const netpro = require('..');
const assert = require('assert');
const net = require('net');
const os = require('os');

describe('IP library for node.js', function() {
  describe('toBuffer()/toString() methods', function() {
    it('should convert to buffer IPv4 address', function() {
      const buf = netpro.toBuffer('127.0.0.1');
      assert.equal(buf.toString('hex'), '7f000001');
      assert.equal(netpro.toString(buf), '127.0.0.1');
    });

    it('should convert to buffer IPv4 address in-place', function() {
      const buf = new Buffer(128);
      const offset = 64;
      netpro.toBuffer('127.0.0.1', buf, offset);
      assert.equal(buf.toString('hex', offset, offset + 4), '7f000001');
      assert.equal(netpro.toString(buf, offset, 4), '127.0.0.1');
    });

    it('should convert to buffer IPv6 address', function() {
      const buf = netpro.toBuffer('::1');
      assert(/(00){15,15}01/.test(buf.toString('hex')));
      assert.equal(netpro.toString(buf), '::1');
      assert.equal(netpro.toString(netpro.toBuffer('1::')), '1::');
      const ipv6Buf = netpro.toString(netpro.toBuffer('abcd::dcba'));
      assert.equal(ipv6Buf, 'abcd::dcba');
    });

    it('should convert to buffer IPv6 address in-place', function() {
      const buf = new Buffer(128);
      const offset = 64;
      netpro.toBuffer('::1', buf, offset);
      assert(/(00){15,15}01/.test(buf.toString('hex', offset, offset + 16)));
      assert.equal(netpro.toString(buf, offset, 16), '::1');
      assert.equal(netpro.toString(netpro.toBuffer('1::', buf, offset),
                               offset, 16), '1::');
      assert.equal(netpro.toString(netpro.toBuffer('abcd::dcba', buf, offset),
                               offset, 16), 'abcd::dcba');
    });

    it('should convert to buffer IPv6 mapped IPv4 address', function() {
      let buf = netpro.toBuffer('::ffff:127.0.0.1');
      assert.equal(buf.toString('hex'), '00000000000000000000ffff7f000001');
      assert.equal(netpro.toString(buf), '::ffff:7f00:1');

      buf = netpro.toBuffer('ffff::127.0.0.1');
      assert.equal(buf.toString('hex'), 'ffff000000000000000000007f000001');
      assert.equal(netpro.toString(buf), 'ffff::7f00:1');

      buf = netpro.toBuffer('0:0:0:0:0:ffff:127.0.0.1');
      assert.equal(buf.toString('hex'), '00000000000000000000ffff7f000001');
      assert.equal(netpro.toString(buf), '::ffff:7f00:1');
    });
  });

  describe('fromPrefixLen() method', function() {
    it('should create IPv4 mask', function() {
      assert.equal(netpro.fromPrefixLen(24), '255.255.255.0');
    });
    it('should create IPv6 mask', function() {
      assert.equal(netpro.fromPrefixLen(64), 'ffff:ffff:ffff:ffff::');
    });
    it('should create IPv6 mask explicitly', function() {
      assert.equal(netpro.fromPrefixLen(24, 'IPV6'), 'ffff:ff00::');
    });
  });

  describe('not() method', function() {
    it('should reverse bits in address', function() {
      assert.equal(netpro.not('255.255.255.0'), '0.0.0.255');
    });
  });

  describe('or() method', function() {
    it('should or bits in ipv4 addresses', function() {
      assert.equal(netpro.or('0.0.0.255', '192.168.1.10'), '192.168.1.255');
    });
    it('should or bits in ipv6 addresses', function() {
      assert.equal(netpro.or('::ff', '::abcd:dcba:abcd:dcba'),
                  '::abcd:dcba:abcd:dcff');
    });
    it('should or bits in mixed addresses', function() {
      assert.equal(netpro.or('0.0.0.255', '::abcd:dcba:abcd:dcba'),
                  '::abcd:dcba:abcd:dcff');
    });
  });

  describe('mask() method', function() {
    it('should mask bits in address', function() {
      assert.equal(netpro.mask('192.168.1.134', '255.255.255.0'),
                  '192.168.1.0');
      assert.equal(netpro.mask('192.168.1.134', '::ffff:ff00'),
                  '::ffff:c0a8:100');
    });

    it('should not leak data', function() {
      for (let i = 0; i < 10; i++)
        assert.equal(netpro.mask('::1', '0.0.0.0'), '::');
    });
  });

  describe('subnet() method', function() {
    // Test cases calculated with http://www.subnet-calculator.com/
    const ipv4Subnet = netpro.subnet('192.168.1.134', '255.255.255.192');

    it('should compute ipv4 network address', function() {
      assert.equal(ipv4Subnet.networkAddress, '192.168.1.128');
    });

    it('should compute ipv4 network\'s first address', function() {
      assert.equal(ipv4Subnet.firstAddress, '192.168.1.129');
    });

    it('should compute ipv4 network\'s last address', function() {
      assert.equal(ipv4Subnet.lastAddress, '192.168.1.190');
    });

    it('should compute ipv4 broadcast address', function() {
      assert.equal(ipv4Subnet.broadcastAddress, '192.168.1.191');
    });

    it('should compute ipv4 subnet number of addresses', function() {
      assert.equal(ipv4Subnet.length, 64);
    });

    it('should compute ipv4 subnet number of addressable hosts', function() {
      assert.equal(ipv4Subnet.numHosts, 62);
    });

    it('should compute ipv4 subnet mask', function() {
      assert.equal(ipv4Subnet.subnetMask, '255.255.255.192');
    });

    it('should compute ipv4 subnet mask\'s length', function() {
      assert.equal(ipv4Subnet.subnetMaskLength, 26);
    });

    it('should know whether a subnet contains an address', function() {
      assert.equal(ipv4Subnet.contains('192.168.1.180'), true);
    });

    it('should know whether a subnet does not contain an address', function() {
      assert.equal(ipv4Subnet.contains('192.168.1.195'), false);
    });
  });

  describe('subnet() method with mask length 32', function() {
    // Test cases calculated with http://www.subnet-calculator.com/
    const ipv4Subnet = netpro.subnet('192.168.1.134', '255.255.255.255');
    it('should compute ipv4 network\'s first address', function() {
      assert.equal(ipv4Subnet.firstAddress, '192.168.1.134');
    });

    it('should compute ipv4 network\'s last address', function() {
      assert.equal(ipv4Subnet.lastAddress, '192.168.1.134');
    });

    it('should compute ipv4 subnet number of addressable hosts', function() {
      assert.equal(ipv4Subnet.numHosts, 1);
    });
  });

  describe('subnet() method with mask length 31', function() {
    // Test cases calculated with http://www.subnet-calculator.com/
    const ipv4Subnet = netpro.subnet('192.168.1.134', '255.255.255.254');
    it('should compute ipv4 network\'s first address', function() {
      assert.equal(ipv4Subnet.firstAddress, '192.168.1.134');
    });

    it('should compute ipv4 network\'s last address', function() {
      assert.equal(ipv4Subnet.lastAddress, '192.168.1.135');
    });

    it('should compute ipv4 subnet number of addressable hosts', function() {
      assert.equal(ipv4Subnet.numHosts, 2);
    });
  });

  describe('cidrSubnet() method', function() {
    // Test cases calculated with http://www.subnet-calculator.com/
    const ipv4Subnet = netpro.cidrSubnet('192.168.1.134/26');

    it('should compute an ipv4 network address', function() {
      assert.equal(ipv4Subnet.networkAddress, '192.168.1.128');
    });

    it('should compute an ipv4 network\'s first address', function() {
      assert.equal(ipv4Subnet.firstAddress, '192.168.1.129');
    });

    it('should compute an ipv4 network\'s last address', function() {
      assert.equal(ipv4Subnet.lastAddress, '192.168.1.190');
    });

    it('should compute an ipv4 broadcast address', function() {
      assert.equal(ipv4Subnet.broadcastAddress, '192.168.1.191');
    });

    it('should compute an ipv4 subnet number of addresses', function() {
      assert.equal(ipv4Subnet.length, 64);
    });

    it('should compute an ipv4 subnet number of addressable hosts', function() {
      assert.equal(ipv4Subnet.numHosts, 62);
    });

    it('should compute an ipv4 subnet mask', function() {
      assert.equal(ipv4Subnet.subnetMask, '255.255.255.192');
    });

    it('should compute an ipv4 subnet mask\'s length', function() {
      assert.equal(ipv4Subnet.subnetMaskLength, 26);
    });

    it('should know whether a subnet contains an address', function() {
      assert.equal(ipv4Subnet.contains('192.168.1.180'), true);
    });

    it('should know whether a subnet contains an address', function() {
      assert.equal(ipv4Subnet.contains('192.168.1.195'), false);
    });

  });

  describe('cidr() method', function() {
    it('should mask address in CIDR notation', function() {
      assert.equal(netpro.cidr('192.168.1.134/26'), '192.168.1.128');
      assert.equal(netpro.cidr('2607:f0d0:1002:51::4/56'), '2607:f0d0:1002::');
    });
  });

  describe('isEqual() method', function() {
    it('should check if addresses are equal', function() {
      assert(netpro.isEqual('127.0.0.1', '::7f00:1'));
      assert(!netpro.isEqual('127.0.0.1', '::7f00:2'));
      assert(netpro.isEqual('127.0.0.1', '::ffff:7f00:1'));
      assert(!netpro.isEqual('127.0.0.1', '::ffaf:7f00:1'));
      assert(netpro.isEqual('::ffff:127.0.0.1', '::ffff:127.0.0.1'));
      assert(netpro.isEqual('::ffff:127.0.0.1', '127.0.0.1'));
    });
  });


  describe('isPrivate() method', function() {
    it('should check if an address is localhost', function() {
      assert.equal(netpro.isPrivate('127.0.0.1'), true);
    });

    it('should check if an address is from a 192.168.x.x network', function() {
      assert.equal(netpro.isPrivate('192.168.0.123'), true);
      assert.equal(netpro.isPrivate('192.168.122.123'), true);
      assert.equal(netpro.isPrivate('192.162.1.2'), false);
    });

    it('should check if an address is from a 172.16.x.x network', function() {
      assert.equal(netpro.isPrivate('172.16.0.5'), true);
      assert.equal(netpro.isPrivate('172.16.123.254'), true);
      assert.equal(netpro.isPrivate('171.16.0.5'), false);
      assert.equal(netpro.isPrivate('172.25.232.15'), true);
      assert.equal(netpro.isPrivate('172.15.0.5'), false);
      assert.equal(netpro.isPrivate('172.32.0.5'), false);
    });

    it('should check if an address is from a 169.254.x.x network', function() {
      assert.equal(netpro.isPrivate('169.254.2.3'), true);
      assert.equal(netpro.isPrivate('169.254.221.9'), true);
      assert.equal(netpro.isPrivate('168.254.2.3'), false);
    });

    it('should check if an address is from a 10.x.x.x network', function() {
      assert.equal(netpro.isPrivate('10.0.2.3'), true);
      assert.equal(netpro.isPrivate('10.1.23.45'), true);
      assert.equal(netpro.isPrivate('12.1.2.3'), false);
    });

    it('should check if an address is from a private IPv6 network', function() {
      assert.equal(netpro.isPrivate('fd12:3456:789a:1::1'), true);
      assert.equal(netpro.isPrivate('fe80::f2de:f1ff:fe3f:307e'), true);
      assert.equal(netpro.isPrivate('::ffff:10.100.1.42'), true);
      assert.equal(netpro.isPrivate('::FFFF:172.16.200.1'), true);
      assert.equal(netpro.isPrivate('::ffff:192.168.0.1'), true);
    });

    it('should check if an address is from the internet', function() {
      assert.equal(netpro.isPrivate('165.225.132.33'), false); // joyent.com
    });

    it('should check if an address is a loopback IPv6 address', function() {
      assert.equal(netpro.isPrivate('::'), true);
      assert.equal(netpro.isPrivate('::1'), true);
      assert.equal(netpro.isPrivate('fe80::1'), true);
    });
  });

  describe('loopback() method', function() {
    describe('undefined', function() {
      it('should respond with 127.0.0.1', function() {
        assert.equal(netpro.loopback(), '127.0.0.1')
      });
    });

    describe('ipv4', function() {
      it('should respond with 127.0.0.1', function() {
        assert.equal(netpro.loopback('ipv4'), '127.0.0.1')
      });
    });

    describe('ipv6', function() {
      it('should respond with fe80::1', function() {
        assert.equal(netpro.loopback('ipv6'), 'fe80::1')
      });
    });
  });

  describe('isLoopback() method', function() {
    describe('127.0.0.1', function() {
      it('should respond with true', function() {
        assert.ok(netpro.isLoopback('127.0.0.1'))
      });
    });

    describe('127.8.8.8', function () {
      it('should respond with true', function () {
        assert.ok(netpro.isLoopback('127.8.8.8'))
      });
    });

    describe('8.8.8.8', function () {
      it('should respond with false', function () {
        assert.equal(netpro.isLoopback('8.8.8.8'), false);
      });
    });

    describe('fe80::1', function() {
      it('should respond with true', function() {
        assert.ok(netpro.isLoopback('fe80::1'))
      });
    });

    describe('::1', function() {
      it('should respond with true', function() {
        assert.ok(netpro.isLoopback('::1'))
      });
    });

    describe('::', function() {
      it('should respond with true', function() {
        assert.ok(netpro.isLoopback('::'))
      });
    });
  });

  describe('address() method', function() {
    describe('undefined', function() {
      it('should respond with a private ip', function() {
        assert.ok(netpro.isPrivate(netpro.address()));
      });
    });

    describe('private', function() {
      [ undefined, 'ipv4', 'ipv6' ].forEach(function(family) {
        describe(family, function() {
          it('should respond with a private ip', function() {
            assert.ok(netpro.isPrivate(netpro.address('private', family)));
          });
        });
      });
    });

    const interfaces = os.networkInterfaces();

    Object.keys(interfaces).forEach(function(nic) {
      describe(nic, function() {
        [ undefined, 'ipv4' ].forEach(function(family) {
          describe(family, function() {
            it('should respond with an ipv4 address', function() {
              const addr = netpro.address(nic, family);
              assert.ok(!addr || net.isIPv4(addr));
            });
          });
        });

        describe('ipv6', function() {
          it('should respond with an ipv6 address', function() {
            const addr = netpro.address(nic, 'ipv6');
            assert.ok(!addr || net.isIPv6(addr));
          });
        })
      });
    });
  });

  describe('toLong() method', function() {
    it('should respond with a int', function() {
      assert.equal(netpro.toLong('127.0.0.1'), 2130706433);
      assert.equal(netpro.toLong('255.255.255.255'), 4294967295);
    });
  });

  describe('fromLong() method', function() {
    it('should repond with ipv4 address', function() {
      assert.equal(netpro.fromLong(2130706433), '127.0.0.1');
      assert.equal(netpro.fromLong(4294967295), '255.255.255.255');
    });
  })
});
