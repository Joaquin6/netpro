const os = require('os');
const { Buffer } = require('buffer');

const IPV4 = 'ipv4';
const IPV6 = 'ipv6';
module.exports.IPV4 = IPV4;
module.exports.IPV6 = IPV6;

const ipv4Regex = /^(\d{1,3}\.){3,3}\d{1,3}$/;
const ipv6Regex = /^(::)?(((\d{1,3}\.){3}(\d{1,3}){1})?([0-9a-f]){0,4}:{0,2}){1,8}(::)?$/i;
module.exports.ipv4Regex = ipv4Regex;
module.exports.ipv6Regex = ipv6Regex;

const isV4Format = ip => ipv4Regex.test(ip);
const isV6Format = ip => ipv6Regex.test(ip);
module.exports.isV4Format = isV4Format;
module.exports.isV6Format = isV6Format;

/**
 * @param  {*}      obj   An object to fill the buffer with.
 *                        Supported types are:
 *                          - String
 *                          - Array
 *                          - Buffer
 *                          - ArrayBuffer
 * @param  {String} [encoding='utf8'] If the object is a string, this parameter is used to specify
 *                                    its encoding.
 * @return {Buffer}
 */
const toBufferFrom = (obj, encoding = 'hex') => Buffer.from(obj, encoding);
/**
 * @param  {Number}   size  Specifies the size of the buffer
 * @param  {String}   fill  Specifies a value to fill the buffer with if specified, otherwise the
 *                          buffer is filled with 0 (zero-filled)
 * @param  {String}   [encoding='utf8'] If the object is a string, this parameter is used to
 *                                      specify its encoding.
 * @return {Buffer}
 */
const toBufferAlloc = (size, fill, encoding = 'hex') => (!fill
  ? Buffer.allocUnsafe(size) : Buffer.alloc(size, fill, encoding));
const normalizeFamily = (family = IPV4) => family.toLowerCase();

module.exports.toBufferFrom = toBufferFrom;
module.exports.toBufferAlloc = toBufferAlloc;
module.exports.normalizeFamily = normalizeFamily;

const fromLong = ipl => `${ipl >>> 24}.${ipl >> 16 & 255}.${ipl >> 8 & 255}.${ipl & 255}`;

module.exports.fromLong = fromLong;

const isPrivate = addr => /^(::f{4}:)?10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr)
    || /^(::f{4}:)?192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr)
    || /^(::f{4}:)?172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr)
    || /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr)
    || /^(::f{4}:)?169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr)
    || /^f[cd][0-9a-f]{2}:/i.test(addr)
    || /^fe80:/i.test(addr)
    || /^::1$/.test(addr)
    || /^::$/.test(addr);

module.exports.isPrivate = isPrivate;

const isPublic = addr => isPrivate(addr);

module.exports.isPublic = isPublic;

const toLong = ip => {
  let ipl = 0;

  ip.split('.').forEach(octet => {
    ipl <<= 8;
    ipl += parseInt(octet, 10);
  });

  return (ipl >>> 0);
};

module.exports.toLong = toLong;

const loopback = (ipv = IPV4) => {
  const family = normalizeFamily(ipv);

  if (family !== IPV4 && family !== IPV6) {
    throw new Error('family must be ipv4 or ipv6');
  }

  return family === IPV4 ? '127.0.0.1' : 'fe80::1';
};

module.exports.loopback = loopback;

const netproToBuffer = (ip, buff, offs) => {
  let result;
  let offset = ~~offs;

  if (isV4Format(ip)) {
    result = buff || toBufferAlloc(offset + 4);

    ip.split(/\./g).map(byte => {
      const val = parseInt(byte, 10) & 0xff;
      result[offset++] = val;
      return val;
    });
  } else if (isV6Format(ip)) {
    let i;
    const sections = ip.split(':', 8);

    for (i = 0; i < sections.length; i++) {
      let v4Buffer;
      const sec = sections[i];

      if (isV4Format(sec)) {
        v4Buffer = netproToBuffer(sec);
        sections[i] = v4Buffer.slice(0, 2).toString('hex');
      }

      if (v4Buffer && ++i < 8) {
        sections.splice(i, 0, v4Buffer.slice(2, 4).toString('hex'));
      }
    }

    if (sections[0] === '') {
      while (sections.length < 8) {
        sections.unshift('0');
      }
    } else if (sections[sections.length - 1] === '') {
      while (sections.length < 8) {
        sections.push('0');
      }
    } else if (sections.length < 8) {
      i = 0;

      for (let x = 0; i < sections.length && sections[x] !== ''; x++) {
        i += 1;
      }

      const argv = [i, 1];

      for (i = 9 - sections.length; i > 0; i--) {
        argv.push('0');
      }

      sections.splice.apply(sections, argv); // eslint-disable-line prefer-spread
    }

    result = buff || toBufferAlloc(offset + 16);

    for (i = 0; i < sections.length; i++) {
      const word = parseInt(sections[i], 16);

      result[offset++] = (word >> 8) & 0xff;
      result[offset++] = word & 0xff;
    }
  }

  if (!result) {
    throw Error(`Invalid ip address: ${ip}`);
  }

  return result;
};

module.exports.toBuffer = netproToBuffer;

const netproToString = (buff, offs, lgth) => {
  const offset = ~~offs;
  const length = lgth || (buff.length - offset);
  let result = [];

  if (length === 4) {
    /** IPv4 */

    for (let i = 0; i < length; i++) {
      result.push(buff[offset + i]);
    }

    result = result.join('.');
  } else if (length === 16) {
    /** IPv6 */

    for (let i = 0; i < length; i += 2) {
      result.push(buff.readUInt16BE(offset + i).toString(16));
    }

    result = result.join(':');
    result = result.replace(/(^|:)0(:0)*:0(:|$)/, '$1::$3');
    result = result.replace(/:{3,4}/, '::');
  }

  return result;
};

module.exports.toString = netproToString;

const fromPrefixLen = (prefixLength, ipv = IPV4) => {
  let prefixlen = prefixLength;
  const family = prefixlen > 32 ? IPV6 : normalizeFamily(ipv);
  const buff = toBufferAlloc(family === IPV6 ? 16 : 4);

  for (let i = 0, n = buff.length; i < n; ++i) {
    let bits = 8;

    if (prefixlen < 8) {
      bits = prefixlen;
    }

    prefixlen -= bits;

    buff[i] = ~(0xff >> bits) & 0xff;
  }

  return netproToString(buff);
};

const mask = (addr, mk) => {
  const bufAddr = netproToBuffer(addr);
  const burMask = netproToBuffer(mk);

  const result = toBufferAlloc(Math.max(bufAddr.length, burMask.length));

  let i = 0;

  // Same protocol - do bitwise and
  if (bufAddr.length === burMask.length) {
    for (i = 0; i < bufAddr.length; i++) {
      result[i] = bufAddr[i] & burMask[i];
    }
  } else if (burMask.length === 4) {
    // IPv6 address and IPv4 mask
    // (Mask low bits)
    for (i = 0; i < burMask.length; i++) {
      result[i] = bufAddr[bufAddr.length - 4 + i] & burMask[i];
    }
  } else {
    // IPv6 mask and IPv4 addr
    for (i = 0; i < result.length - 6; i++) {
      result[i] = 0;
    }

    // ::ffff:ipv4
    result[10] = 0xff;
    result[11] = 0xff;
    for (i = 0; i < bufAddr.length; i++) {
      result[i + 12] = bufAddr[i] & burMask[i + 12];
    }
    i += 12;
  }

  for (; i < result.length; i++) {
    result[i] = 0;
  }

  return netproToString(result);
};

const cidr = cidrString => {
  const cidrParts = cidrString.split('/');
  const addr = cidrParts[0];

  if (cidrParts.length !== 2) {
    throw new Error(`invalid CIDR subnet: ${addr}`);
  }

  return mask(addr, fromPrefixLen(parseInt(cidrParts[1], 10)));
};

const subnet = (addr, mk) => {
  const networkAddress = toLong(mask(addr, mk));

  // Calculate the mask's length.
  const maskBuffer = netproToBuffer(mk);
  let maskLength = 0;

  for (let i = 0; i < maskBuffer.length; i++) {
    if (maskBuffer[i] === 0xff) {
      maskLength += 8;
    } else {
      let octet = maskBuffer[i] & 0xff;
      while (octet) {
        octet = (octet << 1) & 0xff;
        maskLength++;
      }
    }
  }

  const numberOfAddresses = 2 ** (32 - maskLength);

  return {
    networkAddress: fromLong(networkAddress),
    firstAddress: numberOfAddresses <= 2
      ? fromLong(networkAddress)
      : fromLong(networkAddress + 1),
    lastAddress: numberOfAddresses <= 2
      ? fromLong(networkAddress + numberOfAddresses - 1)
      : fromLong(networkAddress + numberOfAddresses - 2),
    broadcastAddress: fromLong(networkAddress + numberOfAddresses - 1),
    subnetMask: mk,
    subnetMaskLength: maskLength,
    numHosts: numberOfAddresses <= 2
      ? numberOfAddresses : numberOfAddresses - 2,
    length: numberOfAddresses,
    contains(other) {
      return networkAddress === toLong(mask(other, mk));
    },
  };
};

const cidrSubnet = cidrString => {
  const cidrParts = cidrString.split('/');
  const addr = cidrParts[0];

  if (cidrParts.length !== 2) {
    throw new Error(`invalid CIDR subnet: ${addr}`);
  }

  return subnet(addr, fromPrefixLen(parseInt(cidrParts[1], 10)));
};

module.exports.fromPrefixLen = fromPrefixLen;
module.exports.mask = mask;
module.exports.cidr = cidr;
module.exports.subnet = subnet;
module.exports.cidrSubnet = cidrSubnet;

const not = addr => {
  const buff = netproToBuffer(addr);

  for (let i = 0; i < buff.length; i++) {
    const b = buff[i];

    buff[i] = 0xff ^ b;
  }

  return netproToString(buff);
};

const or = (a, b) => {
  const bufA = netproToBuffer(a);
  const bufB = netproToBuffer(b);

  // same protocol
  if (bufA.length === bufB.length) {
    for (let i = 0; i < bufA.length; ++i) {
      bufA[i] |= bufB[i];
    }

    return netproToString(bufA);
  }

  // mixed protocols
  let buff = bufA;
  let other = bufB;

  if (bufB.length > bufA.length) {
    buff = bufB;
    other = bufA;
  }

  const offset = buff.length - other.length;

  for (let i = offset; i < buff.length; ++i) {
    buff[i] |= other[i - offset];
  }

  return netproToString(buff);
};

const isEqual = (a, b) => {
  let bufA = netproToBuffer(a);
  let bufB = netproToBuffer(b);

  // Same protocol
  if (bufA.length === bufB.length) {
    for (let i = 0; i < bufA.length; i++) {
      if (bufA[i] !== bufB[i]) {
        return false;
      }
    }

    return true;
  }

  // Swap
  if (bufB.length === 4) {
    const t = bufB;
    bufB = bufA;
    bufA = t;
  }

  // a - IPv4, b - IPv6
  for (let i = 0; i < 10; i++) {
    if (bufB[i] !== 0) {
      return false;
    }
  }

  const word = bufB.readUInt16BE(10);

  if (word !== 0 && word !== 0xffff) {
    return false;
  }

  for (let i = 0; i < 4; i++) {
    if (bufA[i] !== bufB[i + 12]) {
      return false;
    }
  }

  return true;
};

const isLoopback = addr => /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/.test(addr)
  || /^fe80::1$/.test(addr)
  || /^::1$/.test(addr)
  || /^::$/.test(addr);

module.exports.not = not;
module.exports.or = or;
module.exports.isEqual = isEqual;
module.exports.isLoopback = isLoopback;

//
// ### function address (name, family)
// #### @name {string|'public'|'private'} **Optional** Name or security
//      of the network interface.
// #### @family {ipv4|ipv6} **Optional** IP family of the address (defaults
//      to ipv4).
//
// Returns the address for the network interface on the current system with
// the specified `name`:
//   * String: First `family` address of the interface.
//             If not found see `undefined`.
//   * 'public': the first public ip address of family.
//   * 'private': the first private ip address of family.
//   * undefined: First address with `ipv4` or loopback address `127.0.0.1`.
//
const address = (name, ipv) => {
  const interfaces = os.networkInterfaces();

  //
  // Default to `ipv4`
  //
  const family = normalizeFamily(ipv);

  //
  // If a specific network interface has been named,
  // return the address.
  //
  if (name && name !== 'private' && name !== 'public') {
    const res = interfaces[name].filter((details) => {
      const itemFamily = details.family.toLowerCase();
      return itemFamily === family;
    });
    if (res.length === 0) { return undefined; }
    return res[0].address;
  }

  const all = Object.keys(interfaces).map(key => {
    //
    // Note: name will only be `public` or `private`
    // when this is called.
    //
    const addresses = interfaces[key].filter(({ address: addr, family: fam }) => {
      if (fam.toLowerCase() !== family || isLoopback(addr)) {
        return false;
      }

      if (!name) {
        return true;
      }

      return name === 'public' ? isPrivate(addr) : isPublic(addr);
    });

    return addresses.length ? addresses[0].address : undefined;
  }).filter(Boolean);

  return !all.length ? loopback(family) : all[0];
};

module.exports.address = address;
