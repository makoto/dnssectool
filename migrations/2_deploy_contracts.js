var DNSSEC            = artifacts.require("@ensdomains/dnssec-oracle/DNSSECImpl.sol");
var rsasha1           = artifacts.require("@ensdomains/dnssec-oracle/RSASHA1Algorithm.sol");
var rsasha256         = artifacts.require("@ensdomains/dnssec-oracle/RSASHA256Algorithm.sol");
var sha1              = artifacts.require("@ensdomains/dnssec-oracle/SHA1Digest.sol");
var sha256            = artifacts.require("@ensdomains/dnssec-oracle/SHA256Digest.sol");
var nsec3sha1         = artifacts.require("@ensdomains/dnssec-oracle/SHA1NSEC3Digest.sol");
var DNSRegistrar      = artifacts.require("@ensdomains/dnsregistrar/DNSRegistrar.sol");
var ENSRegistry       = artifacts.require("@ensdomains/ens/ENSRegistry.sol");
var namehash = require('eth-ens-namehash');
var packet   = require('dns-packet');
var dns      = require("@ensdomains/dnssec-oracle/lib/dns.js");
var anchors  = dns.anchors;

var tld = "xyz";
let ens, algorithm, digest;

function hexEncodeName(name){
  return '0x' + packet.name.encode(name).toString('hex');
}

module.exports = function(deployer) {
  return deployer.deploy(DNSSEC, dns.encodeAnchors(anchors))
    .then(() => deployer.deploy([[ENSRegistry], [rsasha256], [rsasha1], [sha256], [sha1], [nsec3sha1]]))
    .then(() => ENSRegistry.deployed().then(_ens => ens = _ens))
    .then(() => DNSSEC.deployed().then(_dnssec => dnssec = _dnssec))
    .then(() => deployer.deploy(DNSRegistrar, dnssec.address, ens.address))
    .then(() => DNSRegistrar.deployed().then(_registrar => registrar = _registrar))
    .then(() => ENSRegistry.deployed().then(_ens => _ens.setSubnodeOwner(0, web3.sha3(tld), registrar.address)))
    .then(() => DNSSEC.deployed().then((_dnssec) => {
      tasks = [];
      tasks.push(rsasha1.deployed().then(async function(algorithm) {
        await dnssec.setAlgorithm(5, algorithm.address);
        await dnssec.setAlgorithm(7, algorithm.address);
      }));
      tasks.push(rsasha256.deployed().then((algorithm) => dnssec.setAlgorithm(8, algorithm.address)));
      tasks.push(sha1.deployed().then((digest) => dnssec.setDigest(1, digest.address)));
      tasks.push(sha256.deployed().then((digest) => dnssec.setDigest(2, digest.address)));
      tasks.push(nsec3sha1.deployed().then((digest) => dnssec.setNSEC3Digest(1, digest.address)));
      return Promise.all(tasks);
    }));
};
