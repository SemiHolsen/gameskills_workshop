const fs = require('fs');
const { S } = require('./sprites.js');
const img = n => 'data:image/jpeg;base64,' + fs.readFileSync('img/' + n + '.jpg').toString('base64');
S.img_logo = 'data:image/png;base64,' + fs.readFileSync('img/logo.png').toString('base64');
S.img_triceratops = img('triceratops'); S.img_paws = img('paws'); S.img_capy = img('capy');
S.game = fs.readFileSync('game.js', 'utf8');
let t = fs.readFileSync('template.html', 'utf8');
t = t.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in S)) throw new Error('missing ' + k); return S[k]; });
fs.writeFileSync('../index.html', t);
const m = t.match(/<script>([\s\S]*)<\/script>/);
try { new Function(m[1]); console.log('js ok', t.length); } catch (e) { console.log('JS ERROR', e.message); }
