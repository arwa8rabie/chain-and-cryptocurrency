"use strict";

let blindSignatures = require('blind-signatures');

let SpyAgency = require('./spyAgency.js').SpyAgency;

function makeDocument(coverName) {
  return `The bearer of this signed document, ${coverName}, has full diplomatic immunity.`;
}

function blind(msg, n, e) {
  return blindSignatures.blind({
    message: msg,
    N: agency.n,
    E: agency.e,
  });
}

function unblind(blindingFactor, sig, n) {
  return blindSignatures.unblind({
    signed: sig,
    N: n,
    r: blindingFactor,
  });
}

let agency = new SpyAgency();

let blindDocs = [];
let blindingFactors = [];
for (let i = 0; i < 10; i++) {
  let coverName = `CoverIdentity${i + 1}`;
  let doc = makeDocument(coverName);
  let { blindingFactor, blinded } = blind(doc, agency.n, agency.e);
  blindDocs.push(blinded);
  blindingFactors.push(blindingFactor);
}

agency.signDocument(blindDocs, (selected, verifyAndSign) => {
  let originalDocs = blindDocs.map((doc, i) => (i === selected ? undefined : makeDocument(`CoverIdentity${i + 1}`)));
  
  verifyAndSign(blindingFactors.map((factor, i) => (i === selected ? undefined : factor)), originalDocs);
});