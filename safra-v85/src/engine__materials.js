// === engine/materials.js ===
// Biblioteca PBR procedural. Cada superfície é uma função GLSL surf(uv) que devolve cor (COL),
// máscara de tinta (TINT: 1 = recebe a cor do material, 0 = cor própria, como ferrugem e poeira),
// altura (H), rugosidade (RO), máscara de metal (ME) e oclusão (AO).
// A GPU assa três mapas por superfície na carga (cor, ORM+altura, normal). Zero arquivos externos.
// Os materiais de get() usam projeção triplanar em espaço de objeto (densidade de textura em metros,
// sem UV esticada), variação macro em espaço de mundo e barra de poeira vermelha na base.

const GLSL_NOISE = `precision highp float;
varying vec2 vUv;
#define TAU 6.2831853
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 h22(vec2 p){float n=h21(p);return vec2(n,h21(p+n+7.1));}
float vn(vec2 p,vec2 per){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=h21(mod(i,per)),b=h21(mod(i+vec2(1.,0.),per)),c=h21(mod(i+vec2(0.,1.),per)),d=h21(mod(i+vec2(1.,1.),per));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fbm(vec2 uv,vec2 sc,int oct,float seed){
  float s=0.,a=.5,n=0.;
  for(int i=0;i<8;i++){if(i>=oct)break;s+=a*vn(uv*sc+seed*17.31,sc);n+=a;sc*=2.;a*=.5;}
  return s/n;
}
vec3 vor(vec2 uv,vec2 sc,float seed){
  vec2 p=uv*sc,i=floor(p),f=fract(p);float d1=9.,d2=9.,id=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 g=vec2(float(x),float(y));vec2 c=mod(i+g,sc);vec2 o=h22(c+seed*3.7);
    float d=length(g+o-f);if(d<d1){d2=d1;d1=d;id=h21(c+seed);}else if(d<d2)d2=d;
  }
  return vec3(d1,d2-d1,id);
}
vec3 COL=vec3(.5);float H=.5,RO=.8,ME=1.,AO=1.,TINT=1.;
uniform int uPass;
`;

const GLSL_OUT = `
void main(){
  surf(vUv);
  if(uPass==0)gl_FragColor=vec4(max(COL,0.),clamp(TINT,0.,1.));
  else gl_FragColor=vec4(clamp(AO,0.,1.),clamp(RO,.04,1.),clamp(ME,0.,1.),H);
}`;

// tile = metros cobertos por uma repetição; ns = força do relevo; mode 'uv' usa a UV da geometria
const SURFACES = {
  // Latossolo vermelho: torrões, pedrisco, manchas úmidas e restos de palha
  terra: {
    tile: 3, ns: 2.6,
    g: `void surf(vec2 uv){
      float big=fbm(uv,vec2(3.),5,1.),mid=fbm(uv,vec2(12.),4,2.),fine=fbm(uv,vec2(90.),3,3.);
      vec3 v=vor(uv,vec2(18.),4.);float clod=smoothstep(0.,.5,v.y)*smoothstep(.75,.2,v.x);
      vec3 v2=vor(uv,vec2(46.),8.);float crumb=smoothstep(.55,.05,v2.x)*step(.55,v2.z);
      vec3 st=vor(uv,vec2(40.),9.);float stone=step(.94,st.z)*smoothstep(.28,.2,st.x);
      float straw=smoothstep(.93,.97,fbm(uv,vec2(6.,140.),2,5.))+smoothstep(.94,.97,fbm(uv,vec2(120.,8.),2,6.));
      COL=mix(vec3(.26,.075,.032),vec3(.44,.16,.07),smoothstep(.3,.7,mid));
      COL=mix(COL,vec3(.17,.05,.025),smoothstep(.5,.8,big)*.6);
      COL*=.8+.4*fine;
      COL*=.82+.3*clod;
      COL=mix(COL,COL*1.25+vec3(.03,.012,.004),crumb*.5);
      COL=mix(COL,vec3(.3,.22,.17)*(.7+.5*fine),stone);
      COL=mix(COL,vec3(.58,.48,.25),clamp(straw,0.,1.)*.7);
      H=.42+.22*(mid-.5)+.26*clod*(.6+.4*fine)+.1*(fine-.5)+crumb*.06+stone*.15+straw*.04;
      RO=.95-.1*smoothstep(.5,.8,big)-stone*.2;ME=0.;
      AO=.68+.32*smoothstep(0.,.3,v.y);
    }`
  },
  // Terra batida da estrada: compacta, mais clara, cascalho fino e trincas de lama seca
  estrada: {
    tile: 6, ns: 1.7,
    g: `void surf(vec2 uv){
      float big=fbm(uv,vec2(2.),5,11.),mid=fbm(uv,vec2(10.),4,12.),fine=fbm(uv,vec2(120.),3,13.);
      vec3 g=vor(uv,vec2(60.),5.);float grav=step(.935,g.z)*smoothstep(.26,.12,g.x);
      vec3 g2=vor(uv,vec2(150.),15.);float grit=step(.72,g2.z)*smoothstep(.36,.1,g2.x);
      vec3 cr=vor(uv,vec2(7.),6.);float crack=smoothstep(.03,0.,cr.y)*smoothstep(.5,.78,big);
      float polish=smoothstep(.55,.8,fbm(uv,vec2(3.,6.),4,14.));
      COL=mix(vec3(.38,.16,.075),vec3(.52,.25,.12),mid);
      COL=mix(COL,vec3(.56,.33,.19),smoothstep(.45,.8,big)*.45);
      COL*=.88+.24*fine;
      COL=mix(COL,COL*1.08+vec3(.02,.012,.006),polish*.35);
      COL=mix(COL,mix(COL*.7,vec3(.36,.24,.17),.5)*(.8+.4*g.z),grav*.7);
      COL=mix(COL,COL*.82,grit*.45);
      COL*=1.-crack*.35;
      H=.5+.1*(mid-.5)+.05*(fine-.5)+grav*.07+grit*.03-crack*.22;
      RO=.94-polish*.08;ME=0.;
      AO=1.-crack*.35;
    }`
  },
  // Concreto de pátio: placas com juntas, trincas, manchas de óleo, agregado aparente e eflorescência
  concreto: {
    tile: 4, ns: 1.5,
    g: `void surf(vec2 uv){
      float big=fbm(uv,vec2(2.),5,31.),mid=fbm(uv,vec2(14.),4,32.),fine=fbm(uv,vec2(160.),3,33.);
      vec2 j=abs(fract(uv*2.)-.5);float joint=smoothstep(.488,.5,max(j.x,j.y));
      vec2 slab=floor(uv*2.);float sv=h21(slab+3.1);
      vec3 cr=vor(uv,vec2(5.),7.);float crack=smoothstep(.016,0.,cr.y)*smoothstep(.55,.75,fbm(uv,vec2(3.),3,34.));
      float stain=smoothstep(.58,.84,fbm(uv,vec2(4.),5,35.));
      float oil=smoothstep(.72,.8,fbm(uv,vec2(6.),4,37.))*step(.55,sv);
      float effl=smoothstep(.62,.85,fbm(uv,vec2(9.,3.),4,38.));
      vec3 pv=vor(uv,vec2(70.),8.);float pit=step(.9,pv.z)*smoothstep(.3,.08,pv.x);
      vec3 ag=vor(uv,vec2(110.),18.);float aggr=step(.75,ag.z)*smoothstep(.35,.1,ag.x);
      COL=vec3(.80,.79,.76)*(.9+.12*mid)*(.94+.1*fine)*(.94+.08*sv);
      COL=mix(COL,COL*.68,stain*.45);
      COL=mix(COL,vec3(.12,.11,.1),oil*.65);
      COL=mix(COL,vec3(.92,.91,.88),effl*.18);
      COL=mix(COL,COL*vec3(.82,.8,.78),aggr*.6);
      COL*=1.-max(joint*.55,crack*.5)-pit*.25;
      H=.5+.06*(mid-.5)+.04*(fine-.5)-joint*.3-crack*.22-pit*.12+aggr*.03;
      RO=.86-.12*stain-.4*oil+.04*effl;ME=0.;
      AO=1.-joint*.45-crack*.4-pit*.2;
    }`
  },
  // Chapa trapezoidal/ondulada: nervuras, parafusos, escorrimento de ferrugem (fica sem a tinta)
  chapa: {
    tile: 2.5, ns: 3.0,
    g: `void surf(vec2 uv){
      float rib=.5+.5*cos(uv.x*TAU*16.);
      float fine=fbm(uv,vec2(180.),3,51.),big=fbm(uv,vec2(3.,2.),5,52.);
      float streak=fbm(vec2(uv.x,uv.y),vec2(48.,3.),4,53.);
      float seam=smoothstep(.04,0.,abs(fract(uv.y*2.)-.02));
      float rustS=smoothstep(.58,.82,big*.55+streak*.45+.12*(1.-rib))*.9;
      float rustSeam=seam*smoothstep(.4,.7,fbm(uv,vec2(24.,4.),3,56.));
      float rustRun=smoothstep(.62,.9,streak)*smoothstep(.3,.9,fract(-uv.y*2.))*.7;
      float rust=clamp(max(max(rustS*.75,rustSeam),rustRun),0.,1.);
      vec2 sc=fract(uv*vec2(8.,2.)+vec2(.5,.48))-.5;float screw=smoothstep(.06,.035,length(sc*vec2(1.,4.)));
      float fade=smoothstep(.3,.8,fbm(uv,vec2(5.),4,57.));
      COL=vec3(.78)*(.86+.18*rib)*(.92+.14*fine)*(1.-.12*fade);
      vec3 rc=mix(vec3(.30,.11,.035),vec3(.46,.2,.07),fine)*(.75+.4*streak);
      COL=mix(COL,rc,rust);
      COL=mix(COL,vec3(.14,.13,.12),screw*.85);
      TINT=1.-rust;
      H=rib*.8+.03*fine+screw*.25-rust*.04;
      RO=mix(.5+.15*fade,.92,rust);
      ME=(1.-rust)*(1.-screw*.3);
      AO=.62+.38*rib-rust*.08;
    }`
  },
  // Tinta industrial lascada: base clara que recebe a cor, lascas com primer e metal enferrujado
  tinta: {
    tile: 2, ns: 1.2,
    g: `void surf(vec2 uv){
      float fine=fbm(uv,vec2(140.),3,61.),big=fbm(uv,vec2(3.),5,62.),mid=fbm(uv,vec2(16.),4,63.);
      float cn=fbm(uv,vec2(22.),5,64.)*.72+big*.28;
      float chip=smoothstep(.705,.725,cn),edge=smoothstep(.66,.705,cn)-chip;
      float deep=smoothstep(.75,.77,cn);
      float grime=smoothstep(.45,.82,fbm(uv,vec2(5.,2.),5,65.));
      float scr=clamp(smoothstep(.73,.76,fbm(uv,vec2(3.,160.),2,66.))+smoothstep(.73,.76,fbm(uv,vec2(140.,4.),2,67.)),0.,1.);
      COL=vec3(.86)*(.95+.08*mid)*(.97+.05*fine);
      COL=mix(COL,COL*vec3(.78,.72,.66),grime*.35);
      COL=mix(COL,vec3(.96),edge*.35);
      vec3 primer=vec3(.42,.42,.4)*(.85+.25*fine);
      vec3 rust=vec3(.22,.08,.03)*(.6+.9*fine);
      vec3 under=mix(primer,rust,deep);
      COL=mix(COL,under,chip);
      COL=mix(COL,vec3(.7),scr*.22);
      TINT=1.-chip;
      H=.5+.02*(fine-.5)-chip*.25-deep*.05+edge*.05-scr*.04;
      RO=mix(.42+.25*grime,.88,chip);
      ME=chip*(1.-deep)*.8;
      AO=1.-chip*.2;
    }`
  },
  // Madeira envelhecida: tábuas, veio, nós, frestas e acinzentamento pelo sol
  madeira: {
    tile: 2, ns: 2.0,
    g: `void surf(vec2 uv){
      float pl=floor(uv.y*6.);vec2 q=vec2(uv.x+h21(vec2(pl,3.))*7.,uv.y);
      float gap=smoothstep(.45,.5,abs(fract(uv.y*6.)-.5));
      float grain=fbm(q,vec2(3.,160.),4,101.+pl),ring=fbm(q,vec2(2.,24.),4,102.);
      float grey=smoothstep(.3,.75,fbm(q,vec2(2.,3.),4,103.));
      float kn=vor(q,vec2(2.,6.),104.).x;float knot=smoothstep(.12,.05,kn)*step(.6,h21(vec2(pl,9.)));
      float split=smoothstep(.985,1.,fbm(q,vec2(1.,90.),3,105.)+.02);
      COL=mix(vec3(.62,.5,.38),vec3(.94,.84,.7),ring)*(.78+.42*grain);
      COL=mix(COL,vec3(.5,.49,.46)*(.75+.5*grain),grey*.55);
      COL=mix(COL,vec3(.16,.1,.06),knot*.85);
      COL*=1.-gap*.8-split*.4;
      TINT=1.-grey*.5;
      H=.5+.25*(grain-.5)-gap*.5-knot*.08-split*.2;
      RO=.86+.08*grey;ME=0.;
      AO=1.-gap*.6;
    }`
  },
  // Borracha: garras do pneu, poeira vermelha nos sulcos (UV da geometria)
  borracha: {
    tile: 1, ns: 3.0, mode: 'uv',
    g: `void surf(vec2 uv){
      float ch=abs(fract(uv.x*28.+abs(uv.y-.5)*2.4)-.5);
      float lug=smoothstep(.16,.22,ch)*smoothstep(.05,.18,abs(uv.y-.5)+.02);
      float fine=fbm(uv,vec2(150.),3,91.);
      float dust=smoothstep(.35,.8,fbm(uv,vec2(6.),4,92.));
      COL=vec3(.03)*(.8+.5*fine);
      vec3 dc=vec3(.34,.14,.06)*(.75+.4*fine);
      COL=mix(COL,dc,clamp(dust*.45*(1.-lug*.6)+(1.-lug)*.35,0.,1.));
      TINT=1.-clamp(dust*.45+(1.-lug)*.35,0.,1.);
      H=lug*.9+.03*fine;
      RO=.86+dust*.1;ME=0.;
      AO=.5+.5*lug;
    }`
  },
  // Superfície lisa (metal pintado ou peças): sujeira suave, marcas e leve desgaste
  liso: {
    tile: 2.5, ns: .9,
    g: `void surf(vec2 uv){
      float fine=fbm(uv,vec2(160.),3,71.),big=fbm(uv,vec2(2.5),5,72.),mid=fbm(uv,vec2(20.),4,73.);
      float grime=smoothstep(.5,.85,fbm(uv,vec2(4.,3.),5,74.));
      float scr=smoothstep(.76,.79,fbm(uv,vec2(4.,120.),2,75.));
      COL=vec3(.92)*(.94+.08*big)*(.97+.05*fine);
      COL=mix(COL,COL*vec3(.75,.66,.6),grime*.3);
      COL=mix(COL,vec3(.75),scr*.2);
      H=.5+.05*(mid-.5)+.04*(fine-.5)-scr*.03;
      RO=.62+.18*(mid-.5)+grime*.25+scr*.1;
      ME=1.-grime*.35;
      AO=1.;
    }`
  },
  // --- superfícies novas (aditivas) ---
  // Capim / braquiária vista de cima
  capim: {
    tile: 4, ns: 2.0,
    g: `void surf(vec2 uv){
      float big=fbm(uv,vec2(3.),4,21.),bl=fbm(uv,vec2(40.,160.),3,22.),bl2=fbm(uv,vec2(150.,50.),3,23.),fine=fbm(uv,vec2(200.),2,24.);
      float soil=smoothstep(.64,.82,fbm(uv,vec2(6.),4,25.));
      float dry=smoothstep(.45,.8,fbm(uv,vec2(5.),4,26.));
      COL=mix(vec3(.07,.12,.025),vec3(.21,.26,.07),bl);
      COL=mix(COL,vec3(.42,.36,.15),dry*.6);
      COL*=.72+.56*bl2;
      COL=mix(COL,vec3(.3,.1,.045)*(.8+.4*fine),soil);
      H=.5+.3*(bl-.5)+.2*(bl2-.5)-soil*.22;
      RO=.9;ME=0.;AO=.68+.32*bl;
    }`
  },
  // Palha seca de cana sobre o solo (área colhida): pedaços curtos em direções aleatórias, em camadas
  palha: {
    tile: 3, ns: 2.6,
    g: `float strawL(vec2 uv,float sc,float seed,out float id){
      vec2 p=uv*sc,i=floor(p),f=fract(p);float best=9.;id=0.;
      for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec2 gg=vec2(float(x),float(y));vec2 c=mod(i+gg,vec2(sc));vec2 o=h22(c+seed);
        float a=h21(c+seed*1.7)*6.2831;vec2 d=vec2(cos(a),sin(a));
        vec2 q=f-(gg+o);float t=clamp(dot(q,d),-.95,.95);float dist=length(q-d*t);
        if(dist<best){best=dist;id=h21(c+seed*3.1);}
      }
      return best;}
    void surf(vec2 uv){
      float i1,i2,i3;
      float d1=strawL(uv,22.,1.,i1),d2=strawL(uv,31.,2.,i2),d3=strawL(uv,15.,3.,i3);
      float s1=smoothstep(.07,.03,d1),s2=smoothstep(.06,.025,d2),s3=smoothstep(.08,.035,d3);
      float big=fbm(uv,vec2(3.),4,144.),fine=fbm(uv,vec2(160.),2,145.);
      float cover=smoothstep(.08,.5,big);
      vec3 soil=mix(vec3(.24,.075,.03),vec3(.38,.14,.06),fine)*(.85+.3*big);
      vec3 c1=mix(vec3(.5,.4,.2),vec3(.74,.64,.4),i1),c2=mix(vec3(.42,.33,.17),vec3(.66,.56,.33),i2),c3=mix(vec3(.36,.28,.14),vec3(.6,.5,.28),i3);
      vec3 under=mix(soil,vec3(.34,.25,.13)*(.8+.4*fine),cover*.75);
      COL=under;
      COL=mix(COL,c3*.8,s3*(.5+.5*cover));
      COL=mix(COL,c1,s1*(.35+.65*cover));
      COL=mix(COL,c2,s2*cover);
      float st=max(max(s1,s2),s3);
      H=.35+cover*.15+st*.3+.04*fine;
      RO=.92;ME=0.;AO=.55+.45*max(st,1.-cover*.6);
    }`
  },
  // Asfalto gasto com poeira vermelha
  asfalto: {
    tile: 4, ns: 1.6,
    g: `void surf(vec2 uv){
      vec3 g=vor(uv,vec2(90.),41.);float fine=fbm(uv,vec2(200.),2,42.),big=fbm(uv,vec2(3.),5,43.);
      vec3 cr=vor(uv,vec2(6.),44.);float crack=smoothstep(.025,0.,cr.y)*smoothstep(.45,.7,big);
      float dust=smoothstep(.5,.8,fbm(uv,vec2(4.,2.),4,45.));
      COL=vec3(.095,.088,.084)*(.75+.7*g.z)*(.85+.3*fine);COL=mix(COL,vec3(.3,.14,.075),dust*.45);COL*=1.-crack*.5;
      TINT=1.-dust*.45;
      H=.5+.25*(1.-smoothstep(0.,.4,g.x))*g.z-.3*crack;RO=.9-.08*g.z+dust*.05;ME=0.;AO=1.-crack*.5;
    }`
  },
  // Reboco pintado com trincas e escorrimento
  reboco: {
    tile: 3, ns: 1.4,
    g: `void surf(vec2 uv){
      float fine=fbm(uv,vec2(120.),3,81.),big=fbm(uv,vec2(2.),5,82.),mid=fbm(uv,vec2(10.),4,83.);
      vec3 cr=vor(uv,vec2(4.),84.);float crack=smoothstep(.012,0.,cr.y)*smoothstep(.5,.7,big);
      float peel=smoothstep(.68,.72,fbm(uv,vec2(7.),5,85.)*.7+big*.3);float run=smoothstep(.6,.85,fbm(uv,vec2(30.,2.),4,86.));
      COL=vec3(.88)*(.92+.1*mid);COL=mix(COL,COL*vec3(.7,.66,.62),run*.3);COL=mix(COL,vec3(.5,.48,.45)*(.8+.4*fine),peel);COL*=1.-crack*.6;
      TINT=1.-peel;
      H=.5+.1*(fine-.5)+.08*(mid-.5)-peel*.2-crack*.3;RO=.9;ME=0.;AO=1.-crack*.3;
    }`
  },
  // Lona encerada com dobras e poeira
  lona: {
    tile: 1.5, ns: 2.2,
    g: `void surf(vec2 uv){
      float wv=.5+.25*sin(uv.x*TAU*120.)+.25*sin(uv.y*TAU*120.);float wr=fbm(uv,vec2(3.,5.),5,111.);float fold=abs(wr-.5)*2.;
      float dust=smoothstep(.4,.8,fbm(uv,vec2(5.),4,112.));
      COL=vec3(.82)*(.85+.2*wv)*(.8+.3*wr);COL=mix(COL,vec3(.42,.2,.1),dust*.35);TINT=1.-dust*.35;
      H=.5+.6*(wr-.5)+.03*wv;RO=.62-.15*fold;ME=0.;AO=.7+.3*wr;
    }`
  },
  // Telha cerâmica com limo
  telha: {
    tile: 2, ns: 3.0,
    g: `void surf(vec2 uv){
      vec2 g=uv*vec2(8.,5.);vec2 f=fract(g);float barrel=sin(f.x*3.14159);float lip=smoothstep(0.,.12,f.y);
      float id=h21(floor(g));float fine=fbm(uv,vec2(120.),3,121.);float moss=smoothstep(.6,.85,fbm(uv,vec2(6.),5,122.));
      COL=mix(vec3(.42,.14,.06),vec3(.6,.24,.11),id)*(.8+.4*fine);COL=mix(COL,vec3(.09,.08,.06),moss*.6);COL*=.55+.45*lip;
      TINT=0.;
      H=barrel*.7+f.y*.3+.03*fine;RO=.88;ME=0.;AO=.5+.5*barrel*lip;
    }`
  },
  // Casca de árvore do cerrado: fissuras verticais, cortiça e líquen
  casca: {
    tile: 1.2, ns: 3.2,
    g: `void surf(vec2 uv){
      float f=fbm(uv,vec2(16.,2.),5,151.);float ridge=smoothstep(.32,.68,f);
      float fine=fbm(uv,vec2(90.),3,152.);float lich=smoothstep(.7,.86,fbm(uv,vec2(6.),4,153.));
      COL=mix(vec3(.10,.08,.06),vec3(.34,.29,.24),ridge)*(.8+.4*fine);
      COL=mix(COL,vec3(.46,.48,.38),lich*.45);
      TINT=.7;H=ridge*.75+fine*.1;RO=.96;ME=0.;AO=.5+.5*ridge;
    }`
  },
  // Aço escovado com pontos de corrosão
  aco: {
    tile: 1, ns: .8,
    g: `void surf(vec2 uv){
      float fine=fbm(uv,vec2(200.,8.),3,131.),big=fbm(uv,vec2(3.),4,132.);float rust=smoothstep(.64,.82,fbm(uv,vec2(8.),5,133.));
      COL=vec3(.62,.63,.64)*(.82+.3*fine);COL=mix(COL,vec3(.27,.1,.04),rust*.85);TINT=1.-rust;
      H=.5+.05*(fine-.5)-rust*.05;RO=mix(.32+.2*big,.9,rust);ME=1.-rust;
    }`
  }
};

// Cor da poeira de latossolo (linear) usada na barra da base e nos filmes de poeira
const MAT_DUST_COLOR = new THREE.Color(0.34, 0.14, 0.062);

// Trecho GLSL comum: ruído barato em espaço de mundo para quebrar repetição
const MAT_WORLD_NOISE = `
float mwH(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+34.2);return fract(p.x*p.y);}
float mwN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mwH(i),mwH(i+vec2(1,0)),f.x),mix(mwH(i+vec2(0,1)),mwH(i+vec2(1,1)),f.x),f.y);}
`;

class MaterialLibrary {
  constructor(renderer, size = 512) {
    this.renderer = renderer;
    this.size = size;
    this.baked = {};
    this.cache = new Map();
    this.dust = { value: 1.0 };           // força global da poeira (0..1)
    this.dustColor = { value: MAT_DUST_COLOR.clone() };
  }

  bakeAll() {
    const R = this.renderer;
    const size = this.size;
    const ext = R.extensions;
    const halfOk = !!(ext && (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float')));
    const aniso = Math.min(8, R.capabilities.getMaxAnisotropy ? R.capabilities.getMaxAnisotropy() : 4);
    const mkRT = (o) => {
      const rt = new THREE.WebGLRenderTarget(size, size, Object.assign({
        depthBuffer: false, generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping
      }, o));
      rt.texture.anisotropy = aniso;
      return rt;
    };
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    const sc = new THREE.Scene();
    sc.add(quad);
    const vs = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

    const normMat = new THREE.ShaderMaterial({
      uniforms: { tH: { value: null }, uS: { value: 2.0 }, uStep: { value: 1 / size } },
      vertexShader: vs,
      fragmentShader: `precision highp float;varying vec2 vUv;uniform sampler2D tH;uniform float uS,uStep;
        void main(){
          float l=texture2D(tH,vUv-vec2(uStep,0.)).a,r=texture2D(tH,vUv+vec2(uStep,0.)).a;
          float d=texture2D(tH,vUv-vec2(0.,uStep)).a,u=texture2D(tH,vUv+vec2(0.,uStep)).a;
          vec3 n=normalize(vec3((l-r)*uS,(d-u)*uS,1.));gl_FragColor=vec4(n*.5+.5,1.);
        }`
    });

    const prevTarget = R.getRenderTarget();
    const prevTone = R.toneMapping;
    R.toneMapping = THREE.NoToneMapping;
    for (const [key, def] of Object.entries(SURFACES)) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uPass: { value: 0 } },
        vertexShader: vs,
        fragmentShader: `${GLSL_NOISE}\n${def.g}\n${GLSL_OUT}`
      });
      const a = mkRT({ colorSpace: THREE.SRGBColorSpace });
      const p = mkRT({ type: halfOk ? THREE.HalfFloatType : THREE.UnsignedByteType });
      const n = mkRT({});
      quad.material = mat;
      R.setRenderTarget(a); R.render(sc, ortho);
      mat.uniforms.uPass.value = 1;
      R.setRenderTarget(p); R.render(sc, ortho);
      quad.material = normMat;
      normMat.uniforms.tH.value = p.texture;
      normMat.uniforms.uS.value = def.ns * size / 256;
      R.setRenderTarget(n); R.render(sc, ortho);
      mat.dispose();
      // repeat só vale para o modo UV (a projeção triplanar usa metros)
      const rep = def.mode === 'uv' ? 1 : def.tile;
      [a.texture, p.texture, n.texture].forEach(t => t.repeat.set(rep, rep));
      this.baked[key] = { map: a.texture, pack: p.texture, normalMap: n.texture, tile: def.tile, mode: def.mode || 'tri', rts: [a, p, n] };
    }
    R.setRenderTarget(prevTarget);
    R.toneMapping = prevTone;
    quad.geometry.dispose();
    normMat.dispose();
    this.loadCC0Textures(aniso);
  }

  // Carrega texturas fotogramétricas CC0 (Poly Haven / ambientCG) de /assets/cc0/ e funde nos RenderTargets PBR
  loadCC0Textures(aniso = 8) {
    if (typeof window === 'undefined' || !THREE.TextureLoader) return;
    const CC0_MAP = {
      terra:    { dir: 'brown_mud_02',            diffMix: 0.58, normMix: 0.72 },
      estrada:  { dir: 'gravel_ground_01',        diffMix: 0.54, normMix: 0.75 },
      concreto: { dir: 'concrete_floor_worn_001', diffMix: 0.52, normMix: 0.75 },
      asfalto:  { dir: 'asphalt_02',              diffMix: 0.58, normMix: 0.78 },
      chapa:    { dir: 'corrugated_iron_02',      diffMix: 0.42, normMix: 0.70 },
      tinta:    { dir: 'blue_metal_plate',        diffMix: 0.35, normMix: 0.68 },
      aco:      { dir: 'rust_coarse_01',          diffMix: 0.48, normMix: 0.74 },
      capim:    { dir: 'sparse_grass',            diffMix: 0.55, normMix: 0.70 },
      madeira:  { dir: 'rough_wood',              diffMix: 0.52, normMix: 0.74 },
      reboco:   { dir: 'blue_plaster_wall',       diffMix: 0.38, normMix: 0.68 }
    };
    this.cc0Status = { loaded: 0, total: Object.keys(CC0_MAP).length, surfaces: {} };
    window.__SAFRA_CC0_PBR__ = this.cc0Status;
    if (location.protocol === 'file:') return;

    const loader = new THREE.TextureLoader();
    const R = this.renderer;
    const size = this.size;

    const blendTexIntoRT = (rt, cc0Tex, mixFactor, isNormal) => {
      if (!R || !rt || !cc0Tex) return;
      const cloneRT = new THREE.WebGLRenderTarget(size, size, {
        depthBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const vs = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
      const copyMat = new THREE.ShaderMaterial({
        uniforms: { tSrc: { value: rt.texture } },
        vertexShader: vs,
        fragmentShader: 'precision highp float;varying vec2 vUv;uniform sampler2D tSrc;void main(){gl_FragColor=texture2D(tSrc,vUv);}'
      });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMat);
      const sc = new THREE.Scene();
      sc.add(quad);

      const prevTarget = R.getRenderTarget();
      const prevTone = R.toneMapping;
      R.toneMapping = THREE.NoToneMapping;
      R.setRenderTarget(cloneRT);
      R.render(sc, ortho);

      const blendMat = new THREE.ShaderMaterial({
        uniforms: {
          tBase: { value: cloneRT.texture },
          tCC0: { value: cc0Tex },
          uMix: { value: mixFactor },
          uIsNorm: { value: isNormal ? 1 : 0 }
        },
        vertexShader: vs,
        fragmentShader: `precision highp float;
          varying vec2 vUv;
          uniform sampler2D tBase, tCC0;
          uniform float uMix;
          uniform int uIsNorm;
          void main(){
            vec4 b = texture2D(tBase, vUv);
            vec4 c = texture2D(tCC0, vUv);
            if (uIsNorm == 1) {
              vec3 nb = b.xyz * 2.0 - 1.0;
              vec3 nc = c.xyz * 2.0 - 1.0;
              vec3 n = normalize(vec3(mix(nb.xy, nc.xy, uMix), nb.z * nc.z));
              gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
            } else {
              // Fusão luminosa + micro-detalhe fotogramétrico preservando TINT (b.a)
              float lumC = dot(c.rgb, vec3(0.299, 0.587, 0.114));
              vec3 det = b.rgb * mix(1.0, clamp(lumC * 1.65, 0.55, 1.45), uMix);
              vec3 col = mix(det, c.rgb, uMix * 0.42);
              gl_FragColor = vec4(clamp(col, 0.0, 1.0), b.a);
            }
          }`
      });
      quad.material = blendMat;
      R.setRenderTarget(rt);
      R.render(sc, ortho);
      R.setRenderTarget(prevTarget);
      R.toneMapping = prevTone;

      quad.geometry.dispose();
      copyMat.dispose();
      blendMat.dispose();
      cloneRT.dispose();
    };

    for (const [key, cfg] of Object.entries(CC0_MAP)) {
      const b = this.baked[key];
      if (!b || !b.rts) continue;
      const [rtA, , rtN] = b.rts;
      let diffOk = false, normOk = false;
      const mark = () => {
        if (diffOk && normOk) {
          this.cc0Status.loaded++;
          this.cc0Status.surfaces[key] = cfg.dir;
        }
      };
      loader.load(`/assets/cc0/${cfg.dir}/diff.jpg`, tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = aniso;
        blendTexIntoRT(rtA, tex, cfg.diffMix, false);
        tex.dispose();
        diffOk = true;
        mark();
      }, undefined, () => {});
      loader.load(`/assets/cc0/${cfg.dir}/nor.jpg`, tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = aniso;
        blendTexIntoRT(rtN, tex, cfg.normMix, true);
        tex.dispose();
        normOk = true;
        mark();
      }, undefined, () => {});
    }
  }

  // Injeta a projeção triplanar (ou UV), o desgaste e a poeira da base num MeshStandardMaterial
  _wear(mat, b, opts) {
    const triMode = !(opts.uv || b.mode === 'uv');
    const U = {
      tTriA: { value: b.map }, tTriP: { value: b.pack }, tTriN: { value: b.normalMap },
      uTriScale: { value: opts.scale ?? b.tile },
      uTriNS: { value: opts.normalScale ?? 0.85 },
      uDust: this.dust, uDustCol: this.dustColor,
      uDustK: { value: opts.dust ?? 1.0 },
      uWearK: { value: opts.wear ?? 1.0 }
    };
    Object.defineProperty(mat.userData, 'wearUniforms', {
      value: U,
      enumerable: false,
      configurable: true,
      writable: true
    });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, U);
      let vsh = s.vertexShader;
      vsh = vsh.replace('#include <common>', `#include <common>
        varying vec3 vTriP; varying vec3 vTriN; varying vec3 vTriAx; varying vec3 vTriAy; varying vec3 vTriAz;`);
      vsh = vsh.replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vTriP = position; vTriN = normal;
          mat3 triIM = mat3(1.0);
          #ifdef USE_INSTANCING
            triIM = mat3(instanceMatrix);
          #endif
          vTriAx = normalMatrix * (triIM * vec3(1.,0.,0.));
          vTriAy = normalMatrix * (triIM * vec3(0.,1.,0.));
          vTriAz = normalMatrix * (triIM * vec3(0.,0.,1.));
        }`);
      s.vertexShader = vsh;

      let fsh = s.fragmentShader;
      fsh = fsh.replace('#include <common>', `#include <common>
        varying vec3 vTriP; varying vec3 vTriN; varying vec3 vTriAx; varying vec3 vTriAy; varying vec3 vTriAz;
        uniform sampler2D tTriA, tTriP, tTriN;
        uniform float uTriScale, uTriNS, uDust, uDustK, uWearK;
        uniform vec3 uDustCol;
        ${MAT_WORLD_NOISE}
        vec4 triPk; vec3 triNo; float triDust;`);

      const sampleTri = `
        vec3 tnO = normalize(vTriN);
        vec3 twO = pow(abs(tnO), vec3(5.0)); twO /= (twO.x + twO.y + twO.z + 1e-5);
        vec3 tpO = vTriP / uTriScale;
        vec4 tA = vec4(0.0); triPk = vec4(0.0); vec3 tpN = vec3(0.0);
        if (twO.x > 0.02) { vec2 u = tpO.zy + vec2(.37,.11);
          tA += texture2D(tTriA,u)*twO.x; triPk += texture2D(tTriP,u)*twO.x;
          vec2 nn = (texture2D(tTriN,u).xy*2.-1.)*uTriNS; tpN += vec3(0., nn.y, nn.x*sign(tnO.x))*twO.x; }
        if (twO.y > 0.02) { vec2 u = tpO.xz + vec2(.71,.29);
          tA += texture2D(tTriA,u)*twO.y; triPk += texture2D(tTriP,u)*twO.y;
          vec2 nn = (texture2D(tTriN,u).xy*2.-1.)*uTriNS; tpN += vec3(nn.x, 0., nn.y)*twO.y; }
        if (twO.z > 0.02) { vec2 u = tpO.xy;
          tA += texture2D(tTriA,u)*twO.z; triPk += texture2D(tTriP,u)*twO.z;
          vec2 nn = (texture2D(tTriN,u).xy*2.-1.)*uTriNS; tpN += vec3(nn.x*sign(tnO.z), nn.y, 0.)*twO.z; }
        vec3 tObjN = normalize(tnO + tpN);
        triNo = normalize(normalize(vTriAx)*tObjN.x + normalize(vTriAy)*tObjN.y + normalize(vTriAz)*tObjN.z);
        vec3 geoV = normalize(normalize(vTriAx)*tnO.x + normalize(vTriAy)*tnO.y + normalize(vTriAz)*tnO.z);`;
      const sampleUV = `
        vec4 tA = texture2D(tTriA, vMapUv); triPk = texture2D(tTriP, vMapUv);
        vec3 geoV = normalize(normalize(vTriAx)*normalize(vTriN).x + normalize(vTriAy)*normalize(vTriN).y + normalize(vTriAz)*normalize(vTriN).z);`;

      fsh = fsh.replace('#include <map_fragment>', `
        ${triMode ? sampleTri : sampleUV}
        {
          // posição e normal de mundo reconstruídas sem varyings extras
          vec3 wP = (-vViewPosition) * mat3(viewMatrix) + cameraPosition;
          vec3 wN = geoV * mat3(viewMatrix);
          // variação macro para quebrar repetição em superfícies grandes
          float mac = mwN(wP.xz * 0.23 + wP.y * 0.11) * 0.6 + mwN(wP.xz * 1.7 - wP.y * 0.9) * 0.4;
          vec3 base = diffuseColor.rgb;
          vec3 alb = mix(tA.rgb, base * tA.rgb, tA.a);
          alb *= 0.9 + 0.2 * mac;
          // escorrimento de sujeira em paredes verticais
          float vert = 1.0 - smoothstep(0.35, 0.7, abs(wN.y));
          float streakN = mwN(vec2(dot(wP.xz, vec2(3.1, 2.3)) * 1.3, wP.y * 0.35));
          float grime = vert * smoothstep(0.55, 0.85, streakN) * 0.22 * uWearK;
          alb *= 1.0 - grime;
          // barra de poeira vermelha na base de tudo o que encosta no chão
          float n1 = mwN(wP.xz * 1.9 + wP.y * 0.6), n2 = mwN(wP.xz * 7.3 + vec2(wP.y * 4.1, 0.0));
          float hEdge = 0.35 + 0.65 * n1;
          float bar = 1.0 - smoothstep(0.05, 1.05 * hEdge, wP.y);
          bar = bar * (0.55 + 0.45 * n2) + (1.0 - smoothstep(0.0, 0.18, wP.y)) * 0.35;
          // filme de poeira em superfícies voltadas para cima
          float film = smoothstep(0.55, 0.95, wN.y) * (0.12 + 0.18 * n1) * smoothstep(9.0, 0.0, wP.y);
          triDust = clamp((bar * 0.8 + film) * uDust * uDustK, 0.0, 0.92);
          vec3 dc = uDustCol * (0.78 + 0.4 * n2);
          diffuseColor.rgb = mix(alb, dc, triDust);
        }`);
      fsh = fsh.replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = clamp(roughness * triPk.g, 0.03, 1.0);
        roughnessFactor = mix(roughnessFactor, 0.96, triDust);`);
      fsh = fsh.replace('#include <metalnessmap_fragment>', `
        float metalnessFactor = metalness * triPk.b * (1.0 - triDust);`);
      if (triMode) {
        fsh = fsh.replace('#include <normal_fragment_maps>', `
          normal = triNo;
          #ifdef DOUBLE_SIDED
            normal *= faceDirection;
          #endif
          #ifdef FLIP_SIDED
            normal = -normal;
          #endif`);
      }
      fsh = fsh.replace('#include <aomap_fragment>', `#include <aomap_fragment>
        {
          float tao = mix(1.0, triPk.r, 0.85);
          reflectedLight.indirectDiffuse *= tao;
          reflectedLight.directDiffuse *= mix(1.0, tao, 0.35);
          reflectedLight.indirectSpecular *= tao;
        }`);
      s.fragmentShader = fsh;
    };
    mat.customProgramCacheKey = () => 'senior-wear-' + (triMode ? 'tri' : 'uv');
  }

  get(key, opts = {}) {
    const color = opts.color ?? 0xffffff;
    const rough = opts.roughness ?? 1.0;
    const metal = opts.metalness ?? 0.0;
    const cacheKey = `${key}|${color}|${rough}|${metal}|${opts.side || 0}|${opts.normalScale ?? ''}|${opts.envMapIntensity ?? ''}|${opts.dust ?? ''}|${opts.scale ?? ''}|${opts.uv ? 1 : 0}|${opts.wear ?? ''}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const b = this.baked[key] || this.baked.liso;
    const uvMode = !!(opts.uv || b.mode === 'uv');
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      envMapIntensity: opts.envMapIntensity ?? 1.25,
      side: opts.side ?? THREE.FrontSide
    });
    if (uvMode) {
      // no modo UV o mapa define vMapUv e o normalMap usa o caminho tangente padrão
      mat.map = b.map;
      mat.normalMap = b.normalMap;
      mat.normalScale = new THREE.Vector2(opts.normalScale ?? 0.85, opts.normalScale ?? 0.85);
    }
    mat.userData.tile = b.tile;
    mat.userData.surface = key;
    this._wear(mat, b, opts);
    this.cache.set(cacheKey, mat);
    return mat;
  }

  getInteriorGlass() {
    if (this.cache.has('__interiorGlass')) return this.cache.get('__interiorGlass');
    const m = new THREE.MeshStandardMaterial({
      color: 0x9ec4cc,
      roughness: 0.08,
      metalness: 0.25,
      envMapIntensity: 1.9
    });
    m.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
varying vec2 vIntUv;
varying vec3 vViewDirI;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
vIntUv = uv;
vec4 wpI = modelMatrix * vec4(transformed, 1.0);
vViewDirI = normalize(wpI.xyz - cameraPosition);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec2 vIntUv;
varying vec3 vViewDirI;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
vec2 roomUv = fract(vIntUv * vec2(2.0, 1.0)) * 2.0 - 1.0;
vec3 rd = normalize(vViewDirI);
float depthT = 0.65 / max(abs(rd.z), 0.25);
vec2 backUv = roomUv + rd.xy * depthT * 0.45;
float inRoom = step(abs(backUv.x), 0.92) * step(abs(backUv.y), 0.92);
float ceiling = smoothstep(0.35, 0.85, backUv.y);
float blinds = step(0.18, fract(vIntUv.y * 14.0));
vec3 roomCol = mix(vec3(0.14, 0.19, 0.21), vec3(0.95, 0.78, 0.48), ceiling * 0.85 + 0.15);
roomCol *= mix(0.65, 1.0, inRoom) * mix(0.75, 1.0, blinds);
float fres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);
totalEmissiveRadiance += roomCol * (1.0 - fres) * 0.85;`);
    };
    this.cache.set('__interiorGlass', m);
    return m;
  }

  getGlass() {
    if (this.cache.has('__glass')) return this.cache.get('__glass');
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x7cb6c2,
      roughness: 0.06,
      metalness: 0.1,
      transmission: 0.45,
      transparent: true,
      opacity: 0.74,
      ior: 1.5,
      reflectivity: 0.9,
      envMapIntensity: 1.8
    });
    this.cache.set('__glass', mat);
    return mat;
  }

  getMetal(color, roughness = 0.38, metalness = 0.75) {
    return this.get('liso', { color, roughness, metalness, envMapIntensity: 1.35 });
  }

  // --- atalhos aditivos para desgaste explícito ---
  getRusty(color = 0x8a6a50, opts = {}) {
    return this.get('chapa', Object.assign({ color, roughness: 0.9, metalness: 0.55 }, opts));
  }

  getWornPaint(color, opts = {}) {
    return this.get('tinta', Object.assign({ color, roughness: 0.6, metalness: 0.3 }, opts));
  }

  getAgedWood(color = 0xb59a78, opts = {}) {
    return this.get('madeira', Object.assign({ color, roughness: 1.0 }, opts));
  }
}
