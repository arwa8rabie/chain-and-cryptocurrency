"use strict";

const crypto = require('crypto');
const keypair = require('keypair');
const EventEmitter = require('events');

const SIG_ALG = 'RSA-SHA256';

const JOIN = "JOIN_NETWORK_REQUEST";
const SYNC = "SYNC_LEDGER";
const XFER = "XFER_FUNDS";

class Client extends EventEmitter {
  constructor(name, net) {
    super();
    this.name = name;
    this.net = net;

    this.keypair = keypair();
    this.net.registerMiner(this);

    this.ledger = undefined;
    this.clients = undefined;

    this.on(JOIN, this.addClient);
    this.on(XFER, this.updateLedger);
    this.on(SYNC, this.initialize);

    this.join();
  }

  join() {
    let msg = { name: this.name, pubKey: this.keypair.public };
    this.net.broadcast(JOIN, msg);
  }

  initialize({ledger, clients, name, signature}) {
    if (this.ledger !== undefined && this.clients !== undefined) return;

    this.ledger = ledger;
    this.clients = clients;
  }

  addClient({name, pubKey}) {
    if (this.ledger === undefined || this.clients === undefined) return;
    if (this.ledger[name] !== undefined) {
      this.log(`${name} already exists in the network.`);
      return;
    }

    this.ledger[name] = 0;
    this.clients[name] = pubKey;

    this.net.send(name, SYNC, {ledger: this.ledger, clients: this.clients});
  }

  give(name, amount) {
    let message = {
      from: this.name,
      to: name,
      amount: amount,
    };

    let signature = this.signObject(message);
    this.net.broadcast(XFER, {message: message, signature: signature});
  }

  updateLedger({message, signature}) {
    if (this.ledger === undefined) return;

    let valid = this.verifySignature({message, name: message.from, signature});
    if (!valid) { 
      this.log("Signature verification failed.");
      this.punishCheater(message.from);
      return;
    }
    if (this.ledger[message.from] === undefined) {
      this.log(`Sender ${message.from} does not exist.`);
      return;
    }
    if (this.ledger[message.to] === undefined) {
      this.log(`Recipient ${message.to} does not exist.`);
      return;
    }
    if (this.ledger[message.from] < message.amount) {
      this.punishCheater(message.from);
      this.log(`Sender ${message.from} has insufficient funds.`);
      return;
    }
    this.ledger[message.from] -= message.amount;
    this.ledger[message.to] += message.amount;
    this.log(`Funds transferred from ${message.from} to ${message.to}.`);
  }

  punishCheater(name) {
    this.log(`Cheater ${name} punished!`);
  }

  signObject(o) {
    let s = JSON.stringify(o);
    let signer = crypto.createSign(SIG_ALG);
    return signer.update(s).sign(this.keypair.private, 'hex');
  }

  verifySignature({message, name, signature}) {
    let s = JSON.stringify(message);
    let verifier = crypto.createVerify(SIG_ALG);
    let pubKey = this.clients[name];
    try {
      return verifier.update(s).verify(pubKey, signature, 'hex');
    } catch (e) {
      this.log(`Error validating signature: ${e.message}`);
      return false;
    }
  }

  showLedger() {
    let s = JSON.stringify(this.ledger);
    this.log(s);
  }

  log(m) {
    console.log(this.name + " >>> " + m);
  }
}

exports.Client = Client;
exports.JOIN = JOIN;
exports.SYNC = SYNC;
exports.XFER = XFER;
