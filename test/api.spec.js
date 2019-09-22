const os = require('os');
const net = require('net');
const assert = require('assert');
const netpro = require('..');

// @TODO: Update syntax to Jest
// @TODO: Drop assert in favor of Jest Expect

describe('IP library for node.js', () => {
  const hexRegex = /(00){15,15}01/;
  const offset = 64;
  const ipv4Offset = offset + 4;
  const encoding = 'hex';
  const testIPv6 = 'abcd::dcba';
  const localIPv4 = '127.0.0.1';
  const localIPv6 = '::1';
  const localIPv6Reverse = '1::';
  const encodedBufferAddress = '7f000001';

  describe('toBuffer()/toString() methods', () => {
    describe('IPv4 Address', () => {
      let buf;

      beforeEach(() => {
        buf = netpro.toBuffer(localIPv4);
      });

      it('should convert to ipv4 buffer', () => {
        expect(buf.toString(encoding)).toEqual(encodedBufferAddress);
        expect(netpro.toString(buf)).toEqual(localIPv4);
      });

      it('should convert to ipv4 buffer in-place', () => {
        buf = netpro.toBufferAlloc(128);

        netpro.toBuffer(localIPv4, buf, offset);

        expect(buf.toString(encoding, offset, ipv4Offset)).toEqual(encodedBufferAddress);
        expect(netpro.toString(buf, offset, 4)).toEqual(localIPv4);
      });
    });

    describe('IPv6 Address', () => {
      let buf;

      beforeEach(() => {
        buf = netpro.toBuffer(localIPv6);
      });

      it('should convert to ipv6 buffer', () => {
        expect(buf.toString(encoding)).toEqual(expect.stringMatching(hexRegex));
        expect(netpro.toString(buf)).toEqual(localIPv6);
        expect(netpro.toString(netpro.toBuffer(testIPv6))).toEqual(testIPv6);
        expect(netpro.toString(netpro.toBuffer(localIPv6Reverse))).toEqual(localIPv6Reverse);
      });

      it('should convert to ipv6 buffer in-place', () => {
        buf = netpro.toBuffer(localIPv6, buf, 16);

        expect(netpro.toString(buf)).toEqual(localIPv6);
        expect(netpro.toString(netpro.toBuffer(localIPv6Reverse, buf))).toEqual(localIPv6Reverse);
        expect(netpro.toString(netpro.toBuffer(testIPv6, buf))).toEqual(testIPv6);
      });
    });

    describe('IPv6 Address to Mapped IPv4 Address', () => {
      it('should convert to buffer mapped address', () => {
        let buf = netpro.toBuffer('::ffff:127.0.0.1');
        expect(buf.toString(encoding)).toEqual('00000000000000000000ffff7f000001');
        expect(netpro.toString(buf)).toEqual('::ffff:7f00:1');

        buf = netpro.toBuffer('ffff::127.0.0.1');
        expect(buf.toString(encoding)).toEqual('ffff000000000000000000007f000001');
        expect(netpro.toString(buf)).toEqual('ffff::7f00:1');

        buf = netpro.toBuffer('0:0:0:0:0:ffff:127.0.0.1');
        expect(buf.toString(encoding)).toEqual('00000000000000000000ffff7f000001');
        expect(netpro.toString(buf)).toEqual('::ffff:7f00:1');
      });
    });
  });

  describe('fromPrefixLen() method', () => {
    it('should create IPv4 mask', () => {
      expect(netpro.fromPrefixLen(24)).toEqual('255.255.255.0');
    });

    it('should create IPv6 mask', () => {
      expect(netpro.fromPrefixLen(64)).toEqual('ffff:ffff:ffff:ffff::');
    });

    it('should create IPv6 mask explicitly', () => {
      expect(netpro.fromPrefixLen(24, 'ipv6')).toEqual('ffff:ff00::');
    });
  });

  describe('not() method', () => {
    it('should reverse bits in address', () => {
      assert.strictEqual(netpro.not('255.255.255.0'), '0.0.0.255');
    });
  });

  describe('or() method', () => {
    it('should or bits in ipv4 addresses', () => expect(netpro.or('0.0.0.255', '192.168.1.10'))
      .toEqual('192.168.1.255'));

    it('should or bits in ipv6 addresses', () => expect(netpro.or('::ff', '::abcd:dcba:abcd:dcba'))
      .toEqual('::abcd:dcba:abcd:dcff'));

    it('should or bits in mixed addresses', () => expect(netpro
      .or('0.0.0.255', '::abcd:dcba:abcd:dcba')).toEqual('::abcd:dcba:abcd:dcff'));
  });

  describe('mask() method', () => {
    it('should mask bits in address', () => {
      expect(netpro.mask('192.168.1.134', '255.255.255.0')).toEqual('192.168.1.0');
      expect(netpro.mask('192.168.1.134', '::ffff:ff00')).toEqual('::ffff:c0a8:100');
    });

    it('should not leak data', () => {
      for (let i = 0; i < 10; i++) {
        expect(netpro.mask('::1', '0.0.0.0')).toEqual('::');
      }
    });
  });

  describe('subnet() method', () => {
    // Test cases calculated with http://www.subnet-calculator.com/
    const ipv4Subnet = netpro.subnet('192.168.1.134', '255.255.255.192');

    it('should compute ipv4 network address', () => {
      expect(ipv4Subnet.networkAddress).toEqual('192.168.1.128');
    });

    it('should compute ipv4 network\'s first address', () => {
      expect(ipv4Subnet.firstAddress).toEqual('192.168.1.129');
    });

    it('should compute ipv4 network\'s last address', () => {
      expect(ipv4Subnet.lastAddress).toEqual('192.168.1.190');
    });

    it('should compute ipv4 broadcast address', () => {
      expect(ipv4Subnet.broadcastAddress).toEqual('192.168.1.191');
    });

    it('should compute ipv4 subnet number of addresses', () => {
      expect(ipv4Subnet.length).toEqual(64);
    });

    it('should compute ipv4 subnet number of addressable hosts', () => {
      expect(ipv4Subnet.numHosts).toEqual(62);
    });

    it('should compute ipv4 subnet mask', () => {
      expect(ipv4Subnet.subnetMask).toEqual('255.255.255.192');
    });

    it('should compute ipv4 subnet mask\'s length', () => {
      expect(ipv4Subnet.subnetMaskLength).toEqual(26);
    });

    it('should know whether a subnet contains an address', () => {
      expect(ipv4Subnet.contains('192.168.1.180')).toBeTruthy();
      expect(ipv4Subnet.contains('192.168.1.195')).toBeFalsy();
    });
  });

  describe('subnet() method with mask length 32', () => {
    // Test cases calculated with http://www.subnet-calculator.com/
    const ipv4Subnet = netpro.subnet('192.168.1.134', '255.255.255.255');
    it('should compute ipv4 network\'s first address', () => {
      assert.strictEqual(ipv4Subnet.firstAddress, '192.168.1.134');
    });

    it('should compute ipv4 network\'s last address', () => {
      assert.strictEqual(ipv4Subnet.lastAddress, '192.168.1.134');
    });

    it('should compute ipv4 subnet number of addressable hosts', () => {
      assert.strictEqual(ipv4Subnet.numHosts, 1);
    });
  });

  describe('subnet() method with mask length 31', () => {
    // Test cases calculated with http://www.subnet-calculator.com/
    const ipv4Subnet = netpro.subnet('192.168.1.134', '255.255.255.254');
    it('should compute ipv4 network\'s first address', () => {
      assert.strictEqual(ipv4Subnet.firstAddress, '192.168.1.134');
    });

    it('should compute ipv4 network\'s last address', () => {
      assert.strictEqual(ipv4Subnet.lastAddress, '192.168.1.135');
    });

    it('should compute ipv4 subnet number of addressable hosts', () => {
      assert.strictEqual(ipv4Subnet.numHosts, 2);
    });
  });

  describe('cidrSubnet() method', () => {
    // Test cases calculated with http://www.subnet-calculator.com/
    const ipv4Subnet = netpro.cidrSubnet('192.168.1.134/26');

    it('should compute an ipv4 network address', () => {
      expect(ipv4Subnet.networkAddress).toEqual('192.168.1.128');
    });

    it('should compute an ipv4 network\'s first address', () => {
      expect(ipv4Subnet.firstAddress).toEqual('192.168.1.129');
    });

    it('should compute an ipv4 network\'s last address', () => {
      expect(ipv4Subnet.lastAddress).toEqual('192.168.1.190');
    });

    it('should compute an ipv4 broadcast address', () => {
      expect(ipv4Subnet.broadcastAddress).toEqual('192.168.1.191');
    });

    it('should compute an ipv4 subnet number of addresses', () => {
      expect(ipv4Subnet.length).toEqual(64);
    });

    it('should compute an ipv4 subnet number of addressable hosts', () => {
      expect(ipv4Subnet.numHosts).toEqual(62);
    });

    it('should compute an ipv4 subnet mask', () => {
      expect(ipv4Subnet.subnetMask).toEqual('255.255.255.192');
    });

    it('should compute an ipv4 subnet mask\'s length', () => {
      expect(ipv4Subnet.subnetMaskLength).toEqual(26);
    });

    it('should know whether a subnet contains an address', () => {
      expect(ipv4Subnet.contains('192.168.1.180')).toBeTruthy();
      expect(ipv4Subnet.contains('192.168.1.195')).toBeFalsy();
    });
  });

  describe('cidr() method', () => {
    it('should mask address in CIDR notation', () => {
      assert.strictEqual(netpro.cidr('192.168.1.134/26'), '192.168.1.128');
      assert.strictEqual(netpro.cidr('2607:f0d0:1002:51::4/56'), '2607:f0d0:1002::');
    });
  });

  describe('isEqual() method', () => {
    it('should check if addresses are equal', () => {
      assert(netpro.isEqual(localIPv4, '::7f00:1'));
      assert(!netpro.isEqual(localIPv4, '::7f00:2'));
      assert(netpro.isEqual(localIPv4, '::ffff:7f00:1'));
      assert(!netpro.isEqual(localIPv4, '::ffaf:7f00:1'));
      assert(netpro.isEqual('::ffff:127.0.0.1', '::ffff:127.0.0.1'));
      assert(netpro.isEqual('::ffff:127.0.0.1', '127.0.0.1'));
    });
  });

  describe('isPrivate() method', () => {
    it('should check if an address is localhost', () => {
      assert.strictEqual(netpro.isPrivate(localIPv4), true);
    });

    it('should check if an address is from a 192.168.x.x network', () => {
      assert.strictEqual(netpro.isPrivate('192.168.0.123'), true);
      assert.strictEqual(netpro.isPrivate('192.168.122.123'), true);
      assert.strictEqual(netpro.isPrivate('192.162.1.2'), false);
    });

    it('should check if an address is from a 172.16.x.x network', () => {
      assert.strictEqual(netpro.isPrivate('172.16.0.5'), true);
      assert.strictEqual(netpro.isPrivate('172.16.123.254'), true);
      assert.strictEqual(netpro.isPrivate('171.16.0.5'), false);
      assert.strictEqual(netpro.isPrivate('172.25.232.15'), true);
      assert.strictEqual(netpro.isPrivate('172.15.0.5'), false);
      assert.strictEqual(netpro.isPrivate('172.32.0.5'), false);
    });

    it('should check if an address is from a 169.254.x.x network', () => {
      assert.strictEqual(netpro.isPrivate('169.254.2.3'), true);
      assert.strictEqual(netpro.isPrivate('169.254.221.9'), true);
      assert.strictEqual(netpro.isPrivate('168.254.2.3'), false);
    });

    it('should check if an address is from a 10.x.x.x network', () => {
      assert.strictEqual(netpro.isPrivate('10.0.2.3'), true);
      assert.strictEqual(netpro.isPrivate('10.1.23.45'), true);
      assert.strictEqual(netpro.isPrivate('12.1.2.3'), false);
    });

    it('should check if an address is from a private IPv6 network', () => {
      assert.strictEqual(netpro.isPrivate('fd12:3456:789a:1::1'), true);
      assert.strictEqual(netpro.isPrivate('fe80::f2de:f1ff:fe3f:307e'), true);
      assert.strictEqual(netpro.isPrivate('::ffff:10.100.1.42'), true);
      assert.strictEqual(netpro.isPrivate('::FFFF:172.16.200.1'), true);
      assert.strictEqual(netpro.isPrivate('::ffff:192.168.0.1'), true);
    });

    it('should check if an address is from the internet', () => {
      assert.strictEqual(netpro.isPrivate('165.225.132.33'), false); // joyent.com
    });

    it('should check if an address is a loopback IPv6 address', () => {
      assert.strictEqual(netpro.isPrivate('::'), true);
      assert.strictEqual(netpro.isPrivate(localIPv6), true);
      assert.strictEqual(netpro.isPrivate('fe80::1'), true);
    });
  });

  describe('loopback() method', () => {
    describe('undefined', () => {
      it('should respond with 127.0.0.1', () => {
        assert.strictEqual(netpro.loopback(), '127.0.0.1');
      });
    });

    describe('ipv4', () => {
      it('should respond with 127.0.0.1', () => {
        assert.strictEqual(netpro.loopback('ipv4'), '127.0.0.1');
      });
    });

    describe('ipv6', () => {
      it('should respond with fe80::1', () => {
        assert.strictEqual(netpro.loopback('ipv6'), 'fe80::1');
      });
    });
  });

  describe('isLoopback() method', () => {
    describe('127.0.0.1', () => {
      it('should respond with true', () => {
        expect(netpro.isLoopback(localIPv4)).toBeTruthy();
      });
    });

    describe('127.8.8.8', () => {
      it('should respond with true', () => {
        expect(netpro.isLoopback('127.8.8.8')).toBeTruthy();
      });
    });

    describe('8.8.8.8', () => {
      it('should respond with false', () => {
        assert.strictEqual(netpro.isLoopback('8.8.8.8'), false);
      });
    });

    describe('fe80::1', () => {
      it('should respond with true', () => {
        expect(netpro.isLoopback('fe80::1')).toBeTruthy();
      });
    });

    describe('::1', () => {
      it('should respond with true', () => {
        expect(netpro.isLoopback(localIPv6)).toBeTruthy();
      });
    });

    describe('::', () => {
      it('should respond with true', () => {
        expect(netpro.isLoopback('::')).toBeTruthy();
      });
    });
  });

  describe('address() method', () => {
    describe('undefined', () => {
      it('should respond with a private ip', () => {
        expect(netpro.isPrivate(netpro.address())).toBeTruthy();
      });
    });

    describe('private', () => {
      [undefined, 'ipv4', 'ipv6'].forEach((family) => {
        describe(`${family}`, () => {
          it('should respond with a private ip', () => {
            expect(netpro.isPrivate(netpro.address('private', family))).toBeTruthy();
          });
        });
      });
    });

    const interfaces = os.networkInterfaces();

    Object.keys(interfaces).forEach((nic) => {
      describe(`${nic}`, () => {
        [undefined, 'ipv4'].forEach((family) => {
          describe(`${family}`, () => {
            it('should respond with an ipv4 address', () => {
              const addr = netpro.address(nic, family);
              expect(!addr || net.isIPv4(addr)).toBeTruthy();
            });
          });
        });

        describe('ipv6', () => {
          it('should respond with an ipv6 address', () => {
            const addr = netpro.address(nic, 'ipv6');
            expect(!addr || net.isIPv6(addr)).toBeTruthy();
          });
        });
      });
    });
  });

  describe('toLong() method', () => {
    it('should respond with a int', () => {
      assert.strictEqual(netpro.toLong(localIPv4), 2130706433);
      assert.strictEqual(netpro.toLong('255.255.255.255'), 4294967295);
    });
  });

  describe('fromLong() method', () => {
    it('should repond with ipv4 address', () => {
      assert.strictEqual(netpro.fromLong(2130706433), '127.0.0.1');
      assert.strictEqual(netpro.fromLong(4294967295), '255.255.255.255');
    });
  });
});
