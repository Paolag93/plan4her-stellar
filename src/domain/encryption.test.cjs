/* Run: node src/domain/encryption.test.cjs. Uses Node's WebCrypto; no network. */
const fs=require('fs'),path=require('path'),ts=require('typescript'),assert=require('node:assert/strict');
const load=file=>{const module={exports:{}};const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',output)(require,module,module.exports);return module.exports};
const enc=load(path.join(__dirname,'encryption.ts'));
(async()=>{
 const secret={cycleBasics:{lastPeriodStart:'2026-10-01',cycleLength:28},tasks:[{title:'SYNTHETIC-Menstrual-note'}]};
 const pass='correct horse battery staple';
 const envelope=await enc.encryptJson(secret,pass,100_000);
 assert.equal(enc.isEncryptedEnvelope(envelope),true);
 const serialized=JSON.stringify(envelope);
 for(const plain of ['lastPeriodStart','2026-10-01','SYNTHETIC','Menstrual','cycle',pass])assert.ok(!serialized.includes(plain),'plaintext leaked: '+plain);
 assert.deepEqual(Object.keys(envelope).sort(),['data','format','kdf','v','wrap']);
 assert.deepEqual(await enc.decryptJson(envelope,pass),secret);
 // Fresh salt/IV per encryption.
 const again=await enc.encryptJson(secret,pass,100_000);assert.notEqual(again.data.iv,envelope.data.iv);assert.notEqual(again.kdf.salt,envelope.kdf.salt);assert.notEqual(again.data.ct,envelope.data.ct);
 // Wrong passphrase.
 await assert.rejects(enc.decryptJson(envelope,'wrong passphrase!!'),/Wrong passphrase/);
 // Tampered ciphertext / wrapped key / iv.
 const flip=s=>{const b=enc.fromBase64(s);b[0]^=1;return enc.toBase64(b)};
 await assert.rejects(enc.decryptJson({...envelope,data:{...envelope.data,ct:flip(envelope.data.ct)}},pass),/changed or damaged/);
 await assert.rejects(enc.decryptJson({...envelope,wrap:{...envelope.wrap,key:flip(envelope.wrap.key)}},pass),/changed or damaged/);
 await assert.rejects(enc.decryptJson({...envelope,data:{...envelope.data,iv:flip(envelope.data.iv)}},pass),/changed or damaged/);
 // Structural rejection, including smuggled plaintext fields and weak KDF.
 assert.equal(enc.isEncryptedEnvelope({...envelope,name:'period tracker'}),false);
 assert.equal(enc.isEncryptedEnvelope({...envelope,kdf:{...envelope.kdf,iterations:1000}}),false);
 assert.equal(enc.isEncryptedEnvelope({...envelope,data:{...envelope.data,plaintext:'x'}}),false);
 assert.equal(enc.isEncryptedEnvelope(secret),false);
 await assert.rejects(enc.decryptJson(secret,pass),/not a Plan4Her/);
 // Weak passphrases refused; nothing encrypted.
 await assert.rejects(enc.encryptJson(secret,'short'),/at least 12/);
 assert.deepEqual(enc.passphraseIssues(' leading space ok?'),['Remove spaces at the start or end.']);
 // Default iterations meet current OWASP PBKDF2-SHA256 guidance.
 assert.ok(enc.KDF_ITERATIONS>=600000);
 console.log('Encryption tests passed: AES-256-GCM roundtrip, passphrase-wrapped random key, fresh salt/IV, no plaintext in envelope, wrong-key and tamper rejection, strict envelope schema, passphrase policy.');
})().catch(error=>{console.error(error);process.exit(1)});
