"use strict";

const blindSignatures = require('blind-signatures');
const { Coin, COIN_RIS_LENGTH, IDENT_STR, BANK_STR } = require('./coin.js');
const utils = require('./utils.js');

// دوال إضافية هنا بدل تعديل utils.js
function xor(buf1, buf2) {
  if (buf1.length !== buf2.length) throw new Error("Buffers must be the same length");
  let result = Buffer.alloc(buf1.length);
  for (let i = 0; i < buf1.length; i++) {
    result[i] = buf1[i] ^ buf2[i];
  }
  return result;
}

function extractId(buffer) {
  return buffer.toString().split(':')[1];
}

// توليد مفتاح البنك
const BANK_KEY = blindSignatures.keyGeneration({ b: 2048 });
const N = BANK_KEY.keyPair.n; // بدون toString
const E = BANK_KEY.keyPair.e;

function signCoin(blindedCoinHash) {
  return blindSignatures.sign({
    blinded: blindedCoinHash,
    key: BANK_KEY,
  });
}

function parseCoin(s) {
  let [cnst, amt, guid, leftHashes, rightHashes] = s.split('-');
  if (cnst !== BANK_STR) {
    throw new Error(`Invalid identity string: ${cnst} received, but ${BANK_STR} expected`);
  }
  let lh = leftHashes.split(',');
  let rh = rightHashes.split(',');
  return [lh, rh];
}

function acceptCoin(coin) {
  const isValid = blindSignatures.verify({
    message: coin.toString(),
    signature: coin.signature,
    key: BANK_KEY,
  });

  if (!isValid) {
    throw new Error("Invalid signature.");
  }

  const [leftHashes, rightHashes] = parseCoin(coin.toString());
  const selectedHashes = Math.random() < 0.5 ? leftHashes : rightHashes;

  return selectedHashes;
}

function determineCheater(guid, ris1, ris2) {
  for (let i = 0; i < ris1.length; i++) {
    const pairXor = xor(Buffer.from(ris1[i], 'hex'), Buffer.from(ris2[i], 'hex'));
    if (pairXor.toString().startsWith(IDENT_STR)) {
      const cheaterId = extractId(pairXor);
      console.log(`Cheater identified: ${cheaterId}`);
      return;
    }
  }
  console.log("Merchant is the cheater.");
}

// إنشاء عملة جديدة
let coin = new Coin('alice', 20, N, E);
coin.signature = signCoin(coin.blinded);
coin.unblind();

let ris1 = acceptCoin(coin);
let ris2 = acceptCoin(coin);

determineCheater(coin.guid, ris1, ris2);
console.log();
determineCheater(coin.guid, ris1, ris1);
