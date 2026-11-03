/* EC Circuit Studio: safe, deliberately limited Arduino sketch interpreter.
   Never uses eval/new Function. No arbitrary C++ compilation or SPICE model. */
(function(global){
'use strict';
class SketchError extends Error {constructor(message,line){super(message);this.name='SketchError';this.line=line||0;}}
function cleanSource(src){
  if(typeof src!=='string'||src.length>14000)throw new SketchError('Kod en fazla 14.000 karakter olabilir.');
  return src.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '))
  .replace(/\/\/[^\n]*/g,'').replace(/^\s*#\s*include\s*<Servo\.h>\s*$/gm,'')
  .replace(/^\s*#\s*include[^\n]*$/gm,m=>{throw new SketchError('Bu örnek yorumlayıcı yalnızca Servo.h kütüphanesini tanır.');});
}
function tokens(expr){const out=[];const re=/\s*(?:([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)|(\d+(?:\.\d+)?)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(==|!=|>=|<=|&&|\|\||[+\-*/%<>!?:(),]))/y;let pos=0;
  while(pos<expr.length){if(/^\s*$/.test(expr.slice(pos)))break;re.lastIndex=pos;const m=re.exec(expr);if(!m)throw new SketchError('Desteklenmeyen ifade: '+expr.slice(pos,pos+35));out.push(m[1]?{t:'name',v:m[1]}:m[2]?{t:'num',v:Number(m[2])}:m[3]?{t:'str',v:m[3].slice(1,-1).replace(/\\n/g,'\n').replace(/\\"/g,'"')}:{t:m[4],v:m[4]});pos=re.lastIndex;}return out;}
function parseExpr(str){const ts=tokens(str);if(ts.length>256)throw new SketchError('İfade çok karmaşık (256 öğe sınırı).');let i=0;const prec={'||':1,'&&':2,'==':3,'!=':3,'>':4,'<':4,'>=':4,'<=':4,'+':5,'-':5,'*':6,'/':6,'%':6};
 const peek=()=>ts[i];const take=t=>{if(!peek()||peek().t!==t)throw new SketchError('İfadede '+t+' bekleniyor: '+str);return ts[i++]};
 function atom(){const t=ts[i++];if(!t)throw new SketchError('Eksik ifade: '+str);if(t.t==='num'||t.t==='str')return {k:t.t,v:t.v};if(t.t==='('){const a=expr(0);take(')');return a;}if(t.t==='-'||t.t==='+'||t.t==='!')return {k:'un',op:t.t,a:atom()};if(t.t==='name'){if(peek()?.t==='('){i++;const args=[];if(peek()?.t!==')')do{args.push(expr(0));if(peek()?.t!==',')break;i++;}while(true);take(')');return {k:'call',name:t.v,args};}return {k:'name',v:t.v};}throw new SketchError('Desteklenmeyen ifade: '+str);}
 function expr(min){let a=atom();while(peek()){const op=peek().t;if(op==='?'&&min<=0){i++;const yes=expr(0);take(':');const no=expr(0);a={k:'tern',a,yes,no};continue;}const p=prec[op];if(!p||p<min)break;i++;a={k:'bin',op,a,b:expr(p+1)};}return a;}
 const ast=expr(0);if(i!==ts.length)throw new SketchError('İfadenin sonu anlaşılamadı: '+str);return ast;}
function splitArgs(source){const out=[];let start=0,depth=0,quoted=false,esc=false;for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'&&!esc)quoted=!quoted;if(!quoted){if(c==='(')depth++;if(c===')')depth--;if(c===','&&depth===0){out.push(source.slice(start,i).trim());start=i+1;}}esc=c==='\\'&&!esc;}if(source.slice(start).trim())out.push(source.slice(start).trim());return out;}
function parseSimple(text){const s=text.trim();if(!s)return [];
 if(/^Servo\s+[A-Za-z_]\w*$/.test(s))return [{k:'servo',name:s.replace(/^Servo\s+/,'')}];
 const decl=/^(?:const\s+)?(?:unsigned\s+)?(int|long|float|double|bool|byte|boolean)\s+(.+)$/i.exec(s);
 if(decl){return splitArgs(decl[2]).map(piece=>{const m=/^([A-Za-z_]\w*)(?:\s*=\s*([\s\S]+))?$/.exec(piece);if(!m)throw new SketchError('Değişken bildirimi tanınmadı: '+piece);return{k:'decl',name:m[1],value:m[2]?parseExpr(m[2]):null};});}
 const assign=/^([A-Za-z_]\w*)\s*(=|\+=|-=)\s*([\s\S]+)$/.exec(s);if(assign)return [{k:'assign',name:assign[1],op:assign[2],value:parseExpr(assign[3])}];
 const m=/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*\(([\s\S]*)\)$/.exec(s);if(m)return [{k:'call',name:m[1],args:splitArgs(m[2]).map(parseExpr)}];
 throw new SketchError('Desteklenmeyen komut: '+s.slice(0,90));}
function parseBlock(content,level=0){if(level>24)throw new SketchError('Bloklar en fazla 24 seviye iç içe olabilir.');let pos=0;function space(){while(/\s/.test(content[pos]||'')&&pos<content.length)pos++;}
 function enclosed(op,cl){space();if(content[pos]!==op)throw new SketchError(op+' bekleniyor');const first=++pos;let level=1,quoted=false,esc=false;while(pos<content.length){const c=content[pos++];if(c==='"'&&!esc)quoted=!quoted;if(!quoted){if(c===op)level++;if(c===cl&&!--level)return content.slice(first,pos-1);}esc=c==='\\'&&!esc;}throw new SketchError('Kapanmamış '+op+' bloğu');}
 function statement(nesting=level){if(nesting>24)throw new SketchError('Koşullar en fazla 24 seviye iç içe olabilir.');space();if(pos>=content.length)return null;
  if(/^(?:for|while|switch)\b/.test(content.slice(pos)))throw new SketchError('for / while / switch blokları bu eğitim yorumlayıcısında desteklenmiyor.');
  if(/^if\b/.test(content.slice(pos))){pos+=2;const condition=parseExpr(enclosed('(',')'));space();const yes=content[pos]==='{'?parseBlock(enclosed('{','}'),nesting+1):statement(nesting+1);space();let no=[];if(/^else\b/.test(content.slice(pos))){pos+=4;space();no=content[pos]==='{'?parseBlock(enclosed('{','}'),nesting+1):statement(nesting+1);}return [{k:'if',condition,yes,no}];}
  if(content[pos]==='{')return parseBlock(enclosed('{','}'),nesting+1);
  const start=pos;let depth=0,quoted=false,esc=false;while(pos<content.length){const ch=content[pos++];if(ch==='"'&&!esc)quoted=!quoted;if(!quoted){if(ch==='(')depth++;if(ch===')')depth--;if(ch===';'&&depth===0)return parseSimple(content.slice(start,pos-1));if(ch==='{'||ch==='}')throw new SketchError('Beklenmeyen süslü parantez');}esc=ch==='\\'&&!esc;}if(content.slice(start).trim())throw new SketchError('Komutun sonunda ; eksik: '+content.slice(start,start+35));return [];
 }
 const out=[];while(true){space();if(pos>=content.length)break;const statementNodes=statement();if(statementNodes)out.push(...statementNodes);if(out.length>250)throw new SketchError('Bir blokta en fazla 250 komut kullanılabilir.');}return out;}
function extract(source,label){const pat=new RegExp('\\bvoid\\s+'+label+'\\s*\\(\\s*\\)\\s*\\{','g');const matches=[...source.matchAll(pat)];if(matches.length!==1)throw new SketchError('Bir adet void '+label+'() { ... } bloğu gerekli.');const start=matches[0].index+matches[0][0].length;let pos=start,depth=1,quoted=false,esc=false;while(pos<source.length){const c=source[pos++];if(c==='"'&&!esc)quoted=!quoted;if(!quoted){if(c==='{')depth++;else if(c==='}'&&!--depth)break;}esc=c==='\\'&&!esc;}if(depth)throw new SketchError(label+' bloğunun kapanış parantezi eksik.');return {start:matches[0].index,end:pos,body:source.slice(start,pos-1)};}
function compile(input){const source=cleanSource(input);const setup=extract(source,'setup'),loop=extract(source,'loop');const sorted=[setup,loop].sort((a,b)=>a.start-b.start);const globals=(source.slice(0,sorted[0].start)+source.slice(sorted[0].end,sorted[1].start)+source.slice(sorted[1].end)).trim();
 const result={globals:parseBlock(globals),setup:parseBlock(setup.body),loop:parseBlock(loop.body)};
 // Fail on unsupported hardware calls before simulation, rather than silently skipping.
 const allowed=new Set(['pinMode','digitalWrite','digitalRead','analogWrite','analogRead','delay','delayMicroseconds','Serial.begin','Serial.print','Serial.println','pulseIn','millis','map','constrain','tone','noTone','min','max','abs']);
 const servos=new Set(result.globals.filter(x=>x.k==='servo').map(x=>x.name));
 const inspect=a=>{if(a.k==='call'&&!allowed.has(a.name)&&!(a.name.endsWith('.attach')||a.name.endsWith('.write'))||a.k==='call'&&(a.name.endsWith('.attach')||a.name.endsWith('.write'))&&!servos.has(a.name.split('.')[0]))throw new SketchError('Desteklenmeyen fonksiyon: '+a.name);
 if(a.k==='call')a.args.forEach(inspect);if(a.k==='decl'&&a.value)inspect(a.value);if(a.k==='assign')inspect(a.value);if(a.k==='bin'){inspect(a.a);inspect(a.b);}if(a.k==='un')inspect(a.a);if(a.k==='tern'){inspect(a.a);inspect(a.yes);inspect(a.no);}if(a.k==='if'){inspect(a.condition);a.yes.forEach(inspect);a.no.forEach(inspect);}};
 [...result.globals,...result.setup,...result.loop].forEach(inspect);return result;}
function createRuntime(program,hooks={}){const vars=Object.create(null), modes=new Map();const constants={HIGH:1,LOW:0,OUTPUT:1,INPUT:0,INPUT_PULLUP:2,true:1,false:0};let active=false,timeout=0,count=0,clock=0,serialCalls=0,expressionSteps=0;
 function evalNode(a){if(++expressionSteps>12000)throw new SketchError('İfade işlem sınırı aşıldı.');switch(a.k){case 'num':case 'str':return a.v;case 'name':if(Object.prototype.hasOwnProperty.call(constants,a.v))return constants[a.v];if(a.v in vars)return vars[a.v];throw new SketchError('Tanımlanmamış değişken: '+a.v);case 'un':{const x=evalNode(a.a);return a.op==='-'?-Number(x):a.op==='+'?Number(x):!x?1:0;}case 'bin':{const a1=evalNode(a.a),b=evalNode(a.b);switch(a.op){case '+':{if(typeof a1==='string'||typeof b==='string'){const value=String(a1)+String(b);if(value.length>14000)throw new SketchError('Metin uzunluğu sınırı aşıldı.');return value;}return Number(a1)+Number(b);}case '-':return a1-b;case '*':return a1*b;case '/':return Number(b)===0?0:a1/b;case '%':return b===0?0:a1%b;case '==':return a1===b?1:0;case '!=':return a1!==b?1:0;case '>':return a1>b?1:0;case '<':return a1<b?1:0;case '>=':return a1>=b?1:0;case '<=':return a1<=b?1:0;case '&&':return a1&&b?1:0;case '||':return a1||b?1:0;}break;}case 'tern':return evalNode(a.a)?evalNode(a.yes):evalNode(a.no);case 'call':return call(a.name,a.args.map(evalNode));}throw new SketchError('İfade çözümlenemedi.');}
 function pinOf(x){const n=Math.trunc(Number(x));if(!Number.isInteger(n)||n<0||n>19)throw new SketchError('Geçersiz Arduino pin numarası: '+x);return n;}
 function call(name,args){const [a,b,c]=args;switch(name){
 case 'pinMode':modes.set(pinOf(a),b);return 0;
 case 'digitalWrite':hooks.write?.(pinOf(a),Number(b)!==0?1:0);return 0;
 case 'analogWrite':hooks.analog?.(pinOf(a),Math.max(0,Math.min(255,Number(b)||0)));return 0;
 case 'digitalRead':return hooks.read?.(pinOf(a),modes.get(pinOf(a)))??1;
 case 'analogRead':return hooks.analogRead?.(pinOf(a))??0;
 case 'pulseIn':return hooks.pulseIn?.(pinOf(a),b,c)??0;
 case 'Serial.begin':return 0;
 case 'Serial.print':case 'Serial.println':if(serialCalls++<500)hooks.serial?.(String(a??'')+(name.endsWith('println')?'\n':''));return 0;
 case 'millis':return clock;
 case 'map':return Number(args[3])+(Number(a)-Number(b))*(Number(args[4])-Number(args[3]))/(Number(c)-Number(b)||1);
 case 'constrain':return Math.max(Number(b),Math.min(Number(c),Number(a)));
 case 'min':return Math.min(...args.map(Number));case 'max':return Math.max(...args.map(Number));case 'abs':return Math.abs(Number(a));
 case 'tone':hooks.tone?.(pinOf(a),Number(b));return 0;
 case 'noTone':hooks.tone?.(pinOf(a),0);return 0;
 default:if(name.endsWith('.attach')){vars[name.split('.')[0]+'$pin']=pinOf(a);return 0;}if(name.endsWith('.write')){hooks.servo?.(vars[name.split('.')[0]+'$pin'],Number(a));return 0;}
 throw new SketchError('Desteklenmeyen çağrı: '+name);
 }}
 function* execute(nodes){for(const a of nodes){if(++count>800)throw new SketchError('Çok fazla komut çalıştı (800 adım sınırı).');if(a.k==='decl')vars[a.name]=a.value?evalNode(a.value):0;else if(a.k==='servo')vars[a.name+'$pin']=-1;else if(a.k==='assign'){const val=evalNode(a.value);vars[a.name]=a.op==='+='?Number(vars[a.name]||0)+Number(val):a.op==='-='?Number(vars[a.name]||0)-Number(val):val;}else if(a.k==='call'){if(a.name==='delay'||a.name==='delayMicroseconds'){let ms=Number(evalNode(a.args[0]));if(!Number.isFinite(ms)||ms<0)throw new SketchError('Geçersiz delay değeri');ms=a.name==='delayMicroseconds'?ms/1000:ms;clock+=Math.min(ms,10000);yield Math.min(10000,Math.max(12,ms));}else call(a.name,a.args.map(evalNode));}else if(a.k==='if')yield* execute(evalNode(a.condition)?a.yes:a.no);}}
 function start(){if(active)return;active=true;const generator=(function*(){yield* execute(program.globals);yield* execute(program.setup);while(active){count=0;expressionSteps=0;let n=0;for(const ms of execute(program.loop)){n++;yield ms;}if(!n){clock+=150;yield 150;}else{clock+=12;yield 12;}}})();function next(){if(!active)return;try{const result=generator.next();if(result.done){stop();return;}timeout=setTimeout(next,Math.max(12,Number(result.value)||12));}catch(err){stop();hooks.error?.(err);}}next();}
 function stop(){active=false;clearTimeout(timeout);timeout=0;}
 return {start,stop,vars,modes,isRunning:()=>active};}
global.ECArduinoSim={compile,createRuntime,SketchError};
})(window);
