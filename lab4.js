"use strict";

let blindSignatures = require('blind-signatures');
let SpyAgency = require('./spyAgency.js').SpyAgency;

function makeDocument(coverName) {
  return `The bearer of this signed document, ${coverName}, has full diplomatic immunity.`;
}

function blind(msg, n, e) {
  return blindSignatures.blind({
    message: msg,
    N: n,
    E: e,
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

// Prepare 10 documents with different cover identities
let coverNames = ["Agent X", "Agent Y", "Agent Z", "John Doe", "Jane Roe", "Mr. Smith", "Ms. Johnson", "Dr. No", "Q", "M"]; 
let documents = coverNames.map(makeDocument);

// Blind the documents and store blinding factors
let blindedDocs = [];
let blindingFactors = [];

documents.forEach((doc) => {
  let { blinded, r } = blind(doc, agency.n, agency.e);
  blindedDocs.push(blinded);
  blindingFactors.push(r);
});

agency.signDocument(blindedDocs, (selected, verifyAndSign) => {
  
  let blindFactorsCopy = [...blindingFactors];
  let docsCopy = [...documents];

  // Remove the blinding factor and document at the selected position
  blindFactorsCopy[selected] = undefined;
  docsCopy[selected] = undefined;

  let signedBlindedDoc = verifyAndSign(blindFactorsCopy, docsCopy);

  // Unblind the received signature
  let unblindedSignature = unblind(blindingFactors[selected], signedBlindedDoc, agency.n);

  // Verify the signature
  let isValid = blindSignatures.verify({
    unblinded: unblindedSignature,
    N: agency.n,
    E: agency.e,
    message: documents[selected],
  });

  console.log(`Document for ${coverNames[selected]} has a ${isValid ? 'valid' : 'invalid'} signature.`);
});
5