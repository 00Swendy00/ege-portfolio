import {spawnSync} from 'node:child_process';
const result=spawnSync('git',['log','--all','--format=commit %H','--no-ext-diff','-p','--','*.js','*.html','*.css','*.txt','*.md','*.py','*.ino','*.pde','*.json','*.yaml','*.yml','*.env','*.pem','*.key'],{encoding:'utf8',maxBuffer:64*1024*1024});
if(result.status!==0)throw new Error('Geçmiş okunamadı');
const findings=[];let commit='',file='';
for(const line of result.stdout.split('\n')){
 if(line.startsWith('commit '))commit=line.slice(7);
 if(line.startsWith('diff --git '))file=line.split(' b/').at(-1);
 if(!/^[+-][^+-]/.test(line))continue;
 const types=[];
 if(/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9_-]{30,})\b/.test(line))types.push('credential-pattern');
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line))types.push('private-key');
 const match=line.match(/(?:api[_-]?key|client[_-]?secret|password|passwd|access[_-]?token|refresh[_-]?token|wifi[_-]?password)\s*[:=]\s*["']([^"'\n]{8,})["']/i);
 if(match&&!/example|placeholder|your[_ -]|buraya|şifre|sifre|password|changeme|API_KEY/i.test(match[1]))types.push('secret-assignment-review');
 if(types.length)findings.push({commit,file,types});
}
const count=spawnSync('git',['rev-list','--count','--all'],{encoding:'utf8'}).stdout.trim();
console.log(JSON.stringify({commits:Number(count),scope:'Fetched main history; changed text files only; no credential validity checks',findings},null,2));
