'use strict';
// Data and rules are independent of the interface. All paths use the same engine.
const COPY = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const RULES = '2.0';
const AREAS = [
  ['assess','초기 상황 확인',/상황|상태|점검|파악/], ['roles','담당자 역할 분담',/역할\s*분담|업무\s*분담|담당자\s*(지정|배정)|책임자\s*(지정|배정)|직원이\s*담당/],
  ['repair','냉방시설 장애 대응',/고장|수리|복구|냉방기/], ['protect','취약계층 보호',/고령|취약|보호|열 노출/],
  ['move','이동 지원',/이동|대피|동행|휠체어/], ['room','대체 냉방공간 확보',/쉼터|대체 공간|냉방공간|냉방 공간/],
  ['medical','온열질환 의심자 대응',/온열질환|의식|호흡|냉각|응급처치/], ['contact','119 신고 및 비상 연락',/119|연락|신고/],
  ['power','정전 및 복합 장애',/정전|비상전원|전력|통신/], ['record','대응 기록과 사후 점검',/기록|사후|인계/]
];
const SCENARIOS = {
  cooling:{name:'냉방시설 고장', icon:'snow', color:'', blurb:'냉방이 멈춘 복지관에서 이용자를 보호합니다.', brief:'한낮, 이용자가 모여 있는 복지관 프로그램실에서 냉방 장애가 보고됐습니다. 이용자 일부가 더위를 호소합니다.', type:'시설 장애', clock:'14:10'},
  illness:{name:'온열질환 의심자 발생',icon:'heart',color:'red',blurb:'의식이 저하된 이용자의 초기 대응을 판단합니다.',brief:'더운 공간에서 한 이용자가 쓰러졌고 부름에 반응이 뚜렷하지 않습니다. 호흡 상태는 아직 확인 중입니다.',type:'응급 대응',clock:'14:20'},
  shortage:{name:'대체 공간 및 인력 부족',icon:'users',color:'orange',blurb:'한정된 냉방 공간과 인력을 배분합니다.',brief:'복지관 체류 인원이 늘었습니다. 예정된 대체 냉방공간도 다른 이용자와 나눠 써야 합니다.',type:'자원 부족',clock:'15:00'},
  power:{name:'폭염 중 정전',icon:'bolt',color:'orange',blurb:'전력과 통신이 불안정한 상황에 대응합니다.',brief:'한낮에 주 전력이 끊기고 냉방과 일부 조명이 멈췄습니다. 일부 연락수단의 상태도 확인이 필요합니다.',type:'복합 장애',clock:'13:40'},
  route:{name:'이동약자 대피 경로 차단',icon:'route',color:'green',blurb:'주 이동로가 막힌 상황에서 안전한 이동을 계획합니다.',brief:'시설 내부가 더워지는 가운데 평소 쓰던 이동 경로가 차단됐습니다. 접근 가능한 우회로를 확인해야 합니다.',type:'이동 지원',clock:'14:35'}
};
const FUTURE = ['다수 온열질환 의심자 발생','야간 폭염 및 열대야','폭염 대응 안내 전달 실패','대피 및 냉방 지원 거부','폭염 대응 책임자 부재'];
const FACILITIES = {welfare:{name:'복지관',enabled:true},market:{name:'전통시장',enabled:false},workplace:{name:'소규모 사업장',enabled:false}};
const EMPTY = {type:'welfare',people:'',staff:'',cooling:'',room:'',contacts:'',hasPlan:'',elderly:'',mobility:'',capacity:'',extra:'',lift:'unknown',route:'unknown',power:'unknown',backupCooling:'unknown',water:'unknown',comms:'unknown',equipment:'unknown',hours:'',night:'unknown',notes:''};
const DEMO = {...EMPTY,people:32,staff:3,cooling:'normal',room:'yes',contacts:'yes',hasPlan:'yes',elderly:18,mobility:6,capacity:20,extra:2,lift:'yes',route:'yes',power:'no',water:'yes',comms:'yes',equipment:'yes',hours:'09:00~18:00',night:'no'};
const EXAMPLE_PLAN = {kind:'structured',text:'',items:{assess:'당직자가 프로그램실과 이용자 상태를 확인한다.',protect:'직원 한 명이 고령 이용자를 살피고 더운 활동을 중단시킨다.',contact:'응급상황에서는 담당자가 119에 신고하고 상황요원 안내에 따른다.'}};
const NEW_PLAN = {kind:'structured',text:'',items:{}};
const OPTIONS = {yes:'확보됨',no:'미확보',unknown:'미확인'};
const COOL = {normal:'정상',weak:'성능 저하',broken:'고장',none:'냉방시설 없음'};
const DEPTH = {core:{label:'핵심 훈련',limit:3},standard:{label:'일반 훈련',limit:7},deep:{label:'심화 훈련',limit:10}};
const MODE = {verify:'검증 모드',challenge:'도전 모드'};
const COACHES = {robot:'관제 로봇',fire:'소방관',drop:'물방울',sun:'대프리카 태양'};
const TONES = {warm:'친근한 설명',short:'간결한 설명',detail:'상세한 설명'};
const SOURCES = {
  health:{label:'질병관리청 · 폭염대비와 온열질환 예방을 위한 건강수칙 바로 알기',href:'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=122'},
  heat:{label:'행정안전부 국민안전24 · 폭염 국민행동요령',href:'https://www.safekorea.go.kr/safekorea-kor/acts/nacts/action-guide.do?category=heatWave&menuSn=4'},
  map:{label:'행정안전부 국민안전24 · 무더위쉼터',href:'https://www.safekorea.go.kr/safekorea-kor/flsm/flsm/facilitiesSafteyMap.do?menuSn=2&title=%EB%AC%B4%EB%8D%94%EC%9C%84%EC%89%BC%ED%84%B0'},
  emergency:{label:'E-Gen에서 대구 응급실 찾기',href:'https://www.e-gen.or.kr/egen/search_emergency_room.do?searchType=general&loca=13&sidoCode=13&radioCode=road'}
};

function normalizeFacility(raw) {
  const f = {...EMPTY,...raw};
  for (const key of ['people','staff','elderly','mobility','capacity','extra']) {
    f[key] = f[key] === '' || f[key] == null ? null : Number(f[key]);
  }
  if (f.room !== 'yes') f.capacity = null;
  return f;
}
function facilityErrors(f) {
  const errors = {};
  const count = (key, label, min, max, required) => {
    if (f[key] === null && !required) return;
    if (!Number.isInteger(f[key]) || f[key] < min || f[key] > max) errors[key] = `${label}은(는) ${min}~${max} 사이의 정수를 입력하세요.`;
  };
  count('people','이용자 수',1,10000,true);
  count('staff','현장 인력',0,1000,true);
  count('elderly','고령 이용자 수',0,f.people || 10000,false);
  count('mobility','이동 지원 필요 인원',0,f.people || 10000,false);
  count('capacity','수용 인원',1,10000,f.room === 'yes');
  count('extra','추가 인력',0,1000,false);
  if (!FACILITIES[f.type]?.enabled) errors.type = '사용할 수 있는 시설 유형을 선택하세요.';
  if (!Object.hasOwn(COOL,f.cooling)) errors.cooling = '냉방시설 상태를 선택하세요.';
  for (const key of ['room','contacts','hasPlan']) if (!Object.hasOwn(OPTIONS,f[key])) errors[key] = '상태를 선택하세요.';
  return errors;
}
function inspectPlan(plan, f, scenario) {
  return AREAS.map(([id,label,pattern]) => {
    const chunks = plan.kind === 'structured' ? [plan.items[id] || ''] : plan.kind === 'free' ? plan.text.split(/[\n.!?。]+/).filter(line=>pattern.test(line)) : [];
    const matches=chunks.map(line=>line.trim()).filter(Boolean);
    const evidence=matches.slice(0,4).join(' · ');
    const negative = /하지\s*않|하지\s*말|하지\s*못|미확보|미구축|미작성|담당\s*없|계획\s*없|지원\s*없|절차\s*없/.test(evidence);
    const concrete = /\d+\s*(?:분|시|명)|담당|직원|당직|즉시|상황요원|확인\s*후|승인/.test(evidence) && /확인|연락|신고|이동|요청|배치|기록|가동|살피|중단|지원|점검|식히/.test(evidence);
    let level = '관련 내용이 확인되지 않음';
    if (evidence) level = negative ? '추가 확인 필요' : plan.kind === 'structured' && concrete ? '구체적으로 명시됨' : plan.kind==='free' ? '관련 문장 발견 · 직접 확인' : '일부 명시되었으나 불명확함';
    else if (id === 'repair' && f.cooling === 'none') level = '해당 시설과 관련성이 낮음';
    else if (id === 'move' && f.mobility === 0 && f.room === 'no' && scenario !== 'route') level = '해당 시설과 관련성이 낮음';
    const planned=plan.kind==='free'?plan.confirmed?.[id]===true:!!evidence&&!negative;
    return {id,label,evidence,level,planned};
  });
}

function initialState(f, config) {
  const power = config.scenario === 'power' ? 'out' : 'on';
  let cooling = f.cooling;
  if (config.scenario === 'cooling' && cooling === 'normal') cooling = 'broken';
  if (['shortage','route'].includes(config.scenario) && cooling === 'normal') cooling = 'weak';
  if (power === 'out' && cooling !== 'none') cooling = 'off';
  const route = config.scenario === 'route' ? 'blocked' : f.route === 'yes' ? 'safe' : f.route === 'no' ? 'blocked' : 'unknown';
  const mobility = f.mobility ?? null;
  return {
    minute:0, people:f.people, staff:f.staff, support:f.extra, supportStatus:'none', mobility, elderly:f.elderly,
    moved:0, assisted:0, temporary:0, room:f.room, capacity:f.capacity === null ? null : config.scenario === 'shortage' ? Math.max(1,Math.floor(f.capacity / 2)) : f.capacity, externalCapacity:0, mobilityEstimated:false,
    cooling,power,comms:power === 'out' ? 'unknown' : 'on',contacts:f.contacts, contactStatus:'none', route,
    lift:f.lift, water:f.water, equipment:f.equipment, emergencyPower:f.power, backupCooling:f.backupCooling, powerChecked:false,
    checked:false, cardiac:'unknown', patient:config.scenario === 'illness' ? 'severe' : 'none', cooled:false, callAt:null, dispatch:'none', followed:false,
    repairAt:null, repairStatus:'none', delegated:false, records:false, relief:false, unsafe:0, supportAt:null, supportSource:null, done:[], events:[], resolved:[]
  };
}
const ok = message => ({ok:true,message});
const no = message => ({ok:false,message});
const needs = (condition, message) => condition ? null : message;
const work = (s,n=1) => needs(s.staff >= n, `이 조치에는 현장 대응 인력 ${n}명 이상이 필요합니다.`);
const addResolved = (s,...ids) => {for (const id of ids) if (s.events.includes(id) && !s.resolved.includes(id)) s.resolved.push(id);};
const remaining = s => Math.max(0,s.people - s.moved);
const protectedCount = s => s.cooling === 'normal' && s.power !== 'out' ? s.people : Math.min(s.people,s.moved + s.temporary);
const supportRemaining = s => Math.max(0,(s.mobility ?? 0) - s.assisted);
const hasCoolingPower = s => s.power==='on'||(s.power==='backup'&&s.backupCooling==='yes');
const actions = {
  assess:{label:'시설과 이용자 상태 확인',minutes:2,area:'assess',effect:(s,f)=>{
    s.checked=true;
    if (s.patient === 'severe') s.cardiac='breathing';
    if (s.mobility === null) {s.mobility = Math.min(remaining(s),Math.ceil(f.people / 8));s.mobilityEstimated=true;}
    return ok(s.patient === 'severe' ? '가상 이용자의 호흡이 확인됐지만 의식 저하가 지속됩니다.' : `이용자 ${s.people}명, 이동 지원 ${s.mobility}명${s.mobilityEstimated?'(시나리오 가정)':''}을 확인했습니다.`);
  }},
  roles:{label:'현장 확인·보호·연락 역할 분담',minutes:2,area:'roles',guard:s=>work(s,2),effect:s=>{s.delegated=true;addResolved(s,'staff');return ok('현장 보호와 연락 업무를 서로 다른 담당자에게 배정했습니다.');}},
  protect:{label:'활동 중단 및 현장 열 노출 줄이기',minutes:3,area:'protect',effect:s=>{
    s.temporary=Math.max(s.temporary,Math.min(remaining(s),Math.max(1,Math.floor(s.people*.55))));s.relief=true;addResolved(s,'prolonged');
    return ok(`가상으로 ${s.temporary}명이 차광과 활동 중단 등 임시 보호를 받습니다. 임시 보호는 냉방공간 수용과 별개입니다.`);
  }},
  call:{label:'119에 가상 신고',minutes:1,area:'contact',effect:s=>{
    if (s.comms !== 'on') return no('현재 연락수단으로 119 연결을 확인하지 못했습니다. 대체 연락수단을 확인할 수 있습니다.');
    s.callAt=s.minute;s.dispatch='requested';return ok('가상 신고가 접수됐습니다. 환자 상태와 시설 진입 정보를 전달했습니다.');
  }},
  parallel:{label:'동료에게 가상 119 신고를 맡기고 환자 상태 확인',minutes:2,area:'contact',guard:s=>work(s,2)||needs(s.comms==='on','가상 신고에 사용할 연락수단이 확인되지 않았습니다.'),effect:s=>{
    s.callAt=s.minute;s.dispatch='requested';s.cardiac='breathing';s.checked=true;s.delegated=true;s.done.push('call','assess');
    return ok('가상 119 신고를 동료에게 맡기는 동시에 의식과 호흡을 확인했습니다.');
  }},
  cool:{label:'의심 환자 열 노출 차단 및 냉각',minutes:2,area:'medical',effect:s=>{s.cooled=true;return ok('가상 환자의 열 노출을 줄이고 몸을 식혔습니다. 의식과 호흡 상태 관찰은 계속 필요합니다.');}},
  follow:{label:'119 상황요원 안내를 받아 상태 관찰',minutes:2,area:'medical',guard:s=>needs(s.callAt!==null,'가상 119 연결이 먼저 필요합니다.'),effect:s=>{s.followed=true;s.cardiac='breathing';s.cooled=true;addResolved(s,'delay');return ok('가상 상황요원 안내에 따라 호흡을 확인하고 냉각과 상태 관찰을 이어갔습니다.');}},
  drinkPatient:{label:'의식이 저하된 의심 환자에게 음료 제공',minutes:1,area:'medical',effect:s=>{s.unsafe+=1;return ok('음료 제공 시도가 가상 기록에 남았습니다. 환자 보호 상태는 개선되지 않았습니다.');}},
  water:{label:'의식이 명료한 이용자에게 식수 제공',minutes:2,area:'protect',effect:s=>{
    if (s.water !== 'yes') return no(s.water === 'unknown' ? '사용 가능한 식수량이 확인되지 않았습니다.' : '현재 배부할 식수가 없습니다.');
    return ok('안전하게 삼킬 수 있는 이용자에게 식수를 제공했습니다. 의식 저하가 있는 의심 환자는 대상에서 제외했습니다.');
  }},
  waterSupply:{label:'대체 식수 확보 요청',minutes:3,area:'protect',guard:s=>needs(s.comms==='on','식수를 요청할 연락수단이 필요합니다.'),effect:s=>{
    s.water='yes';addResolved(s,'water');return ok('가상 지원처에서 대체 식수를 확보했습니다.');
  }},
  room:{label:'대체 냉방공간 가용 여부·수용 인원 확인',minutes:3,area:'room',effect:s=>{
    if (s.room !== 'yes') {s.room='no';return ok('현재 시설 안에서 사용할 수 있는 대체 공간을 찾지 못했습니다. 외부 공간을 요청할 수 있습니다.');}
    return ok(`대체 공간에 ${s.capacity}명까지 수용 가능한 것으로 확인했습니다.`);
  }},
  external:{label:'외부 냉방공간 수용 요청',minutes:4,area:'room',repeat:true,effect:s=>{
    if (s.comms !== 'on') return no('연락수단 제한으로 외부 공간 확인을 완료하지 못했습니다.');
    const added=Math.min(2000,Math.ceil(Math.max(0,s.people-(s.capacity||0))*.75));
    if (!added) return ok('현재 냉방공간에 전체 이용자를 수용할 자리가 있습니다.');
    s.room='yes';s.capacity=(s.capacity||0)+added;s.externalCapacity+=added;
    if(s.capacity>=s.people)addResolved(s,'space');
    return ok(`가상 외부 냉방공간 ${added}자리를 추가해 전체 ${s.capacity}명을 수용할 수 있습니다.`);
  }},
  route:{label:'이동 경로 확인 및 우회로 확보',minutes:3,area:'move',effect:(s,f)=>{
    if (f.route === 'no' && s.supportStatus !== 'arrived') {s.route='blocked';return ok('현장 확인 결과 접근 가능한 경로가 없습니다. 외부 지원으로 우회 표지와 동행을 요청할 수 있습니다.');}
    s.route='safe';addResolved(s,'lift');return ok('모의 현장 점검으로 이용 가능한 접근 경로를 확보했습니다.');
  }},
  move:{label:'확인된 냉방공간으로 나누어 이동',minutes:5,area:'move',repeat:true,effect:s=>{
    if (s.room !== 'yes' || !s.capacity || s.capacity <= s.moved) return no('수용 가능 인원이 확인된 냉방공간에 빈 자리가 없습니다.');
    if (s.route !== 'safe') return no('이동 경로의 안전이 확인되지 않았습니다. 이동을 시작하지 않았습니다.');
    if (s.mobility === null) return no('이동 지원 필요 인원을 확인해야 이동을 배정할 수 있습니다.');
    if (s.staff === 0) return no('현장 동행 인력을 배치할 수 없어 이동하지 않았습니다.');
    const capacity=Math.min(s.capacity-s.moved,remaining(s));
    const assisted=Math.min(capacity,supportRemaining(s),Math.max(0,s.staff-1)*(s.equipment === 'yes' ? 3 : 2));
    const independent=Math.min(capacity-assisted,remaining(s)-supportRemaining(s),s.staff*8);
    if (assisted+independent === 0) return no('남은 이용자에게 필요한 이동 지원 인력을 확보하지 못했습니다.');
    s.moved+=assisted+independent;s.assisted+=assisted;s.temporary=Math.min(s.temporary,remaining(s));
    return ok(`${assisted+independent}명이 이동했습니다. 이동 지원을 받아 이동한 이용자는 ${assisted}명입니다.`);
  }},
  direct:{label:'별도 점검 없이 기존 경로로 일괄 이동 시도',minutes:2,area:'move',effect:s=>{
    if (s.route === 'safe' && s.room === 'yes' && s.mobility === 0 && s.staff >= 1 && s.capacity-s.moved >= remaining(s)) {
      s.moved=s.people;s.temporary=0;return ok('확인된 경로와 수용 조건에서 전원이 이동했습니다.');
    }
    s.unsafe+=1;return no('안전한 경로·수용 인원·이동 지원 조건을 확인할 수 없어 일괄 이동이 중지됐습니다.');
  }},
  repair:{label:'설비 담당자에게 냉방 점검·복구 요청',minutes:2,area:'repair',effect:s=>{
    s.repairAt=s.minute;s.repairStatus='requested';return ok('설비 담당자에게 가상 점검을 요청했습니다. 냉방 복구 여부는 후속 확인이 필요합니다.');
  }},
  restore:{label:'작업 결과 확인 후 냉방 재가동',minutes:3,area:'repair',effect:s=>{
    if (!hasCoolingPower(s)) return no('냉방 설비를 가동할 수 있는 전원이 확인되지 않았습니다.');
    if (s.repairAt===null) return no('설비 담당자의 점검이 접수되지 않았습니다.');
    if (s.minute-s.repairAt < (s.events.includes('repairDelay')?10:5)) return no('설비 점검이 진행 중입니다. 아직 재가동을 승인받지 못했습니다.');
    s.cooling='normal';s.repairStatus='restored';addResolved(s,'repairDelay');return ok('가상 설비 담당자의 안전 확인 후 냉방이 정상 재가동됐습니다.');
  }},
  power:{label:'정전 범위와 비상전원 확인',minutes:3,area:'power',effect:s=>{
    s.powerChecked=true;
    if (s.emergencyPower === 'yes') {s.power='backup';if (s.comms==='unknown') s.comms='on';return ok(s.backupCooling==='yes'?'가상 비상전원이 냉방을 지원합니다. 설비 점검 후 가동할 수 있습니다.':'가상 비상전원의 냉방 지원이 확인되지 않았습니다. 임시 보호나 대체 냉방공간이 필요합니다.');}
    return ok(s.emergencyPower==='unknown'?'가동 가능한 비상전원을 확인하지 못했습니다.':'설정된 비상전원이 없어 주 전력 복구를 기다리고 있습니다.');
  }},
  grid:{label:'주 전력 복구 여부 확인',minutes:2,area:'power',repeat:true,guard:s=>needs(s.minute>=12,'가상 설비 담당자의 주 전력 복구 보고를 아직 받지 못했습니다.'),effect:s=>{
    s.power='on';s.powerChecked=true;addResolved(s,'compound');return ok('가상 주 전력 복구를 확인했습니다. 승인된 절차에 따라 냉방 설비를 점검할 수 있습니다.');
  }},
  comms:{label:'사용 가능한 연락수단 확인 및 전환',minutes:2,area:'power',effect:(s,f)=>{
    if (f.comms !== 'no' || s.power === 'backup' || s.delegated) {s.comms='on';addResolved(s,'comms','contact');return ok('가상으로 사용 가능한 통신 회선 또는 현장 전달자를 확보했습니다.');}
    return no('대체 통신수단이 확보되지 않았습니다. 역할 분담이나 비상전원을 확인할 수 있습니다.');
  }},
  contacts:{label:'시설 비상연락망으로 관계자에게 연락',minutes:2,area:'contact',effect:s=>{
    if (s.comms !== 'on' || s.contacts !== 'yes') {s.contactStatus='failed';return no('비상 연락망 또는 통신이 확인되지 않아 담당자 연결을 완료하지 못했습니다.');}
    s.contactStatus='reached';addResolved(s,'contact');return ok('가상 비상 담당자에게 상황을 전달했습니다.');
  }},
  support:{label:'추가 인력과 현장 지원 요청',minutes:3,area:'roles',effect:s=>{
    if (s.comms !== 'on') return no('연락수단을 확보해야 추가 인력을 요청할 수 있습니다.');
    s.supportStatus='requested';s.supportAt=s.minute;s.supportSource=s.support>0?'시설 추가 인력':'가상 외부 지원';return ok(`${s.supportSource} 요청을 접수했습니다. 후속 판단에서 도착 여부를 확인할 수 있습니다.`);
  }},
  liaison:{label:'지원 기관에 재연락하고 인계 정보 정리',minutes:3,area:'record',effect:s=>{
    if (s.comms !== 'on') return no('지원 기관과 연결할 수 없습니다.');
    s.records=true;addResolved(s,'guardian');return ok('가상 인계 정보를 정리하고 관계자와 후속 조치를 확인했습니다.');
  }},
  wait:{label:'현 위치에서 추가 보고를 기다림',minutes:5,area:null,repeat:true,effect:()=>ok('추가 조치 없이 5분이 지났습니다.')}
};
const EVENTS = {
  staff:{name:'대응 인력 부족',test:s=>s.staff<2&&!s.delegated&&remaining(s)>0,next:['roles','support','protect']},
  space:{name:'대체 냉방공간 부족',test:(s,f,c,id)=>s.room==='yes'&&s.capacity!==null&&s.capacity<s.people&&s.cooling!=='normal'&&(c.scenario==='shortage'||['room','move','direct'].includes(id)),next:['external','protect','move']},
  repairDelay:{name:'냉방시설 복구 지연',test:s=>s.repairAt!==null&&s.minute-s.repairAt>=5&&s.cooling!=='normal',next:['restore','external','protect']},
  contact:{name:'비상 연락 실패',test:s=>s.contactStatus==='failed',next:['comms','support','liaison']},
  compound:{name:'복합 장애 발생',test:(s,f,c)=>c.mode==='challenge'&&s.minute>=12&&s.power!=='on'&&s.cooling!=='normal',next:['power','external','liaison']},
  delay:{name:'119 구급대 대응 지연 (교육용 가상)',test:(s,f,c)=>s.callAt!==null&&s.minute-s.callAt>=3&&s.patient==='severe'&&!s.followed&&(c.mode==='challenge'||c.depth==='deep'),effect:s=>{s.dispatch='delayed';},next:['follow','cool']},
  water:{name:'식수 공급 중단',test:(s,f,c)=>c.mode==='challenge'&&s.water==='yes'&&s.minute>=11&&remaining(s)>0,effect:s=>{s.water='no';},next:['waterSupply','protect','external']},
  lift:{name:'승강기 고장',test:(s,f,c)=>s.lift==='yes'&&s.power==='out'&&supportRemaining(s)>0,effect:s=>{s.lift='no';s.route='blocked';},next:['route','support','protect']},
  guardian:{name:'보호자 연락 두절',test:(s,f,c,id)=>c.depth==='deep'&&id==='contacts'&&s.contactStatus==='reached'&&(s.elderly ?? 0)>0,next:['liaison','protect']},
  comms:{name:'통신 장애',test:(s,f,c,id)=>c.mode==='challenge'&&s.power==='out'&&s.minute>=6&&s.comms==='unknown'&&id!=='comms',effect:s=>{s.comms='out';},next:['comms','power','roles']},
  supportDelay:{name:'지원 인력 미도착',test:(s,f,c)=>s.supportStatus==='requested'&&(c.mode==='challenge'||s.support===0),effect:s=>{s.supportStatus='delayed';},next:['liaison','protect']},
  prolonged:{name:'폭염 장기화',test:s=>s.minute>=18&&protectedCount(s)<s.people,effect:s=>{s.temporary=Math.floor(s.temporary/2);},next:['protect','external','move']}
};
const OPEN_ACTIONS = {
  cooling:['assess','repair','protect','room','move','wait'],illness:['call','assess','cool','drinkPatient','protect','wait'],
  shortage:['assess','room','roles','support','protect','wait'],power:['assess','power','comms','protect','room','wait'],
  route:['assess','route','room','direct','support','protect','wait']
};
function available(s,c) {
  const next = [...OPEN_ACTIONS[c.scenario]];
  if (c.scenario==='illness' && s.callAt!==null) next.push('follow');
  if (c.scenario==='illness' && s.callAt===null && s.staff>=2) next.push('parallel');
  if (c.scenario==='illness' && s.comms!=='on') next.push('comms');
  if (c.scenario!=='illness') {
    if (s.checked || s.minute >= 2) next.push('water','roles','contacts');
    if (s.minute>=2) next.push('move','route');
    if (s.done.includes('room') || s.room==='no') next.push('external');
    if (s.cooling!=='none' && s.cooling!=='normal' && hasCoolingPower(s)) next.push('repair');
    if (s.repairAt!==null) next.push('restore');
  }
  if(c.scenario==='power'&&s.power!=='on'&&s.minute>=8)next.push('grid');
  if (s.comms!=='on') next.push('comms');
  if (c.depth!=='core' || s.staff<2 || s.contactStatus==='failed' || s.route==='blocked') next.push('support');
  if (c.depth!=='core' || s.supportStatus==='delayed') next.push('liaison');
  for (const id of s.events) if (!s.resolved.includes(id)) next.push(...EVENTS[id].next);
  return [...new Set(next)].filter(id=>{
    if (id==='repair' && (['none','normal'].includes(s.cooling)||!hasCoolingPower(s))) return false;
    if(id==='external'&&(s.capacity||0)>=s.people)return false;
    if (id==='move' && !remaining(s)) return false;
    if (id==='support' && s.supportStatus!=='none') return false;
    const retry = (id==='protect' && s.events.includes('prolonged') && !s.resolved.includes('prolonged')) || (id==='route' && s.route!=='safe');
    return actions[id].repeat || retry || !s.done.includes(id);
  });
}
function step(state,f,c,id) {
  if (!available(state,c).includes(id)) return null;
  const s=COPY(state), action=actions[id];
  const before=COPY(state), blocked=action.guard?.(s);
  const outcome=blocked?no(blocked):action.effect(s,f);
  s.minute+=outcome.ok?action.minutes:1;
  if (outcome.ok && !s.done.includes(id)) s.done.push(id);
  const newEvents=[];
  for (const [event,rule] of Object.entries(EVENTS)) {
    if (!s.events.includes(event) && rule.test(s,f,c,id)) {s.events.push(event);newEvents.push(event);rule.effect?.(s);}
  }
  if (['requested','delayed'].includes(s.supportStatus) && s.supportAt!==null && id!=='support' && s.minute-s.supportAt>=(s.supportStatus==='delayed'?9:5)) {
    s.staff+=s.supportSource==='시설 추가 인력'?s.support:1;s.supportStatus='arrived';
    addResolved(s,'supportDelay');if(s.staff>=2)addResolved(s,'staff');
  }
  if(protectedCount(s)===s.people)addResolved(s,'space','prolonged');
  return {id,at:before.minute,elapsed:s.minute-before.minute,before,after:s,ok:outcome.ok,message:outcome.message,events:newEvents};
}
const GOALS = {
  assess:{label:'시설과 이용자 상태 확인',reason:'대상 인원과 상태를 알아야 보호와 인력 배치를 결정할 수 있습니다.',source:'heat',test:s=>s.checked,ideas:['assess']},
  protect:{label:'이용자 열 노출 줄이기',reason:'시원한 환경 확보와 활동 중단은 폭염 노출을 줄이는 조치입니다. 임시 차광은 냉방 수용과 구분합니다.',source:'heat',test:s=>protectedCount(s)>0,ideas:['protect','move','restore']},
  repair:{label:'설비 점검 또는 대체 보호',reason:'설비 점검을 요청하거나 이용자를 대체 냉방 환경으로 보호할 수 있습니다.',source:'heat',test:s=>s.repairAt!==null||s.moved>0,ideas:['repair','external','move']},
  call:{label:'중증 의심 시 첫 판단에서 가상 119 신고',reason:'의식 저하는 중증 의심 신호입니다. 실제 상황에서는 즉시 119에 신고하고 상황요원의 안내를 따릅니다. 동료가 있다면 신고와 현장 확인을 나눌 수 있습니다.',source:'health',test:s=>s.callAt===0,ideas:['call','parallel']},
  cool:{label:'의심 환자 냉각',reason:'119 신고와 함께 안전한 범위에서 환자의 열 노출을 줄이고 몸을 식힙니다.',source:'health',test:s=>s.cooled,ideas:['cool','follow']},
  breathing:{label:'의식과 호흡 상태 확인',reason:'의식과 호흡 상태를 파악해 119에 알리고 상황요원의 지시에 따라 관찰을 이어갑니다.',source:'health',test:s=>s.cardiac!=='unknown',ideas:['assess','follow','parallel']},
  room:{label:'대체 냉방공간 가용 범위 확인',reason:'수용 인원을 파악하면 필요한 외부 지원 규모와 이동 순서를 정할 수 있습니다.',source:'heat',test:s=>s.done.includes('room')||s.done.includes('external')||s.moved>0,ideas:['room','external']},
  staff:{label:'제한된 인력 배분·지원 요청',reason:'인력과 수용 공간이 부족하면 보호·연락 등 역할을 분담하거나 추가 지원을 요청합니다.',source:'heat',test:s=>s.delegated||s.supportStatus!=='none',ideas:['roles','support']},
  power:{label:'정전 범위 및 비상전원 확인',reason:'정전 중에는 전원 공급 범위와 사용 가능한 설비를 확인해 대응을 조정합니다.',source:null,test:s=>s.done.includes('power')||s.done.includes('grid'),ideas:['power','grid']},
  comms:{label:'사용 가능한 연락수단 확인',reason:'통신이 제한된 상황에는 실제로 연결 가능한 대응 경로를 확인합니다.',source:null,test:s=>s.comms==='on',ideas:['comms','power']},
  route:{label:'안전한 이동 경로 확인',reason:'차단된 경로에서는 우회로와 동행 인력을 확인하고, 이동이 불가능하면 임시 보호와 지원 요청을 검토합니다.',source:null,test:s=>s.route==='safe'||(s.done.includes('route')&&s.relief),ideas:['route','protect','support']}
};
const OBJECTIVES={cooling:['assess','protect','repair'],illness:['call','cool','breathing'],shortage:['room','staff','protect'],power:['power','comms','protect'],route:['route','protect','assess']};
function assessRun(state,f,c,history) {
  const goals=OBJECTIVES[c.scenario].filter(id=>id!=='repair'||f.cooling!=='none').map(id=>({id,...GOALS[id],met:GOALS[id].test(state)}));
  const legacy=c.rules==='1.0';
  if(legacy&&c.scenario==='illness')goals.find(g=>g.id==='call').met=state.callAt!==null&&state.callAt<=2;
  if(legacy&&c.depth!=='core'&&state.events.length>0)goals.push({id:'events',label:'돌발상황 후속 조치',reason:'이전 규칙으로 기록한 후속 대응입니다.',met:state.resolved.length>0,ideas:[...new Set(state.events.flatMap(id=>EVENTS[id].next))]});
  const achieved=goals.filter(g=>g.met).length;
  const score=clamp(Math.round(100*achieved/goals.length)-state.unsafe*20,0,100);
  const missing=goals.filter(g=>!g.met);
  const ordered=[...missing,...goals.filter(g=>g.met)];
  const performed=new Set(history.filter(h=>h.ok&&h.id!=='drinkPatient').map(h=>actions[h.id].area));
  const critical=[];
  if(c.scenario==='illness'&&state.callAt!==0)critical.push(state.callAt===null?'가상 119 신고 미실시':`가상 119 첫 신고 +${state.callAt}분`);
  if(c.scenario==='illness'&&!state.cooled)critical.push('의심 환자 냉각 미실시');
  if(state.unsafe)critical.push(`위험 행동 ${state.unsafe}건`);
  return {score,goals,achieved,missing,learning:ordered.slice(0,3),performed,critical,pending:state.events.filter(id=>!state.resolved.includes(id))};
}
function evaluateAction(row,c) {
  const action=actions[row.id];
  if (row.after.unsafe>row.before.unsafe) return ['위험하거나 부적절한 대응',row.id==='drinkPatient'?'의식이 저하된 사람에게 음료를 주면 흡인·질식 위험이 있습니다.':'경로, 수용 공간과 이동 지원이 확인되지 않은 상태에서 일괄 이동을 시도했습니다.',row.id==='drinkPatient'?'health':null,'red'];
  if (!row.ok) return ['보완이 필요한 대응',`${row.message} 선행 조건을 확인한 뒤 다시 판단할 수 있습니다.`,null,'orange'];
  if (['call','parallel'].includes(row.id) && c.scenario==='illness' && row.at>(c.rules==='1.0'?2:0)) return ['보완이 필요한 대응','가상 신고는 연결됐습니다. 의식 저하가 처음부터 알려진 경우 첫 판단에서 신고를 시작하는 것이 목표입니다.','health','orange'];
  if (row.id==='wait') return ['추가 정보가 필요한 대응','대기 중 미완료 보호조치가 있었다면 열 노출이 이어질 수 있습니다. 대기 사유와 관찰 담당을 함께 확인하세요.','heat','orange'];
  const goal=OBJECTIVES[c.scenario].map(id=>GOALS[id]).find(g=>g.ideas.includes(row.id)&&g.test(row.after)&&!g.test(row.before));
  if (goal) return ['권장되는 대응',goal.reason,goal.source,'green'];
  return ['적절한 대응',row.message,row.id==='cool'||row.id==='follow'?'health':null,'green'];
}
const $ = selector => document.querySelector(selector);
const compactScreen=matchMedia('(max-width: 649px)');
function focusSection(element,block='start') {
  if(!element)return;
  if(!element.hasAttribute('tabindex'))element.tabIndex=-1;
  element.focus({preventScroll:true});
  element.scrollIntoView({block});
}
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const icons = {
  drop:'M12 2c2.5 4 7 8.1 7 12a7 7 0 0 1-14 0c0-3.9 4.5-8 7-12Z M8 14a4 4 0 0 0 4 4',menu:'M5 6h14M5 12h14M5 18h14',
  shield:'M12 22s7-3.5 7-10V5l-7-3-7 3v7c0 6.5 7 10 7 10Z M10 13l2 2 4-5',home:'m3 10 9-7 9 7v10h-6v-6h-6v6H3z',play:'m9 5 11 7-11 7z',history:'M3 12a9 9 0 1 1 3 6.7M3 5v7h7m2-5v5l4 2',book:'M3 5c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2z m9 2v14',gear:'M9 3h6l.5 3 2 1.2 2.8-1 3 5-2.3 2 .1 2.2 2 2.3-3 4.4-2.8-1-2 1-.5 2H9l-.6-2-2-1-2.8 1-3-4.4 2-2.3.1-2.2-2.3-2 3-5 2.8 1L8.5 6z M15 13a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z',sun:'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5 M17 12a5 5 0 1 0-10 0 5 5 0 0 0 10 0Z',moon:'M20.7 15.5A8.5 8.5 0 0 1 8.5 3.3a9 9 0 1 0 12.2 12.2Z',alert:'M12 3 2 21h20z M12 9v5m0 3v.2',pin:'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z',snow:'M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3m-6 16 3-3 3 3M4 10l4-1-1-4m13 9-4 1 1 4M4 14l4 1-1 4m13-9-4-1 1-4',heart:'M20 6c-2-2-5-2-8 1-3-3-6-3-8-1-2 2-2 5 0 7l8 8 8-8c2-2 2-5 0-7Z M3 12h5l2-3 3 6 2-3h6',users:'M15 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM3 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2m0-17a4 4 0 0 1 0 8m1 4a4 4 0 0 1 3 4v1',bolt:'m13 2-9 12h7l-1 8 10-12h-7z',route:'M7 7h10a4 4 0 0 1 0 8H8a3 3 0 1 0 0 6h9M7 7a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Zm15 14a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z',chart:'M3 3v18h18M8 15l4-5 4 2 5-7',repeat:'M4 9a8 8 0 0 1 14-3l3 3m0-5v5h-5m4 6a8 8 0 0 1-14 3l-3-3m0 5v-5h5',clipboard:'M9 5H5v16h14V5h-4M9 3h6v5H9zM8 12h8m-8 4h6',check:'m5 12 4 4L19 6',chevron:'m9 18 6-6-6-6',close:'m6 6 12 12M18 6 6 18',info:'M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0ZM12 11v6m0-10v.3',clock:'M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0ZM12 6v6l4 2',edit:'m4 16-1 5 5-1L20 8l-4-4z m11-11 4 4',phone:'M8 3H4c-2 8 9 19 17 17v-4l-5-2-2 2c-3-1-5-3-6-6l2-2z',layers:'m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5'
};
const icon = id => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[id]||icons.info}"/></svg>`;
const pill = (label,color='') => `<span class="pill ${color}">${escapeHTML(label)}</span>`;
const button = (label,action,{kind='',mark='',value='',title=''}={}) => `<button type="button" class="btn ${kind}" data-action="${action}" data-value="${escapeHTML(value)}"${title?` aria-label="${escapeHTML(title)}"`:''}>${mark?icon(mark):''}${escapeHTML(label)}</button>`;
const smallButton = (label,action,mark) => `<button type="button" class="icon-btn" data-action="${action}" aria-label="${label}" title="${label}">${icon(mark)}</button>`;
const notice = (message,kind='',mark='info') => `<div class="notice ${kind}">${icon(mark)}<div>${message}</div></div>`;
const external = (label,url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`;
const sourceLink = id => id && SOURCES[id] ? `${external(SOURCES[id].label,SOURCES[id].href)} <span class="muted">(2026.11.23 확인)</span>` : '';
const metric = (label,value) => `<div class="metric"><small>${escapeHTML(label)}</small><b>${escapeHTML(value)}</b></div>`;
const typeName = f => FACILITIES[f.type]?.name || '시설';
const time = value => new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
const enumLabel = value => value==='yes'?'있음':value==='no'?'없음':'미확인';
const ROUTES={safe:'사용 가능',blocked:'차단',unknown:'미확인'};
const COMMS={on:'연결 가능',out:'장애',unknown:'미확인'};
const POWER={on:'정상',out:'정전',backup:'비상전원'};
const DISPATCH={none:'미신고',requested:'가상 신고 접수',delayed:'가상 대응 지연'};
const SUPPORT={none:'미요청',requested:'요청 접수',delayed:'미도착',arrived:'지원 도착'};
const CONTACT={none:'미시도',failed:'연결 실패',reached:'시설 담당자 연결'};
const STATUS={active:'진행 중',paused:'일시 중단',complete:'정상 완료',incomplete:'미완료 종료',stopped:'사용자 중단'};
const isOpen = record => !!record && ['active','paused'].includes(record.status);
const storageKey='heat-check-ai-2:';
const metaKey=`${storageKey}settings`, runKey=`${storageKey}run:`;
const defaultPrefs = {theme:'light',room:'light',scale:100,reduce:false,coach:'robot',tone:'warm'};
const store = {prefs:{...defaultPrefs},runs:[],draft:null,heldDrafts:[]};
const savedRuns=new Map();
let storageOK=true,savedMeta='',storageConflict='';
function loadRecord(raw) {
  const record=JSON.parse(raw);
  if (!record?.id || !SCENARIOS[record.config?.scenario] || !Array.isArray(record.history)) return null;
  return {...record,config:{...record.config,rules:record.rules||'1.0'}};
}
try {
  const existing=localStorage.getItem(metaKey);
  const old=!existing?JSON.parse(localStorage.getItem('heat-check-ai-1')||'null'):null;
  const meta=existing?JSON.parse(existing):old;
  if(meta){store.prefs={...defaultPrefs,...meta.prefs};store.draft=meta.draft||null;store.heldDrafts=meta.heldDrafts||[];}
  savedMeta=existing||'';
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!key?.startsWith(runKey))continue;
    try{
      const raw=localStorage.getItem(key), record=loadRecord(raw);
      if(record){store.runs.push(record);savedRuns.set(record.id,JSON.stringify(record));}
    }catch{storageConflict='읽을 수 없는 기록이 있어 보관 중입니다. 나머지 기록을 사용할 수 있습니다.';}
  }
  if(old?.runs) for(const item of old.runs){const record=loadRecord(JSON.stringify(item));if(record&&!store.runs.some(r=>r.id===record.id))store.runs.push(record);}
  persist();
}catch{storageOK=false;}
const recordBy = id => store.runs.find(r=>r.id===id);
const resumable = () => [...store.runs].sort((a,b)=>b.created-a.created).find(r=>isOpen(r)&&r.rules===RULES);
let view='home', runId=null, branchId=null, point=0, alternative='', improvement=null, review=null, errors={}, proceedLock=0, compareBasis='decision';
const trainingPanes=[['status','상황','info'],['response','대응','clipboard'],['history','타임라인','history']];
let trainingPane='response';
const isTrainingView=page=>page==='training'||page==='fork-training';
const run = () => recordBy(runId);
const branch = () => run()?.branches.find(b=>b.id===branchId);
const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
function setLive(message) {$('#live').textContent=message;}
function applyPrefs() {
  const p=store.prefs, play=isTrainingView(view);
  document.body.dataset.theme=play?p.room:p.theme;
  document.body.dataset.room=p.room;
  document.body.dataset.screen=play?'training':'app';
  document.body.dataset.trainingPane=trainingPane;
  document.body.dataset.reduce=String(p.reduce);
  document.documentElement.style.fontSize=`${p.scale}%`;
}
function persist() {
  try {
    for(const r of store.runs){
      const raw=JSON.stringify(r), last=savedRuns.get(r.id);
      if(raw===last)continue;
      const key=runKey+r.id, previous=localStorage.getItem(key), parsed=previous&&loadRecord(previous);
      if(last&&(!parsed||JSON.stringify(parsed)!==last)){
        storageConflict='같은 기록이 다른 탭에서 바뀌었습니다. 이 탭에서 한 변경은 백업 파일로 내려받을 수 있습니다.';
        continue;
      }
      localStorage.setItem(key,raw);savedRuns.set(r.id,raw);
    }
    const meta=JSON.stringify({prefs:store.prefs,draft:store.draft,heldDrafts:store.heldDrafts});
    if(meta!==savedMeta){localStorage.setItem(metaKey,meta);savedMeta=meta;}
    storageOK=true;
  }
  catch {if(storageOK)setLive('브라우저 저장이 제한되어 열린 페이지에서만 기록이 유지됩니다.');storageOK=false;}
}
function navigate(target) {
  if (view==='training' && target!=='training' && isOpen(run())) run().status='paused';
  if(view==='water-events'&&target!==view){waterLocationRequest++;waterLocating=false;waterPosition=null;waterPositionMessage='';}
  if(view==='water-shared'&&target!==view&&/^#water(?:-live)?=/.test(location.hash)){
    const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);
  }
  if(target!==view&&isTrainingView(target))trainingPane='response';
  view=target;
  proceedLock=0;
  persist();render(true);
  if(target==='water-events'||target==='water-shared')refreshWaterLive();
}
const logo = () => `<button type="button" class="logo" data-action="home" aria-label="HEAT CHECK AI 홈"><span class="logo-icon">${icon('shield')}</span><span>HEAT CHECK <b>AI</b><small>대구 폭염 대응 훈련실</small></span></button>`;
const navItems = {home:['home','홈'],scenarios:['layers','훈련 시나리오'],records:['history','내 훈련 기록'],guide:['book','공식 안전 가이드'],nearby:['pin','대응시설 안내'],'water-events':['drop','물 나눔 행사'],settings:['gear','환경 설정']};
const mobileItems={home:'홈',scenarios:'훈련',nearby:'쉼터','water-events':'물 나눔',records:'기록'};
const labels={home:'대시보드',scenarios:'훈련 시나리오',records:'내 훈련 기록',guide:'공식 안전 가이드',nearby:'대응시설 안내','water-events':'물 나눔 행사','water-form':'행사 안내 만들기','water-shared':'공유된 물 나눔 행사',settings:'환경 설정',coach:'안전 코치 선택',facility:'시설 환경 입력',plan:'대응 계획 입력',setup:'훈련 설정',training:'가상 재난 훈련실',results:'훈련 결과 분석',whatif:'WHAT IF? 분석','fork-training':'WHAT IF? 대체 경로','fork-result':'WHAT IF? 비교',improve:'대응 계획 개선',compare:'BEFORE & AFTER',review:'1분 복습'};
const activeNav = () => navItems[view]?view:view.startsWith('water-')?'water-events':['coach','facility','plan','setup','training','whatif','fork-training'].includes(view)?'scenarios':'records';
function navButton(id,mobile=false) {
  const [mark,name]=navItems[id], active=activeNav()===id||(mobile&&id==='nearby'&&view==='guide');
  return `<button type="button" data-action="${id}" class="${mobile?'':'nav-btn '}${active?'active':''}" ${active?'aria-current="page"':''}>${icon(mark)}${mobile?mobileItems[id]:name}</button>`;
}
function mobileTrainingButtons(){
  return trainingPanes.map(([pane,name,mark])=>{
    const active=pane===trainingPane;
    return `<button type="button" data-action="training-pane" data-value="${pane}" aria-pressed="${active}" aria-controls="training-${pane}" ${active?'class="active"':''}>${icon(mark)}${name}</button>`;
  }).join('')+`<button type="button" data-action="training-menu" aria-haspopup="dialog">${icon('menu')}메뉴</button>`;
}
function renderChrome() {
  const lowLight=document.body.dataset.theme==='dark';
  $('#sidebar').innerHTML=`${logo()}<nav class="nav-group" aria-label="훈련 메뉴"><div class="nav-label">훈련</div>${['home','scenarios','records'].map(id=>navButton(id)).join('')}</nav><nav class="nav-group" aria-label="도움말 메뉴"><div class="nav-label">안전 정보</div>${['guide','nearby','water-events','settings'].map(id=>navButton(id)).join('')}</nav><div class="side-note"><b>${icon('check')}오프라인 훈련 지원</b>대구광역시 복지관 · 교육용</div>`;
  $('#topbar').innerHTML=`${logo()}<div class="breadcrumb">${icon(activeNav()==='home'?'home':navItems[activeNav()][0])}${labels[view]||labels.home}</div><div class="top-actions">${button('긴급 안내','emergency',{mark:'alert',kind:'emergency'})}${smallButton(lowLight?'밝은 화면으로 전환':'저조도 화면으로 전환','toggle-theme',lowLight?'sun':'moon')}${smallButton('환경 설정','settings','gear')}</div>`;
  $('#mobile-nav').innerHTML=`<div class="mobile-site-controls">${Object.keys(mobileItems).map(id=>navButton(id,true)).join('')}</div>${isTrainingView(view)?`<div class="mobile-training-controls">${mobileTrainingButtons()}</div>`:''}`;
  $('#footer').innerHTML=`<b>HEAT CHECK AI</b><span>SDG 3 건강과 웰빙 · 11 지속가능한 도시 · 13 기후변화 대응</span>`;
}
function render(reset=false, focus=null) {
  const previous=reset?0:window.scrollY;
  applyPrefs();renderChrome();
  const body=(pages[view]||homePage)();
  const warning=!storageOK?'브라우저 저장을 사용할 수 없습니다. 새로고침 전에 기록을 백업하세요.':storageConflict;
  $('#main').innerHTML=`${warning?`<div class="stack" style="margin-bottom:12px">${notice(`${warning} ${button('기록 백업','backup',{kind:'secondary'})}`,'warn')}</div>`:''}${body}`;
  if (reset) {window.scrollTo(0,0);$('#main').focus({preventScroll:true});}
  else if (focus) $(focus)?.focus({preventScroll:true});
  else if(window.scrollY!==previous) window.scrollTo(0,previous);
}
const pageHeading = (label,title,copy='') => `<header class="page-heading compact">${label?`<div class="eyebrow">${label}</div>`:''}<h1>${title}</h1>${copy?`<p>${copy}</p>`:''}</header>`;
const tile = (mark,color='') => `<span class="tile ${color}">${icon(mark)}</span>`;
function coachArt(which) {
  const shapes = {
    robot:'<path d="M42 21V12m-6 0h12"/><rect x="18" y="24" width="48" height="41" rx="15" fill="#a9cafd"/><rect x="25" y="33" width="34" height="22" rx="8" fill="#f4f8ff"/><path d="M18 40h-5v10h5m48-10h5v10h-5"/>',
    fire:'<circle cx="42" cy="45" r="22" fill="#ffd6b0"/><path d="M17 36h50l-5-4a20 20 0 0 0-40 0z" fill="#ff996f"/><path d="M37 24h10v9H37z" fill="#ffe9c3"/>',
    drop:'<path d="M42 13c-6 14-24 29-24 42a24 24 0 0 0 48 0C66 42 48 27 42 13z" fill="#aee8f4"/><path d="M33 31c-3 4-7 9-8 15" stroke="#f4fcff"/>',
    sun:'<path d="M42 6v9m0 54v9M6 42h9m54 0h9M16 16l7 7m38 38 7 7m-52 0 7-7m38-38 7-7" stroke="#bb6741"/><circle cx="42" cy="42" r="22" fill="#ffbc76"/>'
  };
  const y=which==='drop'?55:which==='robot'?44:which==='fire'?48:43;
  return `<svg class="art" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="40" fill="#eaf1fc"/><g fill="none" stroke="#233852" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${shapes[which]||shapes.robot}<path d="M35 ${y}v1m14-1v1m-11 5q4 4 8 0"/></g></svg>`;
}
function scenarioGrid() {
  return `<div class="scenario-grid">${Object.entries(SCENARIOS).map(([id,s])=>`<button type="button" class="scenario-card" data-action="choose-scenario" data-value="${id}">${tile(s.icon,s.color)}<span><strong>${s.name}</strong><small class="blurb">${s.blurb}</small></span></button>`).join('')}</div>`;
}
function homePage() {
  const paused=resumable();
  return `<section class="hero"><div class="hero-copy"><div class="eyebrow">${icon('pin')} 대구 복지관 · 폭염 대응 훈련</div><h1>폭염 대응,<br><span>직접 검증하세요.</span></h1><p>가상의 폭염 상황에서 대응을 선택하고, 그 선택이 이용자 보호에 어떤 차이를 만드는지 확인하세요.</p><div class="actions">${button('빠른 체험 시작','quick',{mark:'play',kind:'primary'})}${button('맞춤형 훈련 시작','custom',{mark:'clipboard',kind:'ghost'})}</div><div class="hero-note">${icon('check')} 빠른 체험 · 냉방시설 고장 · 기본 판단 3회</div></div></section>
  ${paused||store.draft?`<section class="section"><div class="card record"><div><h2>이전 훈련 이어하기</h2><p class="muted">${paused?`${SCENARIOS[paused.config.scenario].name} · 가상 ${paused.state.minute}분 경과`:'작성 중인 시설 및 훈련 설정이 있습니다.'}</p></div><div class="actions">${paused?button('훈련 이어하기','resume',{value:paused.id,kind:'secondary'}):''}${store.draft?button('입력 이어하기','resume-draft'):''}</div></div></section>`:''}
  <section class="section" aria-labelledby="scenario-title"><header class="section-heading"><h2 id="scenario-title">훈련 시나리오</h2></header>${scenarioGrid()}</section>
  <section class="section" aria-labelledby="flow-title"><header class="section-heading"><div><h2 id="flow-title">훈련 흐름</h2></div></header><div class="flow"><div>${icon('clipboard')}시설·계획 설정</div><div>${icon('play')}상황별 대응 선택</div><div>${icon('chart')}결과와 대체 행동 비교</div><div>${icon('repeat')}계획 개선·재훈련</div></div></section>`;
}
function scenariosPage() {
  return `${pageHeading('훈련 선택','훈련 시나리오','가상 복지관에서 실습할 상황을 선택하세요.')}<div class="stack">${scenarioGrid()}<div class="actions">${button('내 시설로 맞춤형 훈련','custom',{kind:'primary',mark:'clipboard'})}</div><details><summary>향후 확장 시나리오</summary><div class="muted">${FUTURE.join(' · ')}</div></details></div>`;
}
const steps = ['facility','plan','setup'];
function stepper() {
  return `<ol class="stepper" aria-label="훈련 준비 단계">${steps.map((s,i)=>`<li ${s===view||(view==='coach'&&s==='setup')?'aria-current="step"':''}>${i+1}. ${['시설','계획','설정'][i]}</li>`).join('')}</ol>`;
}
function newDraft(quick,scenario='cooling') {
  return {id:newId(),quick,stage:quick?'setup':'facility',facility:COPY(quick?DEMO:EMPTY),plan:COPY(quick?EXAMPLE_PLAN:NEW_PLAN),config:{scenario,mode:'verify',depth:'core',rules:RULES},coach:store.prefs.coach,tone:store.prefs.tone};
}
function holdDraft(){if(store.draft){store.draft.id||=newId();store.heldDrafts.push(store.draft);}}
function draftTo(stage) {store.draft.stage=stage;errors={};navigate(stage);}
function radios(name,options,value) {
  return `<div class="radio-row">${Object.entries(options).map(([id,label])=>`<label><input type="radio" name="${name}" value="${id}" ${id===value?'checked':''}>${label}</label>`).join('')}</div>`;
}
function coachForm(coach,tone) {
  return `<fieldset class="card"><legend>캐릭터</legend><div class="coach-grid">${Object.entries(COACHES).map(([id,label])=>`<label class="coach-choice"><input type="radio" name="coach" value="${id}" ${id===coach?'checked':''}>${coachArt(id)}<span>${label}</span></label>`).join('')}</div></fieldset><fieldset class="card"><legend>설명 스타일</legend>${radios('tone',TONES,tone)}</fieldset>`;
}
function coachPage() {
  const d=store.draft;
  return `${pageHeading('훈련 설정','안전 코치 선택','캐릭터와 설명 스타일은 표현에만 적용됩니다.')}<div class="form-shell stack">${stepper()}${coachForm(d.coach,d.tone)}<div class="actions">${button('훈련 조건으로 돌아가기','to-setup',{kind:'primary'})}${button('기본 코치 사용','skip-coach')}</div></div>`;
}
const labelMap={type:'시설 유형',people:'이용자 수',staff:'현장 대응 가능 인력',cooling:'냉방시설 상태',room:'대체 냉방공간',contacts:'비상 연락체계',hasPlan:'기존 폭염 대응 계획',elderly:'고령 이용자 수',mobility:'이동 지원 필요 인원',capacity:'대체 공간 수용 인원',extra:'추가 지원 인력',lift:'승강기',route:'안전한 대체 이동 경로',power:'비상전원',backupCooling:'비상전원 냉방 지원',water:'식수 확보 상태',comms:'대체 통신수단',equipment:'이동 보조 장비',hours:'운영 시간',night:'야간 운영',notes:'시설 특이사항'};
const required = key => ['type','people','staff','cooling','room','contacts','hasPlan'].includes(key)||(key==='capacity'&&store.draft.facility.room==='yes');
function optionList(values,active,empty=false) {
  return `${empty?`<option value="">선택하세요</option>`:''}${Object.entries(values).map(([value,label])=>`<option value="${value}" ${value===active?'selected':''}>${escapeHTML(label)}</option>`).join('')}`;
}
function field(key,options=null,hint='') {
  const data=store.draft.facility[key]??EMPTY[key], err=errors[key], req=required(key);
  const attr=`name="${key}" id="field-${key}" ${req?'required':''} ${err?`aria-invalid="true" aria-describedby="err-${key}"`:(hint?`aria-describedby="hint-${key}"`:'')}`;
  let control;
  if(options) control=`<select ${attr}>${optionList(options,data,req)}</select>`;
  else if(key==='notes') control=`<textarea ${attr} maxlength="500" placeholder="개인정보를 제외하고 입력하세요.">${escapeHTML(data)}</textarea>`;
  else if(key==='hours') control=`<input ${attr} maxlength="40" value="${escapeHTML(data)}" placeholder="예: 09:00~18:00">`;
  else control=`<input ${attr} type="number" inputmode="numeric" step="1" min="${['people','capacity'].includes(key)?1:0}" max="${['staff','extra'].includes(key)?1000:10000}" value="${escapeHTML(data)}" ${key==='capacity'&&!req?'disabled':''}>`;
  return `<label class="field" for="field-${key}"><span>${labelMap[key]} ${req?'<span class="required">필수</span>':'<small>선택</small>'}</span>${control}${hint?`<small id="hint-${key}">${hint}</small>`:''}${err?`<small id="err-${key}" style="color:var(--danger)">${escapeHTML(err)}</small>`:''}</label>`;
}
function facilityPage() {
  const yn={unknown:'미확인',yes:'있음',no:'없음'};
  return `${pageHeading('시설 설정','시설 환경 입력','필수 조건부터 입력하세요. 모르는 조건은 확인이 필요한 상태로 남습니다.')}<form class="form-shell stack" id="facility-form" novalidate>${stepper()}
    ${Object.keys(errors).length?notice('표시된 입력 항목을 확인한 뒤 다시 진행하세요.','red','alert'):''}
    <section class="card stack"><h2>기본 정보</h2><div class="form-grid">${field('type',{welfare:'복지관'},'전통시장과 소규모 사업장은 확장 예정입니다.')}${field('people')}${field('staff')}${field('cooling',COOL)}${field('room',OPTIONS)}${field('capacity',null,'대체 냉방공간이 확보된 경우 필수입니다.')}${field('contacts',{yes:'구축됨',no:'미구축',unknown:'미확인'})}${field('hasPlan',{yes:'있음',no:'없음',unknown:'미확인'})}</div></section>
    <details><summary>보호 대상과 동행 지원</summary><div class="form-grid">${field('elderly',null,'이동 지원 인원과 중복 입력할 수 있습니다.')}${field('mobility',null,'비워두면 확인 단계에서 시나리오 가상 인원을 구분해 표시합니다.')}${field('extra')}${field('lift',yn)}${field('route',{unknown:'미확인',yes:'확보됨',no:'확보되지 않음'})}</div></details>
    <details><summary>운영 시간·비상전원·장비</summary><div class="form-grid">${field('hours')}${field('night',yn)}${field('power',yn)}${field('backupCooling',{unknown:'미확인',yes:'냉방 지원 가능',no:'냉방 지원 불가'},'비상전원으로 냉방 설비를 가동할 수 있는지 시설 담당자에게 확인하세요.')}${field('water',{unknown:'미확인',yes:'확보됨',no:'미확보'})}${field('comms',yn)}${field('equipment',yn)}${field('notes')}</div></details>
    <div class="actions"><button class="btn primary" type="submit">다음 · 대응 계획</button>${button('이전','back-facility')}</div></form>`;
}
const PLAN_NAMES={structured:'구조화된 입력',free:'자유 텍스트',none:'기존 계획 없음'};
function planEditor(p) {
  return `<div class="stack">${radios('kind',PLAN_NAMES,p.kind)}${p.kind==='structured'?`<div class="form-grid">${AREAS.map(([id,label])=>`<label class="field">${label}<textarea name="area-${id}" maxlength="700" placeholder="담당자, 시점, 실행 방법을 적어보세요.">${escapeHTML(p.items[id]||'')}</textarea></label>`).join('')}</div>`:p.kind==='free'?`<label class="field">대응 계획 원문<textarea name="text" maxlength="8000" rows="8" placeholder="개인정보를 제외한 대응 계획을 입력하세요.">${escapeHTML(p.text)}</textarea><small>키워드가 포함된 문장을 찾습니다. 문맥이나 의도를 판단하려면 원문을 직접 확인하세요.</small></label>`:notice('계획 입력 없이 훈련할 수 있습니다. 결과를 본 뒤 계획을 추가할 수 있어요.')}</div>`;
}
function planFindings(p,f,scenario,editable=false,open=false) {
  return `<details ${open?'open':''}><summary>절차별 계획 점검 보기</summary><div class="stack"><p class="muted small">자유 텍스트의 관련 문장을 살펴보고 실제 계획에 포함된 항목을 확인하세요.</p>${inspectPlan(p,f,scenario).map(row=>`<div><b>${row.label}</b> ${pill(row.level,row.planned?'green':'')} ${row.evidence?`<p class="muted small">“${escapeHTML(row.evidence)}”</p>`:''}${editable&&p.kind==='free'?`<label class="check-row small"><input type="checkbox" name="confirm-${row.id}" ${row.planned?'checked':''}>${row.label} 반영 확인</label>`:''}</div>`).join('')}</div></details>`;
}
function planPage() {
  const d=store.draft;
  return `${pageHeading('계획 입력','폭염 대응 계획','작성한 계획은 훈련 후 실제 행동 기록과 비교합니다.')}<div class="form-shell stack">${stepper()}<div class="card" id="plan-editor">${planEditor(d.plan)}</div><div id="plan-findings">${planFindings(d.plan,d.facility,d.config.scenario,true)}</div><div class="actions">${button('다음 · 훈련 설정','to-setup',{kind:'primary'})}${button('이전','to-facility')}</div></div>`;
}
function facilitySummary(f,s=null) {
  return `<div class="metrics">${metric('시설',typeName(f))}${metric('이용자',`${f.people}명`)}${metric('현장 인력',`${f.staff}명`)}${metric('냉방시설',s?.cooling==='off'?'정전으로 중지':COOL[s?.cooling||f.cooling]||'미확인')}${metric('대체 공간',f.room==='yes'?`${s?.capacity ?? f.capacity}명 수용`:OPTIONS[f.room])}${metric('이동 지원',f.mobility==null?'미확인':`${f.mobility}명`)}</div>`;
}
function setupPage() {
  const d=store.draft,s=SCENARIOS[d.config.scenario],f=normalizeFacility(d.facility);
  const initial=Object.keys(facilityErrors(f)).length?null:initialState(f,d.config);
  return `${pageHeading(d.quick?'빠른 체험':'훈련 설정',d.quick?'가상 복지관에서 훈련하기':'훈련 조건 확인','시나리오와 초기 조건을 확인한 뒤 훈련을 시작하세요.')}<div class="form-shell stack">${d.quick?notice('아래 시설과 사건은 대구 복지관을 가정한 교육용 예시입니다.'):stepper()}
    <div class="card stack">${tile(s.icon,s.color)}<h2>${s.name}</h2><p>${s.brief}</p><label class="field">시나리오<select name="scenario">${optionList(Object.fromEntries(Object.entries(SCENARIOS).map(([id,x])=>[id,x.name])),d.config.scenario)}</select></label></div>
    <fieldset class="card"><legend>훈련 모드</legend>${radios('mode',MODE,d.config.mode)}<p class="muted small" style="margin-top:8px">검증 모드는 같은 조건에서 재훈련할 수 있습니다. 도전 모드에서는 통신 장애, 지원 지연 등 추가 조건이 활성화됩니다. 두 모드 모두 같은 입력과 행동으로 결과를 재현할 수 있습니다.</p></fieldset>
    <fieldset class="card"><legend>훈련 깊이</legend>${radios('depth',Object.fromEntries(Object.entries(DEPTH).map(([id,x])=>[id,`${x.label} · ${x.limit}회`])),d.config.depth)}</fieldset>
    ${initial?`<div class="card stack"><h2>시작 조건</h2>${facilitySummary(f,initial)}<p class="muted small">전력 ${POWER[initial.power]} · 통신 ${COMMS[initial.comms]} · 이동 경로 ${ROUTES[initial.route]} · ${PLAN_NAMES[d.plan.kind]}</p></div>`:''}
    <div class="actions">${button('가상 훈련 시작','start',{kind:'primary',mark:'play'})}${button(d.quick?'예시 시설 수정':'이전 · 계획','edit-setup',{mark:'edit'})}${button('코치 변경','edit-quick-coach')}${button('시나리오 링크','share-scenario',{value:d.config.scenario})}</div></div>`;
}
function createRun(f,config,plan,coach,tone,quick,parent=null) {
  const initial=parent?COPY(parent.initial):initialState(f,config);
  const original=recordBy(parent?.parentId)||parent;
  const record={id:newId(),created:Date.now(),rules:RULES,facility:COPY(f),config:{...config,rules:RULES},plan:COPY(plan),coach,tone,quick,parentId:original?.id||null,initial,state:COPY(initial),history:[],branches:[],improvedPlan:null,status:'active'};
  store.runs.push(record);runId=record.id;
  return record;
}
function coachLine(r,s) {
  const space=s.capacity===null?'대체 냉방공간 미확인':`냉방공간 잔여 ${Math.max(0,s.capacity-s.moved)}자리`;
  const support=s.mobility===null?'이동 지원 인원 미확인':`이동 지원 필요 ${supportRemaining(s)}명${s.mobilityEstimated?'(가정)':''}`;
  const speak={warm:`${space}예요. ${support}도 함께 확인해보세요.`,short:`${space} · ${support}`,detail:`${space} · ${support} · 통신 ${COMMS[s.comms]} · 현재 대응 인력 ${s.staff}명입니다.`};
  return `<div class="coach-line">${coachArt(r.coach)}<div><b>${COACHES[r.coach]||COACHES.robot}</b> · ${speak[r.tone]||speak.warm}</div></div>`;
}
function clockAt(base,minutes) {
  const [h,m]=base.split(':').map(Number),total=(h*60+m+minutes)%1440;
  return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}
function stateMetrics(s,compact=false) {
  const main=[['냉방',s.cooling==='off'?'가동 중지':COOL[s.cooling]],['대응 인력',`${s.staff}명`],['임시 보호',`${s.temporary}명`],['냉방공간 이동',`${s.moved} / ${s.people}명`],['이동 지원',s.mobility===null?'미확인':`${s.assisted} / ${s.mobility}명 ${s.mobilityEstimated?'(가정)':''}`],['대체 냉방공간',s.room==='yes'?`${s.moved} / ${s.capacity}명 사용`:OPTIONS[s.room]],['이동 경로',ROUTES[s.route]],['가상 119',dispatchLabel(s)]];
  const extra=[['전력',POWER[s.power]],['통신',COMMS[s.comms]],['비상 연락',CONTACT[s.contactStatus]],['추가 인력',`${SUPPORT[s.supportStatus]}${s.supportSource?' · '+s.supportSource:''}`],['외부 냉방공간',`${s.externalCapacity||0}자리`],['식수',OPTIONS[s.water]],['승강기',enumLabel(s.lift)],['이동 보조 장비',enumLabel(s.equipment)],['설비 복구',{none:'미요청',requested:'요청 접수',restored:'복구 확인'}[s.repairStatus]]];
  return `<div class="metrics">${(compact?main:[...main,...extra]).map(([label,value])=>metric(label,value)).join('')}</div>`;
}
function dispatchLabel(s){return `${DISPATCH[s.dispatch]}${s.followed?' · 환자 관찰 진행':''}`;}
function stateDiff(before,after) {
  const fields=[['열 노출 저감 인원',protectedCount],['냉방공간 이동 인원',s=>s.moved],['현장 대응 인력',s=>s.staff],['수용 인원',s=>s.capacity],['냉방',s=>s.cooling==='off'?'가동 중지':COOL[s.cooling]],['전력',s=>POWER[s.power]],['통신',s=>COMMS[s.comms]],['이동 경로',s=>ROUTES[s.route]],['가상 119',dispatchLabel],['냉각',s=>s.cooled?'실시':'미실시'],['식수',s=>OPTIONS[s.water]],['이동 지원 확인',s=>s.mobility],['이동 지원 완료',s=>s.assisted]];
  return fields.map(([label,get])=>[label,get(before),get(after)]).filter(([,a,b])=>a!==b).map(([label,a,b])=>`${label} ${a??'미확인'} → ${b??'미확인'}`);
}
function timeline(history) {
  if (!history.length) return '<p class="muted small">아직 선택한 행동이 없습니다.</p>';
  return `<ol class="timeline">${history.map(row=>`<li><small class="muted">가상 +${row.at}분 · ${row.elapsed}분 소요</small><div><b>${actions[row.id].label}</b> ${pill(row.ok?'실행·요청 기록됨':'실행 불가',row.ok?'':'orange')}</div><p>${escapeHTML(row.message)}</p>${row.events.length?`<p>발생 · ${row.events.map(id=>EVENTS[id].name).join(' · ')}</p>`:''}</li>`).join('')}</ol>`;
}
function actionChoices(s,c,mode='act') {
  const hints={move:s.room!=='yes'?'수용 인원 확인 필요':s.capacity<=s.moved?'빈 자리 없음':s.route!=='safe'?'안전한 이동 경로 확인 필요':s.mobility===null?'이동 지원 인원 확인 필요':s.staff===0?'동행 인력 확보 필요':'',roles:s.staff<2?'현장 인력 2명 필요':'',external:s.comms!=='on'?'통신수단 확인 필요':'',restore:!hasCoolingPower(s)?'냉방 전원 확인 필요':s.repairAt===null?'설비 점검 요청 필요':'',support:s.comms!=='on'?'통신수단 확인 필요':''};
  return `<div class="choice-list">${available(s,c).map(id=>`<button type="button" class="choice" data-action="${mode}" data-value="${id}">${icon('clipboard')}<span>${actions[id].label}${hints[id]?`<small class="action-hint">${hints[id]} · 시도 시 +1분</small>`:''}</span><small>약 ${actions[id].minutes}분</small></button>`).join('')}</div>`;
}
function withPrefix(r,b){return b?[...r.history.slice(0,b.point),...b.history]:r.history;}
function decisionLimit(config,history){
  const base=DEPTH[config.depth].limit;
  const last=history[base-1];
  return base+Number(!!last?.events.some(id=>!last.after.resolved.includes(id)));
}
function trainingPage() {
  const r=run(), b=view==='fork-training'?branch():null, s=b?b.state:r.state, logs=b?b.history:r.history;
  const sc=SCENARIOS[r.config.scenario], decision=(b?b.point:0)+logs.length, last=logs.at(-1);
  const limit=decisionLimit(r.config,withPrefix(r,b));
  const round=decision>=DEPTH[r.config.depth].limit?'마지막 돌발상황 · 추가 판단 1회':`판단 ${Math.min(decision+1,limit)} / ${limit}`;
  const facts=[`전력 ${POWER[s.power]}`,`통신 ${COMMS[s.comms]}`,`이동 경로 ${ROUTES[s.route]}`];
  if (s.patient==='severe') facts.push(s.cardiac==='breathing'?'의식 저하 · 호흡 확인':'의식 저하 · 호흡 미확인');
  const openEvents=s.events.filter(id=>!s.resolved.includes(id));
  const incident=`<section class="incident" id="training-status" aria-labelledby="training-scenario"><header><div class="eyebrow">${b?'대체 경로 · 교육용':'교육용 가상 상황'}</div>${pill(`가상 ${clockAt(sc.clock,s.minute)} · +${s.minute}분`,'orange')}</header><h2 id="training-scenario">${sc.name}</h2><p>${!last?sc.brief:escapeHTML(last.message)}</p><div class="readings">${facts.map(x=>pill(x)).join('')}</div><div class="headline-stats">${metric('이용자',`${s.people}명`)}${metric('대응 인력',`${s.staff}명`)}${metric('열 노출 저감',`${protectedCount(s)} / ${s.people}명`)}</div></section>`;
  const opts=`<section id="training-response" class="card" aria-labelledby="training-actions-heading"><h2 id="training-actions-heading">어떻게 대응할까요?</h2><p class="small muted"><span class="training-desktop-round">${round} · </span>행동을 선택하면 가상 시간이 흐릅니다.</p>${actionChoices(s,r.config,b?'fork-act':'act')}</section>`;
  return `${pageHeading(b?'WHAT IF? · 직접 이어서 판단':'대구 복지관 · 가상 훈련',b?'대체 경로 훈련':'가상 재난 훈련실',`${MODE[r.config.mode]} · ${DEPTH[r.config.depth].label}${r.parentId?' · 재훈련':''}`)}
    <div class="training-mobile-progress"><b>${round}</b><progress aria-label="완료한 판단 수" value="${decision}" max="${limit}"></progress></div>
    <div class="training-layout"><div class="stack training-main">${incident}${last?`<div id="last-update" tabindex="-1">${notice(`<b>${actions[last.id].label} · ${last.ok?'실행/요청':'실행 불가'}</b><br>+${last.elapsed}분${stateDiff(last.before,last.after).length?` · ${escapeHTML(stateDiff(last.before,last.after).join(' · '))}`:''}`,last.ok?'':'warn',last.ok?'check':'info')}</div>`:''}
    ${openEvents.length?notice(`<b>현장 추가 보고</b><br>${openEvents.map(id=>EVENTS[id].name).join(' · ')}`,'warn','alert'):''}${opts}<div class="stack training-followup">${coachLine(r,s)}<div class="actions">${b?button('현재 시점 비교','finish-fork',{kind:'secondary'}):`${button('일시 중단','pause')}${button('훈련 종료','end-run',{kind:'secondary'})}`}</div></div></div>
    <aside class="stack training-side"><section class="card stack training-facilities"><h2>시설과 이용자 상태</h2>${stateMetrics(s,true)}<details><summary>대응 자원 상세</summary><div>${stateMetrics(s)}</div></details></section>
    <section id="training-history" class="card"><details${trainingPane==='history'?' open':''}><summary>가상 대응 타임라인 (${logs.length}건)</summary><div>${timeline(logs)}</div></details><details><summary>초기 시설·대응 계획</summary><div class="stack">${facilitySummary(r.facility,r.initial)}<p class="muted small">고령 ${r.facility.elderly??'미확인'}${r.facility.elderly===null?'':'명'} · 계획 ${PLAN_NAMES[r.plan.kind]}${r.facility.hours?` · 운영 ${escapeHTML(r.facility.hours)}`:''}${r.facility.night!=='unknown'?` · 야간 ${enumLabel(r.facility.night)}`:''}</p>${r.facility.notes?`<p>${escapeHTML(r.facility.notes)}</p>`:''}${planFindings(r.plan,r.facility,r.config.scenario)}</div></details></section></aside></div>`;
}
function planComparison(r,report) {
  const groups=[['계획에 있고 수행함',true,true],['계획에 있고 미수행',true,false],['계획에 없고 수행함',false,true],['계획과 행동에서 모두 미확인',false,false]];
  const rows=inspectPlan(r.plan,r.facility,r.config.scenario);
  return `<section class="card stack"><h2>계획과 실제 행동</h2><p class="muted small">계획 이행 여부는 아래에 표시합니다. 교육용 대응 점수는 실제 조치와 가상 상태로 계산합니다.</p><div class="grid two">${groups.map(([label,planned,done])=>`<div class="metric"><b>${label}</b><small>${rows.filter(row=>row.planned===planned&&report.performed.has(row.id)===done).map(row=>row.label).join(' · ')||'해당 없음'}</small></div>`).join('')}</div>${planFindings(r.plan,r.facility,r.config.scenario)}</section>`;
}
function actionReport(r) {
  if (!r.history.length) return '<p class="muted">평가할 행동 기록이 없습니다.</p>';
  return r.history.map((row,i)=>{
    const [category,reason,source,color]=evaluateAction(row,r.config), changes=stateDiff(row.before,row.after);
    return `<details><summary>${i+1}. ${actions[row.id].label} ${pill(category,color)}</summary><div class="stack"><p><b>판단 이유</b> ${escapeHTML(reason)}</p><p class="muted">가상 +${row.at}분 · ${row.elapsed}분 소요 · ${escapeHTML(row.message)}</p>${changes.length?`<p>${escapeHTML(changes.join(' · '))}</p>`:''}${row.events.length?`<p>후속 사건 · ${row.events.map(id=>EVENTS[id].name).join(' · ')}</p>`:''}<p class="small">${sourceLink(source)||'공통 훈련 규칙 및 해당 시설의 가상 조건으로 판단했습니다.'}</p></div></details>`;
  }).join('');
}
function safetySummary() {
  return notice(`<b>실제 긴급 상황이라면 119에 신고하세요.</b><br>의식 저하 등 중증이 의심되면 즉시 119에 신고하고 상황요원의 지시를 따르세요. 안전한 범위에서 열 노출을 줄이고 몸을 식히세요. 의식 저하가 있거나 잘 삼키지 못하는 사람에게 음료를 주지 마세요.`,'red','alert');
}
function nextResponse(r,report) {
  if(report.critical.length)return '중대한 조치 기록을 검토하고 다음 훈련에서 첫 대응 순서를 점검하세요.';
  if(protectedCount(r.state)<r.state.people)return '남은 이용자의 냉방공간, 이동 경로와 담당자를 확인하세요.';
  if(report.pending.length)return `${EVENTS[report.pending[0]].name}에 필요한 후속 조치를 계획에 기록하세요.`;
  return report.missing[0]?.ideas.map(id=>actions[id].label)[0]||'실제로 수행한 대응을 기록하고 시설 계획에 반영하세요.';
}
function resultsPage() {
  const r=run(), s=r.state, report=assessRun(s,r.facility,r.config,r.history), legacy=r.rules!==RULES;
  const aftercare=r.aftercare||{};
  return `${pageHeading('훈련 결과','대응 결과 분석',`${SCENARIOS[r.config.scenario].name} · ${STATUS[r.status]}${r.parentId?' · 재훈련':''}`)}<div class="stack">
    ${legacy?notice('이전 규칙으로 저장한 기록입니다. 시설을 복사해 개선된 규칙으로 새 기준 훈련을 시작할 수 있습니다.','warn'):''}
    <section class="card stack result-overview"><h2>남은 위험과 다음 조치</h2>
      ${report.critical.length?notice(escapeHTML(report.critical.join(' · ')),'red','alert'):''}
      <div class="metrics">${metric('추가 보호 필요',`${s.people-protectedCount(s)}명`)}${metric('열 노출 저감',`${protectedCount(s)} / ${s.people}명`)}${metric('임시 보호',`${s.temporary}명`)}${metric('냉방공간 이동',`${s.moved}명`)}${metric('냉방 복구',s.repairStatus==='requested'?'수리 요청 · 복구 대기':s.cooling==='normal'?'가동 중':'복구 미확인')}${metric('기본 대응 과제',`${report.achieved} / ${report.goals.length} 완료`)}</div>
      ${s.patient==='severe'?`<p><b>가상 환자 조치</b> · 신고 ${s.callAt===null?'미실시':`+${s.callAt}분`} · 냉각 ${s.cooled?'실시':'미실시'} · ${dispatchLabel(s)}</p>`:''}
      <p><b>다음 조치</b> · ${nextResponse(r,report)}</p>
      <p class="small muted">가상 ${s.minute}분 경과 · ${s.events.length}건 발생 · ${report.pending.length}건 후속 대응 필요${report.pending.length?` · ${report.pending.map(id=>EVENTS[id].name).join(' · ')}`:''}</p>${legacy?`<p class="small muted">이전 규칙의 교육용 기록 · ${report.score}점</p>`:''}
    </section>
    <div class="actions">${r.history.length&&!legacy?button('WHAT IF? 대체 행동 분석','whatif',{kind:'secondary',mark:'route'}):''}${legacy?button('시설을 복사해 새 기준으로 훈련','reuse',{value:r.id,kind:'primary'}):button('계획 개선 및 재훈련','improve',{kind:'primary',mark:'repeat'})}${r.parentId&&recordBy(r.parentId)?button('BEFORE & AFTER','compare',{mark:'chart'}):''}${button('1쪽 결과 보고서','report',{mark:'clipboard'})}${button('시나리오 링크','share-scenario',{value:r.config.scenario})}</div>
    ${legacy&&r.branches.length?`<section class="card stack"><h2>이전 WHAT IF? 기록</h2>${r.branches.map(b=>button(`${b.point+1}번째 판단의 비교 결과`,'open-fork',{value:b.id})).join('')}</section>`:''}
    <section class="card stack"><h2>이번 훈련 핵심 정리</h2><div class="grid two">${report.learning.map(g=>`<div class="metric">${pill(g.met?'수행됨':'다음 판단에 반영',g.met?'green':'orange')}<h3 style="margin-top:7px">${g.label}</h3><p class="small">${g.reason}</p>${sourceLink(g.source)?`<small>${sourceLink(g.source)}</small>`:''}</div>`).join('')}</div><div class="actions">${button('1분 복습','review',{mark:'book'})}</div></section>
    <section class="card stack"><h2>상세 분석</h2><details><summary>안전 과제 및 최종 상태</summary><div class="stack"><ul class="plain-list">${report.goals.map(g=>`<li>${pill(g.met?'충족':'미충족',g.met?'green':'orange')} ${g.label}</li>`).join('')}</ul>${stateMetrics(r.state)}</div></details><details><summary>행동별 평가와 판단 이유 (${r.history.length}건)</summary><div>${actionReport(r)}</div></details><details><summary>전체 대응 타임라인</summary><div>${timeline(r.history)}</div></details></section>
    <section class="card stack"><h2>시설 후속 점검</h2><div class="form-grid"><label class="field">담당 역할<input name="after-role" maxlength="80" placeholder="예: 당직 책임자" value="${escapeHTML(aftercare.role)}"></label><label class="field">다음 점검일<input name="after-date" type="date" value="${escapeHTML(aftercare.date)}"></label></div><p class="small muted">담당 역할과 점검일을 보고서에 반영합니다.</p></section>
    ${planComparison(r,report)}<div class="actions">${button('내 훈련 기록','records',{mark:'history'})}${button('공식 폭염 가이드','guide',{mark:'book'})}</div></div>`;
}
function whatIfPage() {
  const r=run(), selected=r.history[point], base=selected.before;
  const alternatives=available(base,r.config).filter(id=>id!==selected.id);
  const valid=alternatives.includes(alternative);
  return `${pageHeading('대체 행동 분석','WHAT IF?','판단 직전으로 돌아가 다른 행동을 선택하고 같은 규칙으로 다시 계산합니다.')}<div class="form-shell stack"><div class="card stack"><label class="field">판단 시점<select name="point">${optionList(Object.fromEntries(r.history.map((row,i)=>[i,`${i+1}. +${row.at}분 · ${actions[row.id].label}`])),String(point))}</select></label><p><b>기존에 선택한 행동</b> · ${actions[selected.id].label}</p>${stateMetrics(base,true)}</div>
    <div class="card stack"><label class="field">대체 행동<select name="alternative">${optionList(Object.fromEntries(alternatives.map(id=>[id,actions[id].label])),valid?alternative:'',true)}</select></label><p class="small muted">첫 행동을 계산한 후, 필요한 경우 추가 대응도 직접 선택할 수 있습니다.</p></div>
    <div class="actions">${button('대체 경로 계산','start-fork',{kind:'primary',mark:'route'})}${button('결과로 돌아가기','back-result')}</div>${r.branches.length?`<section class="card stack"><h2>저장된 대체 경로</h2>${r.branches.map(b=>`<div class="record"><span>${b.point+1}번째 판단 · ${actions[b.history[0].id].label}</span>${button(b.closed?'비교 열기':'대체 경로 이어가기','open-fork',{value:b.id})}</div>`).join('')}</section>`:''}</div>`;
}
function compareSnapshot(title,s,config,facility,history,summary='') {
  const report=assessRun(s,facility,config,history);
  return `<details class="card compare-card"><summary>${title}</summary><div class="stack">${summary?`<p class="muted small">${summary}</p>`:''}<div class="metrics">${metric('완료한 행동 시점',`+${s.minute}분`)}${metric('기본 대응 과제',`${report.achieved} / ${report.goals.length}`)}</div>${stateMetrics(s,true)}<p class="muted small">발생 · ${s.events.map(id=>EVENTS[id].name).join(' · ')||'없음'}</p>${timeline(history)}</div></details>`;
}
function comparisonCut(initial,left,right) {
  const count=Math.min(left.length,right.length), minute=Math.min(left.at(-1)?.after.minute||0,right.at(-1)?.after.minute||0);
  const trim=rows=>compareBasis==='decision'?rows.slice(0,count):compareBasis==='time'?rows.filter(row=>row.after.minute<=minute):rows;
  const [a,b]=[trim(left),trim(right)];
  const basis=compareBasis==='decision'?`양쪽 모두 완료한 처음 ${count}회 판단을 비교합니다.`:compareBasis==='time'?`공통으로 진행한 +${minute}분까지 완료된 행동을 비교합니다.`:'두 경로 각각의 종료 상태입니다. 판단 횟수와 시간이 다를 수 있습니다.';
  return {a,b,sa:a.at(-1)?.after||initial,sb:b.at(-1)?.after||initial,basis};
}
function comparisonSummary(cut,f,config) {
  const {sa,sb,a,b,basis}=cut;
  const ra=assessRun(sa,f,config,a),rb=assessRun(sb,f,config,b),changes=stateDiff(sa,sb);
  return `<section class="card stack result-overview"><h2>달라진 결과</h2><label class="field">비교 기준<select name="compare-basis">${optionList({decision:'같은 판단 횟수',time:'같은 가상 시간',end:'각 경로 종료 시점'},compareBasis)}</select></label><p class="small muted">${basis}</p><div class="metrics">${metric('추가 보호 필요',`${sa.people-protectedCount(sa)} → ${sb.people-protectedCount(sb)}명`)}${metric('열 노출 저감',`${protectedCount(sa)} → ${protectedCount(sb)}명`)}${metric('마지막 완료 시점',`${sa.minute} → ${sb.minute}분`)}${metric('기본 대응 과제',`${ra.achieved}/${ra.goals.length} → ${rb.achieved}/${rb.goals.length}`)}</div><p class="small muted">${changes.length?escapeHTML(changes.join(' · ')):'핵심 상태가 동일합니다.'}</p></section>`;
}
function forkResultPage() {
  const r=run(), b=branch(), newer=withPrefix(r,b),cut=comparisonCut(r.initial,r.history,newer);
  const added=cut.sb.events.filter(id=>!cut.sa.events.includes(id)),removed=cut.sa.events.filter(id=>!cut.sb.events.includes(id));
  return `${pageHeading('대체 경로 비교','WHAT IF? 결과',`${b.point+1}번째 판단에서 다른 행동을 선택했습니다. 두 경로는 같은 상태에서 분기합니다.`)}<div class="stack">
    ${comparisonSummary(cut,r.facility,r.config)}
    <div class="card stack"><h2>첫 대체 행동</h2><p>${escapeHTML(r.history[b.point].message)}<br>${escapeHTML(b.history[0].message)}</p>${added.length||removed.length?`<p class="small">대체 경로 추가 사건 · ${added.map(id=>EVENTS[id].name).join(' · ')||'없음'}<br>원본에서만 발생 · ${removed.map(id=>EVENTS[id].name).join(' · ')||'없음'}</p>`:''}</div>
    <div class="compare">${compareSnapshot('기존 경로 상세',cut.sa,r.config,r.facility,cut.a)}${compareSnapshot('대체 경로 상세',cut.sb,r.config,r.facility,cut.b)}</div>
    <div class="actions">${r.rules===RULES&&newer.length<decisionLimit(r.config,newer)?button('대체 경로 계속하기','continue-fork',{kind:'primary'}):''}${r.rules===RULES?`${button('다른 판단 비교','whatif')}${button('계획 개선','improve',{mark:'edit'})}`:''}${button('훈련 결과','back-result')}</div></div>`;
}
function improvePage() {
  const r=run(), report=assessRun(r.state,r.facility,r.config,r.history);
  const suggestions=(report.missing.length?report.missing:report.learning).slice(0,3);
  return `${pageHeading('재훈련 준비','대응 계획 개선','담당자, 실행 시점, 사용할 자원을 적고 같은 초기 조건에서 다시 판단하세요.')}<div class="form-shell stack">${planComparison(r,report)}
    <section class="card stack"><h2>훈련 기록을 바탕으로 한 개선 제안</h2><ul class="plain-list">${suggestions.map(g=>`<li><b>${g.label}</b> · ${g.reason}</li>`).join('')}</ul></section>
    <section class="card stack"><h2>개선 계획 작성</h2><p class="muted small">입력할 때마다 이 기록에 개선 계획을 저장합니다.</p><div id="plan-editor">${planEditor(improvement)}</div><div id="plan-findings">${planFindings(improvement,r.facility,r.config.scenario,true)}</div></section>
    ${notice(`시설, 초기 사건, 훈련 깊이와 평가 규칙을 고정합니다. 수정한 계획과 재훈련에서 실제 수행한 조치를 결과에서 비교할 수 있습니다.`)}
    <div class="actions">${button('저장하고 같은 조건으로 재훈련','retrain',{kind:'primary',mark:'repeat'})}${button('계획만 보관','save-improve')}${button('훈련 결과','back-result')}</div></div>`;
}
function comparePage() {
  const after=run(), before=recordBy(after.parentId);
  if(!before)return `${pageHeading('재훈련 비교','비교할 최초 기록이 없습니다')}<div class="actions">${button('재훈련 상세 결과','back-result')}</div>`;
  const cut=comparisonCut(before.initial,before.history,after.history);
  const a=assessRun(before.state,before.facility,before.config,before.history),b=assessRun(after.state,after.facility,after.config,after.history);
  const same=JSON.stringify(before.history.map(row=>row.id))===JSON.stringify(after.history.map(row=>row.id));
  const improved=b.goals.filter(goal=>goal.met&&!a.goals.find(old=>old.id===goal.id)?.met);
  const seqLength=Math.max(before.history.length,after.history.length);
  return `${pageHeading('재훈련 비교','BEFORE & AFTER',`${SCENARIOS[before.config.scenario].name} · 동일 시설 · ${MODE[before.config.mode]} · ${DEPTH[before.config.depth].label}`)}<div class="stack">
    ${before.status!=='complete'||after.status!=='complete'?notice('한쪽 이상의 훈련을 일찍 종료했습니다. 각 경로의 마지막으로 실제 진행한 시점까지 표시합니다.','warn'):''}
    ${comparisonSummary(cut,before.facility,before.config)}
    <div class="compare">${compareSnapshot('BEFORE · 최초 훈련 상세',cut.sa,before.config,before.facility,cut.a)}${compareSnapshot('AFTER · 재훈련 상세',cut.sb,after.config,after.facility,cut.b)}</div>
    <section class="card stack"><h2>전체 훈련에서 달라진 행동</h2><p>${same?'같은 순서로 같은 행동을 선택했습니다. 규칙과 교육용 대응 평가도 같습니다.':improved.length?`새로 충족한 과제 · ${improved.map(g=>g.label).join(' · ')}`:'행동 순서 또는 선택이 달라졌습니다. 안전 과제와 상태 변화를 함께 검토하세요.'}</p><p class="small muted">추가 개선 과제 · ${b.missing.map(g=>g.label).join(' · ')||'이번 훈련의 적용 안전 과제 충족'}</p>
    <details><summary>판단 순서별 행동 비교</summary><div class="stack">${Array.from({length:seqLength},(_,i)=>`<div><b>${i+1}번째 판단</b><p class="small">최초 · ${actions[before.history[i]?.id]?.label||'기록 없음'}<br>재훈련 · ${actions[after.history[i]?.id]?.label||'기록 없음'}</p></div>`).join('')||'행동 기록이 없습니다.'}</div></details></section>
    <div class="actions">${button('재훈련 상세 결과','back-result')}${button('내 훈련 기록','records')}</div></div>`;
}
function reviewPage() {
  const r=run(), report=assessRun(r.state,r.facility,r.config,r.history);
  const goal=report.missing[0]||report.learning[0];
  const illness=r.config.scenario==='illness';
  const choices=illness?['반응이 뚜렷하지 않아도 음료부터 제공한다.','즉시 119에 신고하고 상황요원 안내에 따라 몸을 식힌다.','반응이 돌아올 때까지 신고 없이 기다린다.']:[actions[goal.ideas[0]]?.label||'현장 상황을 확인한다.','보호 담당자를 정하지 않고 현장 보고만 기다린다.','수용과 이동 조건을 확인하기 전에 모두 한꺼번에 이동시킨다.'];
  const answer=illness?1:0;
  return `${pageHeading('선택형 복습','1분 복습','복습 선택은 기존 훈련 기록과 별도로 진행합니다.')}<div class="form-shell stack"><section class="card stack"><h2>${illness?'의식 저하가 있는 온열질환 의심자를 발견하면?':`${goal.label}을(를) 위해 우선 검토할 행동은?`}</h2>${radios('review',Object.fromEntries(choices.map((text,i)=>[i,text])),review===null?'':String(review))}${review===null?'':notice(`<b>${answer===review?'적절한 판단입니다.':'선택을 다시 확인해보세요.'}</b><br>${illness?GOALS.call.reason:goal.reason}${sourceLink(illness?'health':goal.source)?`<br>${sourceLink(illness?'health':goal.source)}`:''}`,answer===review?'ok':'warn')}</section><div class="actions">${button('훈련 결과','back-result')}${r.rules===RULES?button('관련 계획 개선','improve',{kind:'secondary'}):''}</div></div>`;
}
function recordsPage() {
  const rows=[...store.runs].sort((a,b)=>b.created-a.created);
  return `${pageHeading('훈련 이력','내 훈련 기록','이 브라우저에 보관한 훈련을 이어가거나 결과를 다시 볼 수 있습니다.')}<div class="stack">
    <div class="card stack"><div class="actions">${button('기록 백업','backup',{kind:'secondary',mark:'clipboard'})}${button('기록 가져오기','pick-backup')}<input type="file" id="backup-file" accept="application/json,.json" hidden></div><p class="muted small">기기나 사이트 주소를 옮길 때 JSON 백업을 가져오세요. 백업에는 입력한 시설 정보와 계획이 포함됩니다.</p></div>
    ${store.draft?`<div class="card record"><div><h2>훈련 준비</h2>${pill('입력 중','orange')}</div>${button('입력 이어하기','resume-draft',{kind:'secondary'})}</div>`:''}
    ${store.heldDrafts.map(d=>`<div class="card record"><div><h2>임시저장 · ${SCENARIOS[d.config.scenario]?.name||'맞춤 훈련'}</h2><p class="muted small">${d.facility.people?`시설 이용자 ${escapeHTML(d.facility.people)}명`:'시설 조건 입력 중'}</p></div><div class="actions">${button('임시저장 열기','open-draft',{value:d.id,kind:'secondary'})}${button('삭제','delete-draft',{value:d.id})}</div></div>`).join('')}
    ${rows.length?rows.map(r=>`<section class="card record"><div><div class="actions">${pill(STATUS[r.status],r.status==='complete'?'green':'orange')}${r.rules!==RULES?pill('이전 훈련 규칙'):''}${r.parentId?pill('재훈련'):''}${r.branches.length?pill(`WHAT IF? ${r.branches.length}건`):''}</div><h2 style="margin-top:8px">${SCENARIOS[r.config.scenario].name}</h2><p class="muted small">${time(r.created)} · ${DEPTH[r.config.depth].label} · ${r.history.length}회 · +${r.state.minute}분</p></div><div class="actions">${isOpen(r)&&r.rules===RULES?button('이어하기','resume',{kind:'secondary',value:r.id}):button('결과 보기','open-result',{kind:'secondary',value:r.id})}${button('시설 복사','reuse',{value:r.id})}${button('삭제','delete',{value:r.id})}</div></section>`).join(''):`<div class="card stack">${tile('history')}<h2>훈련 기록이 없습니다</h2><p class="muted">빠른 체험으로 첫 훈련을 시작해보세요.</p><div class="actions">${button('빠른 체험 시작','quick',{kind:'primary',mark:'play'})}</div></div>`}</div>`;
}
function guideContent(short=false) {
  return `<div class="stack">${safetySummary()}
    ${!short?`<section class="card stack"><h2>폭염 예방</h2><ul class="plain-list"><li>폭염특보를 확인하고 더운 시간대의 활동을 조정하세요.</li><li>시원한 곳에서 쉬고 평소에 물을 규칙적으로 마시세요. 수분 섭취를 제한해야 하는 질환이 있으면 의료진 지침을 따르세요.</li><li>고령자와 이동이 어려운 이용자가 도움을 받을 수 있도록 담당자와 연락 방법을 확인하세요.</li></ul><p class="small">${sourceLink('health')}<br>${sourceLink('heat')}</p></section>`:''}
    <section class="card stack"><h2>온열질환이 의심될 때</h2><ul class="plain-list"><li>의식과 호흡을 확인하세요. 의식 저하, 심한 증상 등 중증이 의심되면 즉시 119에 신고하세요.</li><li>가능하고 안전한 범위에서 시원한 곳으로 옮겨 몸을 식히고 상황요원의 안내를 받으세요. 호흡이 비정상적이거나 확인되지 않으면 즉시 상황요원에게 알리세요.</li><li>의식이 명료하고 잘 삼킬 수 있을 때만 수분을 제공하세요. 증상이 나아지지 않거나 악화하면 119에 신고하세요.</li></ul><p class="small">${sourceLink('health')}</p></section>
    ${!short?`<section class="card stack"><h2>냉방 장애와 이동 지원</h2><p>활동을 줄이고 가용한 시원한 공간을 확인하세요. 수용 인원, 접근 가능한 경로, 동행이 필요한 이용자와 담당자를 확인한 뒤 이동을 조정하세요. 설비 점검은 시설 담당자에게 요청하세요.</p><p class="small">폭염 행동요령은 ${sourceLink('heat')}을 참고했습니다. 장애 대응 순서는 시설 훈련용 적용 예시입니다.</p></section>`:''}</div>`;
}
const WELFARE_CHECKS={cooling:'기존 냉방공간과 대체 공간의 수용 인원 확인',route:'이동 지원 대상과 접근 가능한 우회 경로 확인',handover:'당직·교대 담당자, 인계 시간 지정',contacts:'비상 연계 기관과 연락 수단 확인'};
function guidePage() {return `${pageHeading('공식 자료','폭염 안전 가이드','실제 폭염과 온열질환 의심 상황에서 확인할 안전수칙입니다.')}<div class="stack"><div class="actions">${button('대구 대응시설 안내','nearby',{kind:'secondary',mark:'pin'})}${button('16시 이후 쉼터 찾기','shelters-after16',{mark:'clock'})}${button('무료 물 나눔 행사','water-events',{mark:'pin'})}</div>${guideContent()}<section class="card stack"><h2>복지관 현장 점검표</h2><div>${Object.entries(WELFARE_CHECKS).map(([key,label])=>`<label class="check-row"><input type="checkbox" name="welfare-${key}" ${store.prefs.checklist?.[key]?'checked':''}>${label}</label>`).join('')}</div></section></div>`;}
const FIRE_URL='https://www.nfa.go.kr/nfa/introduce/status/firestationidfo/?searchDistance=10&searchMode=keyword';
// 국민안전24 안전지도 무더위쉼터. 대구 9개 구·군, 2026년 등록분, 2026-11-23 확인.
// 행은 구·군, 시설명, 주소, 유형, 누구나 이용, 기본/특보 추가/특보 연장 시간, 담당 부서 연락처 순서입니다.
// 시간은 [시작 분, 끝 분, 월~일 비트 마스크] 또는 null입니다.
const DAEGU_SHELTER_ROWS = [
  ["중구","동인시티타운경로당","중구 국채보상로131길 55 (동인동1가, 시티타운)","특정계층 이용시설",false,null,null,null,""],
  ["중구","아이엠뱅크시청영업부","중구 공평로 88 (동인동1가)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","GS25동인칸타빌점","중구 공평로 100","생활밀착 민간시설",true,[360,1380,127],null,null,""],
  ["중구","하나은행대구지점","중구 국채보상로 648 (동인동2가)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","동인1,2가경로당","중구 국채보상로 679-13","특정계층 이용시설",false,null,null,null,""],
  ["중구","중구청1층로비","중구 국채보상로139길 1 (동인동2가)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","아이엠뱅크중구청지점","중구 국채보상로139길 1 (동인동2가)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","동인4가경로당","중구 국채보상로142길 33-41 (동인동4가)","특정계층 이용시설",false,null,null,null,""],
  ["중구","동인삼정그린코아경로당","중구 동덕로30길 53 (동인동4가, 동인삼정그린코아아파트)","특정계층 이용시설",false,null,null,null,""],
  ["중구","동인동행정복지센터","중구 국채보상로142길 19-5 (동인동4가)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","삼덕119안전센터","중구 공평로 35","공공시설",true,[0,1440,127],null,null,""],
  ["중구","Sh수협은행대구지점","중구 달구벌대로 2149 (삼덕동1가)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","삼덕1,2가경로당","중구 공평로4길 25 (삼덕동2가)","특정계층 이용시설",false,null,null,null,""],
  ["중구","아이엠뱅크경대병원지점","중구 동덕로 130","생활밀착 민간시설",true,[540,1020,31],null,null,""],
  ["중구","아이엠뱅크삼덕동지점","중구 달구벌대로 2195 (경일빌딩)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","삼덕동행정복지센터","중구 달구벌대로447길 72-11","공공시설",true,[540,1080,31],null,null,""],
  ["중구","삼덕3가경로당","중구 달구벌대로443길 44-40 (삼덕동3가)","특정계층 이용시설",false,null,null,null,""],
  ["중구","삼덕청아람경로당","중구 달구벌대로447길 77 , 근린생활시설 (삼덕동3가)","특정계층 이용시설",false,null,null,null,""],
  ["중구","성내1동행정복지센터","중구 동성로2길 7 (봉산동)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","신한은행대구금융센터","중구 달구벌대로 2125 (봉산동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","봉산뜨란채경로당","중구 봉산문화길 69 , 상가동 (봉산동, 봉산뜨란채)","특정계층 이용시설",false,null,null,null,""],
  ["중구","성내2동행정복지센터","중구 달구벌대로415길 48 (장관동)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","아이엠뱅크동성로지점","중구 달구벌대로 2105","생활밀착 민간시설",true,[540,1140,31],null,null,""],
  ["중구","패션주얼리전문타운","중구 경상감영길 176","생활밀착 민간시설",true,[600,1140,29],[600,1140,96],null,""],
  ["중구","IBK기업은행대구중앙지점","중구 경상감영길 221 (동문동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","동성동경로당","중구 교동길 79-6 (교동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","대구역센트럴자이경로당","중구 서성로 99 (수창동, 대구역센트럴자이)","특정계층 이용시설",false,null,null,null,""],
  ["중구","아이엠뱅크북성로지점","중구 서성로 81","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","GS25대구역자이점","중구 서성로 99 (대구역센트럴자이)","생활밀착 민간시설",true,[360,1380,127],null,null,""],
  ["중구","중구보건소","중구 태평로 45 (태평로3가)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","서성동경로당","중구 서성로15길 27-1 (서성로1가)","특정계층 이용시설",false,null,null,null,""],
  ["중구","Sh수협은행반월당지점","중구 남성로 32 (남성로)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","신성미소시티경로당","중구 달구벌대로 2051 , 에이동 (계산동2가, 신성미소시티 주상복합)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남성동경로당","중구 약령길 33-6 (계산동2가)","특정계층 이용시설",false,null,null,null,""],
  ["중구","동산동경로당","중구 달구벌대로405길 59-12 (동산동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","IBK기업은행대구지점","중구 국채보상로 488 (동산동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","서문로119안전센터","중구 경상감영길 45","공공시설",true,[0,1440,127],null,null,""],
  ["중구","행복나눔의집","중구 서성로16길 53 (대안동)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","북성동경로당","중구 서성로14길 51-18 (북내동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","일신경로당","중구 국채보상로93길 31-1 (대신동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","대신서문경로당","중구 큰장로24안길 31-6 (대신동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","대신119안전센터","중구 큰장로26길 45","공공시설",true,[0,1440,127],null,null,""],
  ["중구","태왕아너스경로당","중구 달구벌대로 1975 (대신동, 태왕아너스스카이 아파트)","특정계층 이용시설",false,null,null,null,""],
  ["중구","대신동행정복지센터","중구 달구벌대로389길 50 (대신동)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","이편한세상대신경로당","중구 달구벌대로 1943 (대신동, e편한세상 대신)","특정계층 이용시설",false,null,null,null,""],
  ["중구","아이엠뱅크대신동지점","중구 국채보상로 469 (대신동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","대신자이경로당","중구 달구벌대로 1955","특정계층 이용시설",false,null,null,null,""],
  ["중구","성내3동행정복지센터","중구 달성로 111 (성내3동주민센터)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","달성동경로당","중구 달성공원로 42-3 (달성동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산1동경로당","중구 중앙대로62길 30-3 (남산동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산119안전센터","중구 달구벌대로 1926","공공시설",true,[0,1440,127],null,null,""],
  ["중구","남산롯데캐슬센트럴스카이경로당","중구 재마루길 77 (남산동, 남산롯데캐슬 센트럴스카이)","특정계층 이용시설",false,null,null,null,""],
  ["중구","반월당역서한포레스트경로당","중구 중앙대로67길 11 (남산동, 반월당역 서한포레스트)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산기독교종합사회복지관","중구 관덕정길 16 (남산교회)","공공시설",true,[540,1080,31],null,null,"053-661-2897"],
  ["중구","남산복지관경로당","중구 남산로7길 80 (남산동, 까치아파트)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산3동행정복지센터","중구 남산로4길 70 (남산동)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","한국장학재단대구센터","중구 명륜로23길 89","공공시설",true,[540,1080,31],null,null,""],
  ["중구","아이엠뱅크덕산지점","중구 남산로 61 (남산동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","반월당삼정그린코아경로당","중구 중앙대로67길 10 , 102동 (남산동, 반월당삼정그린코아)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남문경로당","중구 2·28길 10-16 (남산동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","대남경로당","중구 명륜로6길 5 (남산동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산3동경로당","중구 남산로6안길 27-57 (남산동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","청라센트럴파크경로당","중구 달구벌대로 1970 (남산동, 남산휴먼시아2단지)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산4동경로당","중구 남산로3안길 11 (남산동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산1동행정복지센터","중구 2·28길 18-15 (남산동)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","MG새마을금고남산2동지점","중구 명륜로 44 (남산동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","까치아파트경로당","중구 남산로7길 80 (남산동, 까치아파트)","특정계층 이용시설",false,null,null,null,""],
  ["중구","GS25대구남산점","중구 중앙대로 274","생활밀착 민간시설",true,[360,1380,127],null,null,""],
  ["중구","KB국민은행남산동지점","중구 명륜로 69","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","이편한세상남산경로당","중구 달구벌대로 2020 (남산동, e편한세상 남산)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산역화성파크드림경로당","중구 남산로7길 7 (남산동, 남산역 화성파크드림)","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산2동행정복지센터","중구 명륜로 27-1 (남산동)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","남산4동행정복지센터","중구 남산로1길 42 (남산동)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","하나은행대구중앙지점","중구 달구벌대로 2108 (남산동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","효성해링턴플레이스경로당","중구 중앙대로66길 20 , 104동 (남산동, 반월당효성해링턴플레이스)","특정계층 이용시설",false,null,null,null,""],
  ["중구","보성황실경로당","중구 남산로13길 17","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산그린타운경로당","중구 달구벌대로 1950","특정계층 이용시설",false,null,null,null,""],
  ["중구","남산휴먼시아1단지경로당","중구 달구벌대로 1960 (남산동, 남산휴먼시아1단지아파트)","특정계층 이용시설",false,null,null,null,""],
  ["중구","보성송림아파트경로당","중구 남산로4길 91 (남산동, 보성송림아파트)","특정계층 이용시설",false,null,null,null,""],
  ["중구","MG새마을금고남산새마을금고본점","중구 남산로4길 64 (남산동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["중구","극동스타클래스남산경로당","중구 남산로 30","특정계층 이용시설",false,null,null,null,""],
  ["중구","대봉1동행정복지센터","중구 달구벌대로440길 27 (대봉동)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","더샵리비테르2차경로당","중구 대봉로43길 22 (대봉동, 더샵 리비테르 2차)","특정계층 이용시설",false,null,null,null,""],
  ["중구","더샵리비테르1차경로당","중구 대봉로43길 21 (대봉동, 더샵 리비테르 1차)","특정계층 이용시설",false,null,null,null,""],
  ["중구","대봉2동행정복지센터","중구 대봉로47길 31 (대봉동)","공공시설",true,[540,1080,31],null,null,""],
  ["중구","대봉태왕아너스경로당","중구 동덕로 55","특정계층 이용시설",false,null,null,null,""],
  ["중구","대봉2동경로당","중구 명륜로 138-9 (대봉동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","대봉천신협본","중구 대봉로 203","생활밀착 민간시설",true,[0,1440,127],null,null,"053-661-2897"],
  ["중구","대봉화성파크드림경로당","중구 명덕로55길 25 (대봉동, 대봉 화성파크드림아파트)","특정계층 이용시설",false,null,null,null,""],
  ["중구","대봉1동경로당","중구 달구벌대로440길 27 (대봉동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","청운맨션경로당","중구 동덕로 33 , 경로당 (대봉동)","특정계층 이용시설",false,null,null,null,""],
  ["중구","센트로팰리스경로당","중구 대봉로 260 (대봉동, 센트로 팰리스)","특정계층 이용시설",false,null,null,null,""],
  ["동구","iM뱅크동구청지점","동구 아양로 207 (신암동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","신암1동행정복지센터","동구 아양로7길 27 (신암동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","신암2동행정복지센터","동구 신성로 56 (신암동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","신암3동경로당","동구 아양로8길 10-1","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","뜨란채경로당","동구 아양로7길 12 (신암동, 신암뜨란채)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","아양새마을금고동서지점","동구 아양로37길 68 (신암동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","신암3동행정복지센터","동구 신암남로 67 (신암동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","성동경로당","동구 아양로34길 18-3 (신암동)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","건영캐스빌경로당","동구 신암남로 50 (신암건영캐스빌)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","iM뱅크신암금융센터","동구 아양로 2 (신암동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","KB국민은행신암동종합금융센터","동구 아양로 34 (신암동)","생활밀착 민간시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","팔공노인복지관","동구 동북로 393 , 팔공노인복지관 (신암동)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","보성경로당","동구 큰고개로 23 (보성아파트 10동)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","신암4동행정복지센터","동구 신암남로23길 53 (신암동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","신암5동행정복지센터","동구 아양로37길 92 (신암동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","큰고개새마을금고본점","동구 신암남로 151 (신암동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","신천4동행정복지센터","동구 동부로30길 61-7 (신천동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","신천도서관","동구 동부로6길 65","공공시설",true,[540,1200,30],[540,1020,96],null,"053-662-3164"],
  ["동구","신천새마을금고송라점","동구 동부로 1 (신천LH 관리동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","신천가람경로당","동구 신암로16길 16 (가람타운)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","iM뱅크신천동지점","동구 송라로 58 (신천동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","한아름신협본점","동구 동부로 76 (신천동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","동대구농협신천동지점","동구 장등로 56 (벽산e-솔렌스힐)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","iM뱅크신천4동지점","동구 동부로30길 23-1 (신천동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","신천1.2동행정복지센터","동구 국채보상로159길 41 (우방푸른타운)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","신천3동행정복지센터","동구 장등로 90 (신천동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","신천4동제2경로당","동구 동부로32길 47-11 (신천동)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","효목1동행정복지센터","동구 화랑로41길 46 , 효목1동주민센터 (효목동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","진로이스트타운경로당","동구 아양로 218 (효목동, 진로이스트타운)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","효목2동행정복지센터","동구 화랑로25길 45 (효목동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","태왕메트로시티경로당","동구 동북로 500 (효목동, 태왕메트로시티)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","효천신협효목지점","동구 아양로50길 135 (효목동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","효천신협본점","동구 효목로 37 (효목동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","동구시장내멀티미디어관","동구 효목로 10 (효목동)","생활밀착 민간시설",true,[600,1080,31],[600,1080,96],null,"053-662-3164"],
  ["동구","지저새마을금고이시아지점","동구 팔공로51길 3","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","청구새들마을경로당","동구 팔공로 322-5 (봉무청구새들마을 102동)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","iM뱅크이시아폴리스지점","동구 팔공로 227","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","봉무경로당","동구 팔공로 333-12 (봉무 경로당)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","불로봉무새마을금고","동구 팔공로 127","생활밀착 민간시설",true,[540,960,31],[540,960,32],null,"053-662-3164"],
  ["동구","불로봉무동행정복지센터","동구 팔공로 161","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","도평동행정복지센터","동구 팔공로24길 171 (도동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","지저동행정복지센터","동구 해동로3길 80 (지저동주민센터)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","동촌농협본점","동구 아양로 295 (입석동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","동대구우체국","동구 동촌로 1 (입석동)","공공시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","입석2경로당","동구 입석로3길 14-1 (입석2경로당)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","동촌동행정복지센터","동구 동촌로11길 5 (입석동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","검사1경로당(할머니경로당)","동구 해동로 178 (검사제1경로당)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","동구보건소","동구 동촌로 79 (검사동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","검사2경로당","동구 방촌로1길 19 (대한노인회)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","대구광역시농업기술센터","동구 동촌로42길 69 (방촌동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","해안동행정복지센터","동구 방촌로29길 46 , 해안동주민센터 (방촌동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","우방강촌2차경로당","동구 화랑로80길 9 (우방2차강촌마을 301동)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","보성강남(아)경로당","동구 화랑로88길 30 (보성강남타운)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","방촌제2경로당","동구 둔산로45길 16 (방촌제2경로당)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","iM뱅크방촌지점","동구 동촌로 274 (BC스테이션)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","방촌동행정복지센터","동구 화랑로 397","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","상동경로당","동구 옻골로20길 31 (상동경로당)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","부동경로당","동구 부동길 183 (부동경로당)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","신덕경로당","동구 신덕로5길 50 (신덕경로당)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","안심4동행정복지센터","동구 안심로49길 98 (안심4동주민센터)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","iM뱅크안심점","동구 안심로41길 36 (서호동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","안심3동행정복지센터","동구 동호로 65","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","농협은행안심지점","동구 반야월로 202 (동호동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","안심종합사회복지관","동구 율하동로 76 (안심주공3단지아파트 302동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","반야월농협본점","동구 반야월로 150 (반야월 농협)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","안심1동행정복지센터","동구 율하동로25길 5 (안심1동행정복지센터)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","동원경로당","동구 안심로41길 21 (보성동원타운)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","안심제1종합사회복지관","동구 안심로22길 3 (안심주공1단지아파트 117동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","안심도서관","동구 금호강변로 360 (안심도서관)","공공시설",true,[540,1320,30],[540,1020,96],null,"053-662-3164"],
  ["동구","국민건강보험공단대구동부지사종합민원실","동구 안심로16길 47 (율하동타임스퀘어)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","강변동서마을경로당","동구 화랑로100길 17 (강변동서마을 101동)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","백자아파트경로당","동구 동촌로 346 (우방백자아파트)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","안심2동행정복지센터","동구 반야월로1길 28 (안심2동주민센터)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","각산태영데시앙경로당","동구 반야월북로 123 (각산 태영 데시앙 104)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","혁신동행정복지센터","동구 이노밸리로26길 8 (광진빌딩)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","한국가스안전공사대구광역본부","동구 경안로 861 (각산동)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["동구","iM뱅크반야월지점","동구 안심로 401","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","하나은행대구혁신도시지점","동구 이노밸리로 309 (신서동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","롯데캐슬레전드경로당","동구 안심로73길 22 (신서 롯데캐슬레전드 101동)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","KB국민은행대구혁신도시","동구 이노밸리로 322 (신서동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","백안경로당","동구 팔공로207길 47","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","보성1차경로당","동구 팔공로 489 (팔공보성아파트 101동)","특정계층 이용시설",false,null,null,null,"053-662-3164"],
  ["동구","공산농협본점","동구 파계로6길 55 (지묘동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-662-3164"],
  ["동구","공산동행정복지센터","동구 팔공로91길 9 (공산동주민센터)","공공시설",true,[540,1080,31],null,null,"053-662-3164"],
  ["서구","내당2,3동행정복지센터","서구 내당동 895-27","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","IM뱅크내당동지점","서구 달서로 1 (내당동)","생활밀착 민간시설",true,[600,960,31],null,null,"053-663-2895"],
  ["서구","내당4동행정복지센터","서구 서대구로3길 46","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","MG새마을금고반고개본점","서구 달서로4길 35 (내당동)","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","삼화경로당","서구 달구벌대로373길 7-5 (내당동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","MG새마을금고광장본점","서구 달구벌대로361길 14-1","생활밀착 민간시설",true,[540,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","내당도서관","서구 서대구로7길 36 (내당도서관)","공공시설",true,[540,1080,30],[540,1020,96],[1080,1200,30],"053-663-2895"],
  ["서구","MG새마을금고와룡내당지점","서구 당산로 243","생활밀착 민간시설",true,[540,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","내당노인복지관","서구 서대구로3길 44 (내당동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","내당2동경로당","서구 큰장로15길 14-20","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","장수경로당","서구 큰장로9길 9-3 (내당동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","천일경로당","서구 달구벌대로373길 2-24 (내당동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","내당경로당","서구 평리로 408-13 (내당동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","서구종합사회복지관","서구 달구벌대로365길 3 (내당동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","내당1동행정복지센터","서구 서대구로4길 35 (내당동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","내서경로당","서구 달구벌대로365길 21-5","특정계층 이용시설",false,null,null,null,"053-663-2534"],
  ["서구","당산경로당","서구 달서로39길 24 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2534"],
  ["서구","상록경로당","서구 달서로18길 42-3 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","동흔경로당","서구 국채보상로76길 27-1 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","일구경로당","서구 평리로85길 15 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","만수정경로당","서구 북비산로61길 34 (비산동, 비산시영아파트)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","비산5동행정복지센터","서구 비산동 1185-18","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","MG새마을금고서대구비룡지점","서구 달서로 201","생활밀착 민간시설",true,[540,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","거창경로당","서구 북비산로61길 43-1 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","원상경로당","서구 통학로49길 30-27 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","비원도서관","서구 달서천로61안길 10 (비산동)","공공시설",true,[540,1080,30],[540,1020,96],[1080,1200,30],"053-663-2895"],
  ["서구","비산7동행정복지센터","서구 염색공단로5길 4 (비산동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","장수경로당","서구 달서로34길 13-14 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","비산2,3동행정복지센터","서구 국채보상로81길 43 (비산동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","쉼터경로당","서구 달서로34길 23-6 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","비산6동경로당","서구 문화로69길 26-16 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","비산1동경로당","서구 통학로52길 30 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","비산5동제2경로당","서구 달서천로61길 2-6 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","비산도서관","서구 달서로14길 13 (비산동)","공공시설",true,[540,1080,30],[540,1020,96],[1080,1200,30],"053-663-2895"],
  ["서구","비산4동행정복지센터","서구 국채보상로78길 29-4 (비산동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","비산6동행정복지센터","서구 문화로67길 3 (비산동)","공공시설",true,[540,1080,31],[540,1200,32],[1080,1260,31],"053-663-2895"],
  ["서구","MG새마을금고더조은본점","서구 북비산로 378","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","달성경로당","서구 달성공원로 13-14 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","모범경로당","서구 달서로26길 35-8 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","비산6동제2경로당","서구 달서로27길 13-1 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","IM뱅크팔달영업부","서구 팔달로 126","생활밀착 민간시설",true,[600,960,31],null,null,"053-663-2895"],
  ["서구","비산1동행정복지센터","서구 북비산로65길 18 (비산동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","원고개도서관","서구 달서로43길 12 (비산동)","공공시설",true,[540,1080,15],[540,1020,96],[1080,1200,15],"053-663-2895"],
  ["서구","MG새마을금고더조은제1지점","서구 달서로 82 (비산동)","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","비산5동제1경로당","서구 서대구로68길 60-9 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","MG새마을금고만평(본점)","서구 서대구로62길 4 (비산동)","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","비원노인복지관","서구 서대구로 268 (비산동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","장수경로당","서구 평리로73길 11-15 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","만수경로당","서구 평리로57길 15 (평리동, 동서1차아파트)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","MG새마을금고와룡평리지점","서구 국채보상로37길 38 (서대구역서한이다음더퍼스트)","생활밀착 민간시설",true,[540,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","평리5동경로당","서구 서대구로31길 11 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","평리3동행정복지센터","서구 서대구로42길 52","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","평리롯데캐슬경로당","서구 국채보상로 316 (평리동, 평리롯데캐슬)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","뉴평리도서관","서구 평리로73길 37","공공시설",true,[540,1080,30],[540,1020,96],[1080,1200,30],"053-663-2895"],
  ["서구","평리푸르지오1단지아파트경로당","서구 국채보상로50길 20 (평리동, 평리 푸르지오)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","서대구농협평리지점","서구 서대구로 195 (평리동)","생활밀착 민간시설",true,[600,960,31],null,null,"053-663-2895"],
  ["서구","MG새마을금고평상(본점)","서구 문화로 283 (평리동)","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","MG새마을금고평리(본점)","서구 국채보상로 304 (평리동)","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","평리경로당","서구 서대구로42길 67 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","평안경로당","서구 서대구로42길 47-15 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","새마을경로당","서구 서대구로36길 5-16 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","평광경로당","서구 국채보상로50길 42-37 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","청수경로당","서구 국채보상로52길 27-35 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","MG새마을금고와룡(본점)","서구 국채보상로 161 (평리동)","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","MG새마을금고중평(제1지점)","서구 국채보상로50길 20 (평리동, 평리 푸르지오)","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","평리청구경로당","서구 서대구로 77 (평리동, 평리청구타운)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","평리5동행정복지센터","서구 문화로 160","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","평리2동행정복지센터","서구 국채보상로60길 6 (평리동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","평리6동행정복지센터","서구 서대구로41길 41 (평리동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","서구노인복지관","서구 문화로 288 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","MG새마을금고중평제2지점","서구 문화로49길 17 (평리동)","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","IBK기업은행평리동지점","서구 서대구로 206 (평리동)","생활밀착 민간시설",true,[600,960,31],null,null,"053-663-2895"],
  ["서구","MG새마을금고중평(본점)","서구 서대구로 86 (평리동)","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","평리1동행정복지센터","서구 문화로 280 (평리동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","평리4동행정복지센터","서구 국채보상로46길 37-3 (평리동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","평원경로당","서구 국채보상로66길 38-8 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","서부경로당","서구 국채보상로 336-6 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","들마을경로당","서구 통학로30길 5-15 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","신도경로당","서구 문화로 313-14 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2534"],
  ["서구","평산경로당","서구 통학로40길 37-2 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","평리2동경로당","서구 국채보상로60길 35-9 (평리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","상리2동경로당","서구 가르뱅이로 69 (상리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","상중이동행정복지센터","서구 당산로 343 (중리동)","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["서구","MG새마을금고더조은제2지점","서구 평리로29길 7","생활밀착 민간시설",true,[540,960,15],[540,1320,96],[960,1320,15],"053-663-2895"],
  ["서구","진달래경로당","서구 국채보상로38길 22 (중리진달래2차아파트211동)","특정계층 이용시설",false,null,null,null,"053-663-2534"],
  ["서구","중리상록경로당","서구 국채보상로36길 16-2 (중리동)","특정계층 이용시설",false,null,null,null,"053-663-2895"],
  ["서구","영어도서관","서구 평리로35길 90-6 (중리동)","공공시설",true,[540,1080,30],[540,1020,96],null,"053-663-2895"],
  ["서구","광장신용협동조합뉴타운지점","서구 평리로 253 (중리동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-663-2895"],
  ["서구","서구어린이도서관","서구 문화로 123 (이현동)","공공시설",true,[540,1080,30],[540,1020,96],null,"053-663-2895"],
  ["서구","MG새마을금고바른제1지점","서구 달서천로83길 12-1","생활밀착 민간시설",true,[600,960,31],[540,1320,96],[960,1320,31],"053-663-2895"],
  ["서구","서구제일종합사회복지관","서구 옥산로6길 9 (원대동3가)","공공시설",true,[600,1080,31],null,null,"053-663-2895"],
  ["서구","원대동행정복지센터","서구 원대동3가 1429-5","공공시설",true,[540,1080,31],null,null,"053-663-2895"],
  ["남구","화수경로당","남구 대봉로36길 17","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","상아맨션경로당","남구 명덕로 236 (보성상아맨션 106동)","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","iM뱅크대봉브라보점","남구 명덕로 308","생활밀착 민간시설",true,[540,960,31],null,null,"053-664-2923"],
  ["남구","배나무샘골마을문화센터","남구 이천로29길 39 (배나무샘골마을문화센터)","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","이천어울림도서관","남구 이천로 124","공공시설",true,[540,1080,126],null,null,"053-664-2923"],
  ["남구","대덕2차아파트경로당","남구 앞산순환로 655 (보성대덕2차아파트206동)","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","봉덕1동행정복지센터","남구 봉덕로 51-2","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","봉덕3동행정복지센터","남구 중앙대로22길 100","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","봉덕1동경로당","남구 희망로3길 11-2","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","봉삼경로당","남구 삼정4길 89","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","봉명경로당","남구 중앙대로34길 75 (봉덕동)","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","고산골경로당","남구 용두길 89-1","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","KEB하나은행봉덕동지점","남구 중앙대로 146","생활밀착 민간시설",true,[540,960,31],null,null,"053-664-2923"],
  ["남구","NH농협은행봉덕동지점","남구 봉덕로 125","생활밀착 민간시설",true,[540,960,31],null,null,"053-664-2923"],
  ["남구","IM뱅크봉덕동지점","남구 대봉로 60","생활밀착 민간시설",true,[540,960,31],null,null,"053-664-2923"],
  ["남구","IM뱅크효성타운지점","남구 효성중앙길 37 (봉덕동, 효성타운)","생활밀착 민간시설",true,[540,960,31],null,null,"053-664-2923"],
  ["남구","남구청민원실","남구 이천로 51 (봉덕동)","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","대명1동행정복지센터","남구 두류공원로 38","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","대명2동행정복지센터","남구 명덕로32길 30","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","대명3동행정복지센터","남구 명덕로20길 115","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","IM뱅크대명동지점","남구 중앙대로 147","생활밀착 민간시설",true,[540,960,31],null,null,"053-664-2923"],
  ["남구","IM뱅크대덕지점","남구 대명로 195","생활밀착 민간시설",true,[540,960,31],null,null,"053-664-2923"],
  ["남구","IM뱅크성명지점","남구 대명로 23","생활밀착 민간시설",true,[540,960,31],null,null,"053-664-2923"],
  ["남구","대명4동행정복지센터","남구 두류공원로20길 19","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","영선경로당","남구 중앙대로50길 40","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","일심경로당","남구 성명공원길 49","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","대명4동경로당","남구 대경5길 101-2","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","대명5동행정복지센터","남구 대명로58길 11","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","대명6동행정복지센터","남구 대명남로 73","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","대명9동행정복지센터","남구 큰골길 53","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","명성경로당","남구 두류공원로5길 42-8","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","대명10동경로당","남구 도촌길 150","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","대명11동경로당","남구 대명역6길 48","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","대명1동경로당","남구 장전3길 84-3","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","무궁화경로당","남구 현충로23길 23","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","대명종합사회복지관","남구 양지로 8 (대명사회복지관)","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","대덕경로당","남구 삼각지5길 17 (대명동)","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","남구종합사회복지관","남구 중앙대로38길 17 (남구종합사회복지관)","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","명덕경로당","남구 명덕로38길 51","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","대명9동경로당","남구 큰골길 53","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","명오당경로당","남구 대명남2길 59-4","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","대우경로당","남구 안지랑로7길 14-3","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","CU대명행복점","남구 앞산순환로79길 29","생활밀착 민간시설",true,[840,1320,127],null,null,"053-664-2923"],
  ["남구","대명10동행정복지센터","남구 대명복개로4길 166","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","남구시니어행복센터","남구 대명복개로1길 38 (대명동)","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","대명11동행정복지센터","남구 관문시장4길 53","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["남구","대복경로당","남구 대명로20길 28","특정계층 이용시설",false,null,null,null,"053-664-2923"],
  ["남구","국민건강보험공단대구남부지사","남구 대명로 124","공공시설",true,[540,1080,31],null,null,"053-664-2923"],
  ["북구","칠성1가경로당","북구 칠성시장로1길 60-3","특정계층 이용시설",false,null,null,null,""],
  ["북구","서희스타힐스경로당","북구 칠성남로 101 (칠성동2가, 대구역 서희스타힐스)","특정계층 이용시설",false,null,null,null,""],
  ["북구","IM뱅크통일로지점","북구 중앙대로 507","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","칠성동주민자치센터","북구 칠성로19길 8 (칠성동2가)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","칠성2가2동경로당","북구 공평로 179-6","특정계층 이용시설",false,null,null,null,""],
  ["북구","IM뱅크제2본점영업부","북구 옥산로 111 (대구은행 제2본점)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","칠성동행정복지센터","북구 칠성로19길 8 (칠성동2가)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","대구노숙인종합지원센터","북구 칠성남로38길 22","특정계층 이용시설",false,null,null,null,""],
  ["북구","제일평화의집","북구 고성로28길 1","공공시설",true,[540,1080,127],null,null,""],
  ["북구","고성동주민자치센터","북구 고성로31길 21 (고성동행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","오페라트루엘경로당","북구 고성북로 34 (오페라트루엘 시민의 숲 아파트)","특정계층 이용시설",false,[600,1080,31],[540,1260,96],[1080,1260,31],"053-665-4354"],
  ["북구","고성동행정복지센터","북구 고성로31길 21 (고성동행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","침산3동행정복지센터","북구 성북로 55 (침산3동행정복지센터)","공공시설",true,[540,1080,15],null,null,""],
  ["북구","오봉경로당","북구 오봉로22길 45","특정계층 이용시설",false,null,null,null,""],
  ["북구","침산1동경로당","북구 침산남로9길 27 (침산1동 복합커뮤니티센터)","특정계층 이용시설",false,null,null,null,""],
  ["북구","태영신협","북구 침산남로 170","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","드림새마을금고침산2동지점","북구 침산남로 165","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","SC제일은행침산동지점","북구 침산남로 201","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","침산119안전센터","북구 침산남로 149","공공시설",true,[540,1080,31],[540,1320,96],[1080,1320,31],""],
  ["북구","북구보건소","북구 성북로 49 (북구보건소)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","침산1동행정복지센터","북구 침산남로13길 16 (침산1동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","침산2동경로당","북구 침산남로31길 4-1","특정계층 이용시설",false,null,null,null,""],
  ["북구","침산3동주민자치센터","북구 성북로9길 12 (침산동, 침산동 2차 쌍용예가)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","침산3동제2경로당","북구 침산로48길 10","특정계층 이용시설",false,null,null,null,""],
  ["북구","북구청(민원실)","북구 옥산로 65 (침산동)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","옥산경로당","북구 칠성시장로25길 15","특정계층 이용시설",false,null,null,null,""],
  ["북구","옥산할머니경로당","북구 침산남로44길 7-3","특정계층 이용시설",false,null,null,null,""],
  ["북구","침산2동행정복지센터","북구 침산남로 195 (침산2동행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","하나은행노원동지점","북구 오봉로 8","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","대구제일새마을금고","북구 침산남로 3","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","노원동행정복지센터","북구 노원로10길 166 (노원동행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","노원동주민자치센터","북구 노원로10길 166 (노원동행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","IM뱅크3공단지점","북구 노원동로 2","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","에이스새마을금고본점","북구 팔달로 137","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","IM뱅크노원동지점","북구 노원로 169 (노원동3가)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","감밭경로당","북구 대현남로8길 5","특정계층 이용시설",false,null,null,null,""],
  ["북구","신화아파트경로당","북구 경대로5길 25 (대현동, 대현신화맨션)","특정계층 이용시설",false,null,null,null,""],
  ["북구","대현1동제1경로당","북구 대현로17길 7 (대현아파트 1동)","특정계층 이용시설",false,null,null,null,""],
  ["북구","대현동행정복지센터","북구 대현남로 25 (대현한신휴플러스 주민자치센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","대현1동제2경로당","북구 대현로서15길 50-7","특정계층 이용시설",false,null,null,null,""],
  ["북구","대현E-편한세상경로당","북구 대현로10길 82 (대현동, 대현 e-편한세상)","특정계층 이용시설",false,null,null,null,""],
  ["북구","대현2동경로당","북구 신천동로146길 9","특정계층 이용시설",false,null,null,null,""],
  ["북구","IM뱅크대현동지점","북구 대현남로6길 20 (센트럴파크대현 307동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","대현뜨란채경로당","북구 대현남로 28 (대현동, 대현뜨란채)","특정계층 이용시설",false,null,null,null,""],
  ["북구","새마을금고대현본점","북구 대현남로6길 5","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","IM뱅크성북교지점","북구 연암로 117","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","IM뱅크경북대지점","북구 대학로 80 (경북대학교)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","산격종합사회복지관","북구 연암로 183 (산격동, 산격주공임대아파트)","공공시설",true,[600,960,31],null,null,""],
  ["북구","북구청소년회관","북구 검단로 71-17 (산격동)","공공시설",true,[360,1260,31],[480,960,32],null,""],
  ["북구","산격4동주민자치센터","북구 대구체육관로 48 (산격4동행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","장수정경로당","북구 대구체육관로10길 22-1","특정계층 이용시설",false,null,null,null,""],
  ["북구","산격1동제1경로당","북구 연암로 86","특정계층 이용시설",false,null,null,null,""],
  ["북구","산격119안전센터","북구 유통단지로8길 88 (산격안전센터)","공공시설",true,[540,1440,31],[540,1440,96],null,""],
  ["북구","가정종합사회복지관","북구 대동로10길 9","공공시설",true,[540,1140,31],[540,720,32],null,""],
  ["북구","북대구농협본점","북구 동북로 160","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","산격2동주민자치센터","북구 동북로31길 30 (산격2동행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","대우아파트경로당","북구 동북로 163 (산격동, 산격대우아파트)","특정계층 이용시설",false,null,null,null,""],
  ["북구","산격4동행정복지센터","북구 대구체육관로 48 (산격4동행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","엑스코서관(GATE3번우측쉼터)","북구 엑스코로 10 (산격동)","공공시설",true,[600,1020,31],[540,1080,96],null,""],
  ["북구","산격1동행정복지센터","북구 연암로36길 6 (산격1동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","산격2동행정복지센터","북구 동북로31길 30 (산격2동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","산격3동행정복지센터","북구 대학로15길 16 (산격3동 복합커뮤니티센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","IM뱅크복현지점","북구 동북로 174","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","들샘경로당","북구 경진로4길 25-1","특정계층 이용시설",false,null,null,null,""],
  ["북구","성화아파트경로당","북구 복현로 114-18 (복현동, 동서성화아파트)","특정계층 이용시설",false,null,null,null,""],
  ["북구","복현2차서한타운경로당","북구 공항로15길 8 (복현동, 복현2차서한타운)","특정계층 이용시설",false,null,null,null,""],
  ["북구","대불노인복지관","북구 검단로 8-14 (대불노인복지회관)","특정계층 이용시설",false,null,null,null,""],
  ["북구","복현서한타운경로당","북구 검단로 50 (복현동, 복현서한타운)","특정계층 이용시설",false,null,null,null,""],
  ["북구","복현2동주민자치센터","북구 복현로8길 16-5 (복현2동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","복현1동행정복지센터","북구 동북로52길 7 (복현1동행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","복현2동행정복지센터","북구 복현로8길 16-5 (복현2동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","복현큰마을경로당","북구 공항로15길 15-21","특정계층 이용시설",false,null,null,null,""],
  ["북구","복현1동주민자치센터","북구 동북로52길 7 (복현1동행정복지센터)","공공시설",true,[540,1080,31],null,[1080,1320,31],""],
  ["북구","IM뱅크동북로지점","북구 동북로 287","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","검단경로당","북구 검단동로4길 13-50 (검단동)","특정계층 이용시설",false,null,null,null,""],
  ["북구","검단부녀경로당","북구 검단동로4길 13-50 (검단동)","특정계층 이용시설",false,null,null,null,""],
  ["북구","검단이팝나무경로당","북구 검단동로 24-38 (신한빌라)","특정계층 이용시설",false,null,null,null,""],
  ["북구","검단동주민자치센터","북구 검단로 230 (검단동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","동변경로당","북구 동변로24길 14 (동변동)","특정계층 이용시설",false,null,null,null,""],
  ["북구","무태조야동주민자치센터","북구 호국로43길 20 (무태조야동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","서변숲도서관","북구 서변로3길 54 (무태조야동복합문화시설)","공공시설",true,[540,1080,31],[540,1020,96],[1080,1320,31],""],
  ["북구","IM뱅크동서변지점","북구 호국로 209","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","무태조야동행정복지센터","북구 호국로43길 20 (무태조야동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","이곡경로당","북구 이곡길 25","특정계층 이용시설",false,null,null,null,""],
  ["북구","조야경로당","북구 조야로 49","특정계층 이용시설",false,null,null,null,""],
  ["북구","칠곡농협본점","북구 칠곡중앙대로 574","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","읍내119안전센터","북구 칠곡중앙대로 570 (소방파출소)","공공시설",true,[540,1080,127],null,null,""],
  ["북구","읍내동행정복지센터","북구 칠곡중앙대로 561 , 읍내동 주민센터 (읍내동)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","구수산도서관","북구 대천로 21 (읍내동)","공공시설",true,[540,1080,31],[540,1020,96],[1080,1320,31],""],
  ["북구","산호한양아파트경로당","북구 대천로7길 40 (칠곡산호한양아파트)","특정계층 이용시설",false,null,null,null,""],
  ["북구","그린빌5단지경로당","북구 학남로 100 (국우동, 칠곡그린빌 5,6단지)","특정계층 이용시설",false,null,null,null,""],
  ["북구","국우동행정복지센터","북구 도남길 17 (국우동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","그린빌1단지경로당","북구 구리로 250 (국우동, 그린빌1)","특정계층 이용시설",false,null,null,null,""],
  ["북구","국우동주민자치센터","북구 도남길 17 (국우동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","IM뱅크구암동지점","북구 구암로32길 6-20 (구암동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","신구암경로당","북구 태암로18길 12 (구암동)","특정계층 이용시설",false,null,null,null,""],
  ["북구","함지노인복지관","북구 동암로 180","특정계층 이용시설",false,null,null,null,""],
  ["북구","강북소방서","북구 구암서로 71 (구암동)","공공시설",true,[540,1080,31],[540,1080,96],null,""],
  ["북구","IM뱅크학정로지점","북구 학정로 432","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","구암제1경로당","북구 구암로54길 5","특정계층 이용시설",false,null,null,null,""],
  ["북구","구암동행정복지센터","북구 구암서로 32 (구암동)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","구암동주민자치센터","북구 구암서로 32 (구암동)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","동천동주민센터","북구 대천로 81 (동천동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","동천동행정복지센터","북구 대천로 81 (동천동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","IM뱅크칠곡지점","북구 칠곡중앙대로 451 (관음동)","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","북구어울아트센터","북구 구암로 47 (어울아트센터)","공공시설",true,[540,960,31],null,null,""],
  ["북구","관음동행정복지센터","북구 관음동로 125 (관음동 행정복지센터)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","강북노인복지관","북구 칠곡중앙대로91길 21 (강북노인복지회관)","특정계층 이용시설",false,null,null,null,""],
  ["북구","선린종합사회복지관","북구 관음동로9길 10-25 (관음동)","공공시설",true,[540,960,31],null,null,""],
  ["북구","태전1동경로당","북구 태전로7길 10-24 (태전동)","특정계층 이용시설",false,null,null,null,""],
  ["북구","태전1동행정복지센터","북구 태전로7길 10-24 (태전동)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","태전2동행정복지센터","북구 칠곡중앙대로52길 32 (태전동)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","태전휴먼시아아파트경로당","북구 매전로 73 (태전휴먼시아1단지104동)","특정계층 이용시설",false,null,null,null,""],
  ["북구","새마을경로당","북구 태암로5길 12 (태전동)","특정계층 이용시설",false,null,null,null,""],
  ["북구","IM뱅크태전동지점","북구 칠곡중앙대로 309","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["북구","태전1동주민자치센터","북구 태전로7길 10-24 (태전동)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","태전119안전센터","북구 칠곡중앙대로 184 (태전동)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","관문동주민자치센터","북구 도매시장중로 1 (관리동 (관문동행정복지센터))","공공시설",true,[540,1080,31],null,null,""],
  ["북구","관문동행정복지센터","북구 도매시장중로 1 (관리동 (관문동행정복지센터))","공공시설",true,[540,1080,31],null,null,""],
  ["북구","관문동행정복지센터금호분소","북구 한강로4길 1 (사수동)","공공시설",true,[540,1080,31],null,null,""],
  ["북구","연경경로당","북구 도덕길 175","특정계층 이용시설",false,null,null,null,""],
  ["수성구","iM뱅크수성구청지점","수성구 달구벌대로 2450 (범어동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","범어1동행정복지센터","수성구 범어천로 97","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3533"],
  ["수성구","iM뱅크동대구로지점","수성구 동대구로 382 (범어동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","범어2동행정복지센터","수성구 달구벌대로489안길 47 (범어동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3552"],
  ["수성구","범어1동제1경로당","수성구 동대구로54길 7 (범어동)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","홀트대구종합복지관","수성구 달구벌대로488길 13 , 홀트종합사회복지관 (범어동)","공공시설",true,[540,1080,31],null,null,"053-666-2516"],
  ["수성구","범어2동제1경로당","수성구 동원로11길 14 (범어동)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","국민건강보험공단대구수성지사","수성구 상록로 13 (건강보험대구수성지사)","공공시설",true,[540,1080,31],null,null,"053-666-3571"],
  ["수성구","동대구농협본점","수성구 달구벌대로 2487 (범어동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","범어1동제2경로당","수성구 청솔로16길 35","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","범어2동제2경로당","수성구 동대구로80길 73-3","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","범어3동제1경로당","수성구 들안로78길 46 (범어동)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","iM뱅크범어동지점","수성구 달구벌대로 2387 (범어동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","KB국민은행범어동","수성구 달구벌대로 2470 , 동신건물사옥 (범어동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","범어3동행정복지센터","수성구 상록로 42 (범어동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3571"],
  ["수성구","범어4동행정복지센터","수성구 달구벌대로504길 26 (범어동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3597"],
  ["수성구","범어4동제1경로당","수성구 청호로85길 46 (범어4동경로당)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","유신경로당","수성구 청호로88안길 29-3","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","범어4동제2경로당","수성구 범어로20길 24-1","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","범어4동주민자치센터","수성구 범어로20길 97 (범어동)","공공시설",true,[540,1080,31],null,null,"053-666-3597"],
  ["수성구","범어도서관","수성구 달구벌대로 2451","공공시설",true,[540,1320,30],[540,1020,96],null,"053-666-2891"],
  ["수성구","수성구청","수성구 달구벌대로 2450 (수성구청)","공공시설",true,[0,1440,127],[0,1440,96],null,"053-666-2891"],
  ["수성구","지장경로당","수성구 무열로 65-1","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","iM뱅크메트로팔레스지점","수성구 동원로 135 (만촌동, 메트로팔레스)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","만촌1동행정복지센터","수성구 국채보상로 1001 (만촌1동행정복지센터)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3614"],
  ["수성구","두봉골경로당","수성구 달구벌대로522길 121-20","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","만촌3동행정복지센터","수성구 교학로2길 45 (만촌동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3653"],
  ["수성구","만촌1동제1경로당","수성구 만촌로24길 37-20","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","느지경로당","수성구 화랑로40길 46","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","샘골경로당","수성구 공경로2길 21","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","각계경로당","수성구 달구벌대로530길 146","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","두리봉경로당","수성구 달구벌대로530길 92","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","만촌2동행정복지센터","수성구 만촌로 67 (만촌2동행정복지센터)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3635"],
  ["수성구","만촌2동만촌경로당","수성구 동원로6길 50-13 (만촌동)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","만촌119안전센터","수성구 달구벌대로 2658 (만촌동)","공공시설",true,[540,1080,127],null,null,"053-666-2891"],
  ["수성구","iM뱅크만촌역지점","수성구 달구벌대로 2626 (만촌동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","만촌3동제1경로당","수성구 달구벌대로526안길 6 (만촌동)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","무열로119안전센터","수성구 무열로 139 (만촌동)","공공시설",true,[540,1080,127],null,null,"053-666-2891"],
  ["수성구","수성1가제1경로당","수성구 수성로53길 50-4","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","수성1가동행정복지센터","수성구 명덕로73길 7 (수성1가동행정복지센터)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3671"],
  ["수성구","수성1가제2경로당","수성구 달구벌대로456길 11","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","iM뱅크본점영업부","수성구 달구벌대로 2310 , 대구은행본점 (수성동2가)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","수성2가참마음경로당","수성구 수성로60길 45-1","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","열린경로당","수성구 명덕로 405-4 (수성동2가)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","한마음경로당","수성구 들안로52길 35-1","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","수성2.3가동행정복지센터","수성구 명덕로 443-2 (수성동3가)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3692"],
  ["수성구","Sh수협은행경북지역금융본부","수성구 달구벌대로 2348 (수성동3가)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","수성4가경로당","수성구 범어천로 151 (수성동4가)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","수성4가동행정복지센터","수성구 들안로67길 64 , 수성4가동주민센터 (수성동4가)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3717"],
  ["수성구","신천경로당","수성구 신천동로88길 1-15","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","미수경로당","수성구 들안로81길 29 (수성동4가)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","iM뱅크황금네거리지점","수성구 동대구로 111 , 황금빌딩 (황금동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","황금복지관","수성구 청수로45길 41","공공시설",true,[540,1080,31],null,null,"053-666-2516"],
  ["수성구","황금2동행정복지센터","수성구 청솔로2길 64 (황금동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3761"],
  ["수성구","황금2동제2경로당","수성구 들안로40안길 7-20 (황금동)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","iM뱅크황금동지점","수성구 청수로 235 (황금동, 캐슬골드파크 2단지)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","황금1동행정복지센터","수성구 청호로57길 10 (황금동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3731"],
  ["수성구","황금2동제1경로당","수성구 희망로36길 32","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","NH농협은행대구중동금융센터","수성구 희망로 124 (중동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","중동중부리경로당","수성구 수성로52안길 7-10 (중동)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","상록수경로당","수성구 들안로29길 26-18","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","중동행정복지센터","수성구 수성로50길 38 (중동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3773"],
  ["수성구","수성구보건소","수성구 수성로 213 (수성구보건소)","공공시설",true,[540,1080,31],null,null,"053-666-2891"],
  ["수성구","iM뱅크중동지점","수성구 수성로 248 (중동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","중동경로당","수성구 수성로39안길 5","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","상동행정복지센터","수성구 들안로9길 56 , 상동주민센터 (상동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3795"],
  ["수성구","한들경로당","수성구 수성로32길 99","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","덕화경로당","수성구 수성로14길 72-1","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","상동제2경로당","수성구 수성로15길 42-6","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","상동공원경로당","수성구 들안로13길 118","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","iM뱅크파동지점","수성구 수성로 5 (상동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","상동119안전센터","수성구 파동로51길 5 (파동)","공공시설",true,[540,1080,127],null,[1080,1320,127],"053-666-2891"],
  ["수성구","파동제2경로당","수성구 파동로18길 56 (파동)","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","파동우체국","수성구 파동로 59 (파동)","공공시설",true,[540,960,31],null,null,"053-666-3822"],
  ["수성구","파동평생학습센터","수성구 파동로3길 62 (파동)","공공시설",true,[540,1080,31],null,null,"053-666-2891"],
  ["수성구","두레새마을금고","수성구 파동로 189 (파동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","파동행정복지센터","수성구 파동로22길 7","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3822"],
  ["수성구","대구장애인종합복지관","수성구 파동로51길 26-17 (대구장애인종합복지관)","공공시설",true,[540,1080,31],[540,1020,32],null,"053-803-6763"],
  ["수성구","파동제1경로당","수성구 파동로38길 45-13","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","두산제1경로당","수성구 지범로 21-11","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","두산경로당","수성구 들안로8길 68-5 (두산동)","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","두산동행정복지센터","수성구 상화로 95","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3832"],
  ["수성구","거성경로당","수성구 용학로48길 25-1 (지산동)","특정계층 이용시설",false,null,null,null,"053-666-3873"],
  ["수성구","수동경로당","수성구 지범로31안길 3-14","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","새마을경로당","수성구 무학로31길 23 (지산동)","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","지산무학경로당","수성구 청수로38길 53-11","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","지산2동경로당","수성구 용학로33길 17-16 (지산동)","특정계층 이용시설",false,null,null,null,"053-666-3873"],
  ["수성구","지산1동경로당","수성구 지산로11길 6-19","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","황금119안전센터","수성구 동대구로12길 41 (지산동)","공공시설",true,[540,1080,127],null,[1080,1320,127],"053-666-2891"],
  ["수성구","지산1동행정복지센터","수성구 지범로21길 16 (지산동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3855"],
  ["수성구","지산2동행정복지센터","수성구 용학로33길 9 (지산동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3884"],
  ["수성구","범물종합사회복지관","수성구 범안로 79 (범물동, 범물용지아파트)","공공시설",true,[540,1080,31],null,null,"053-666-2516"],
  ["수성구","범물1동행정복지센터","수성구 범안로 76 (범물동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3893"],
  ["수성구","범물공원경로당","수성구 지범로 232 (범물동)","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","범물2동행정복지센터","수성구 범안로 52 (범물동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3914"],
  ["수성구","범물2동경로당","수성구 지범로48길 14-1 (범물동)","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","iM뱅크지산지점","수성구 지범로 188 (범물동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","용학도서관","수성구 지범로41길 36","공공시설",true,[540,1320,126],null,null,"053-666-2891"],
  ["수성구","범물노인복지관","수성구 범안로 99","특정계층 이용시설",false,null,null,null,"053-666-2516"],
  ["수성구","범물경로당","수성구 범안로16길 46","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","범물119안전센터","수성구 청호로 87","공공시설",true,[540,1080,127],null,[1080,1320,127],"053-666-2891"],
  ["수성구","시지경로당","수성구 달구벌대로619길 2 (시지동)","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","고산2동행정복지센터","수성구 달구벌대로 3091 (시지동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3953"],
  ["수성구","iM뱅크노변지점","수성구 시지로 55 (시지동, 고산노변타운)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","매호경로당","수성구 천을로31길 40 (매호경로당)","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","고산3동행정복지센터","수성구 고산로 152 (고산3동행정복지센터)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3987"],
  ["수성구","매호공원경로당","수성구 천을로23길 5","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","성동경로당","수성구 성동로 166","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","사월동경로당","수성구 달구벌대로 3321-4","특정계층 이용시설",false,null,null,null,"053-666-2610"],
  ["수성구","욱수공원노인정","수성구 달구벌대로650길 59-6 (신매동)","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","두리공원경로당","수성구 고산로4안길 31","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","고산119안전센터","수성구 고산로 105 (신매동)","공공시설",true,[540,1080,127],null,[1080,1320,127],"053-666-2891"],
  ["수성구","고산노인복지관","수성구 욱수천로 99 (고산권보건복지센터)","특정계층 이용시설",false,null,null,null,"053-666-2516"],
  ["수성구","iM뱅크시지지점","수성구 달구벌대로 3196 (신매동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-666-2891"],
  ["수성구","고산1동행정복지센터","수성구 달구벌대로 3260-2 (신매동)","공공시설",true,[540,1080,31],[600,1080,96],null,"053-666-3941"],
  ["수성구","고산건강생활지원센터","수성구 욱수천로 99 (고산권보건복지센터)","공공시설",true,[540,1080,31],null,null,"053-666-2891"],
  ["수성구","고산도서관","수성구 달구벌대로650길 6 (신매동)","공공시설",true,[540,1320,30],[540,1020,96],null,"053-666-2891"],
  ["수성구","신매경로당","수성구 욱수천로 78","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","욱수동경로당","수성구 욱수천로 15","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","청곡복지관","수성구 노변공원로 49-1 (청곡사회복지관)","공공시설",true,[540,1080,31],null,null,"053-666-2516"],
  ["수성구","노변경로당","수성구 노변로 77","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","삼덕경로당","수성구 범안로64길 18-11","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","연호동제2경로당","수성구 달구벌대로569길 20 (연호동)","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","연호경로당","수성구 범안로91길 70","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","이천경로당","수성구 달구벌대로574길 192-1 (이천경로당)","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","고모경로당","수성구 고모로39길 20","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","팔현경로당","수성구 팔현길 88-5","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","가천경로당","수성구 고모로24길 25 (가천경로당)","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["수성구","대흥경로당","수성구 월드컵로6길 54","특정계층 이용시설",false,null,null,null,"053-666-2569"],
  ["달서구","성당경로당","달서구 장기로10안길 15 (성당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","성당동제3경로당","달서구 야외음악당로2길 3 (성당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","서대구농협성당지점","달서구 구마로 255 (성당동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","성당동제2경로당","달서구 야외음악당로9길 45 (성당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","원화경로당","달서구 장기로26길 81 (성당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","성당동행정복지센터","달서구 야외음악당로 38 (성당동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","성당동제1경로당","달서구 대명천로12안길 47 (성당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","삼성경로당","달서구 성당로33안길 23 (성당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","달서구건강가정다문화가족지원센터","달서구 야외음악당로13길 60","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","아이엠뱅크광장지점","달서구 달구벌대로 1698","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","두류1동경로당","달서구 두류남6길 16 (두류동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","국민건강보험공단대구경북지역본부","달서구 두류공원로 264 (국민건강보험공단대구경북지역본부)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","삼익신협본점","달서구 달구벌대로 1862","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","금봉경로당","달서구 야외음악당로39서길 91-10","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","신촌경로당","달서구 밤골4길 17 (두류동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","삼익신협두류지점","달서구 달구벌대로 1720 (두류동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","두류3동경로당","달서구 야외음악당로39길 54 (두류동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","두류1.2동행정복지센터","달서구 두류길 141-8 (두류동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","대성경로당","달서구 두류공원로50길 34 (두류동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","두류3동행정복지센터","달서구 야외음악당로39길 24 (두류동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","국민건강보험공단대구달서지사","달서구 달구벌대로 1686","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","성산경로당","달서구 서당로3길 19-10 (신당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","와룡경로당","달서구 성서서로75길 17-7 (신당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","당산경로당","달서구 선원로15안길 41 (신당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","신서경로당","달서구 서당로9길 34-18 (신당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","신당동행정복지센터","달서구 선원로 60 (신당동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","KEB하나은행성서공단지점","달서구 달구벌대로 1130 (신당동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","삼우경로당","달서구 서당로7길 33-16 (신당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","신당경로당","달서구 서당로12길 15 (신당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","오정경로당","달서구 성서서로73길 57 (신당동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","아이엠뱅크계명대지점","달서구 달구벌대로 1095 (계명대학교)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","국민연금공단대구지역본부","달서구 성서로 419","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","성서경로당","달서구 성서로72길 97-13 (이곡동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","이곡2동행정복지센터","달서구 계대동문로 77 (이곡동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","아이엠뱅크이곡동지점","달서구 계대동문로 124 (이곡동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","국민은행성서지점","달서구 계대동문로 116 (이곡동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","이곡1동행정복지센터","달서구 달구벌대로 1309 (이곡동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","늘품경로당","달서구 선원로33길 79-8 (이곡동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","아이엠뱅크성서영업부","달서구 달구벌대로 1276 (이곡동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","달서새마을금고","달서구 계대동문로 92 (이곡동)","생활밀착 민간시설",true,[540,1020,31],null,null,"053-667-3442"],
  ["달서구","이곡경로당","달서구 이곡공원로1길 7","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","배실경로당","달서구 선원로23남길 54 (이곡동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","장동경로당","달서구 성서공단로61길 45 (장동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","궁전경로당","달서구 장기로 221-6 (장기동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","능골경로당","달서구 성서동로60길 16 (장기동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","장기동행정복지센터","달서구 장기로 277 (장기동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","장기경로당","달서구 문화회관2길 18 (장기동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","서촌경로당","달서구 새방로 23-16 (용산동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","용산2동행정복지센터","달서구 선원로 278 (용산동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","지역농협신용산지점","달서구 용산로 226 (용산동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","아이엠뱅크용산동지점","달서구 용산로 235 (용산동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","용산1동행정복지센터","달서구 용산로 212-7 (용산동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","삼익신협용산지점","달서구 평리로 64 (용산동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","용산경로당","달서구 와룡로57길 100 (용산동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","새동네경로당","달서구 성지로16길 45 (용산동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","영웅재가복지센터","달서구 성지로 52","특정계층 이용시설",false,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","성서노인종합복지관","달서구 선원로 203","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","춘추경로당","달서구 와룡로49길 18-17 (죽전동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","죽전경로당","달서구 와룡로52안길 45 (죽전동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","죽전동행정복지센터","달서구 와룡로56길 26 (죽전동행정복지센터)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","성서농협(죽전동지점)","달서구 달구벌대로 1573 (죽전동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","감삼농림경로당","달서구 당산로41서길 22-5 (감삼동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","감삼제3경로당","달서구 달구벌대로330길 31","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","감삼동행정복지센터","달서구 감삼북길 119-10","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","감삼제1경로당","달서구 감삼남6길 41-1 (감삼동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","감삼제2경로당","달서구 감삼1길 96 (감삼동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","아이엠뱅크죽전지점","달서구 달구벌대로 1568 (감삼동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","본리경로당","달서구 용산로4안길 23","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","아이엠뱅크성당뉴타운지점","달서구 당산로 39 (본리동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","본리동행정복지센터","달서구 당산로 37-14 (본리동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","삼리경로당","달서구 와룡로24길 34 (본리동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","월상경로당","달서구 상원로13길 23-17 (상인동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","월평경로당","달서구 월배로40길 27-21 (상인동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","월촌경로당","달서구 상인서로10길 42-1","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","상인1동행정복지센터","달서구 상인서로 40","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","아이엠뱅크상인역지점","달서구 월곡로 266 (상인동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","상인자이아파트경로당","달서구 상원로 142 (상인동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","국민은행상인역지점","달서구 월배로 250 (대구교통공사)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","하나은행상인동지점","달서구 월배로 219 (상인동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","상인2동경로당","달서구 월곡로53서길 70 (상인동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","상인3동행정복지센터","달서구 상인로 25 (상인동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","채정경로당","달서구 상인로9안길 69 (상인동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","상인2동행정복지센터","달서구 상원로 27 (상인동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","월곡경로당","달서구 월곡로27길 30 (상인동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","한실들2차경로당","달서구 한실로 49 (한실들마을 501동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","사계절경로당","달서구 한실로 117 (도원동, 대곡사계절타운)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","강산경로당","달서구 도원로 45 (대곡강산타운 440동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","가람2차경로당","달서구 한실로 135 (도원동, 가람마을)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","가람1차경로당","달서구 한실로 135 (도원동, 가람마을)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","도원경로당","달서구 수밭길 46 (도원동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","아이엠뱅크대곡지점","달서구 도원로 29 (도원동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","별메경로당","달서구 도원로 46 (별메마을 관리실)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","한실들1차경로당","달서구 한실로 49 (도원동, 한실들마을)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","아람경로당","달서구 한실로 30 (도원동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","서한이다음경로당","달서구 상화로58길 35 (서한 이다음 레이크뷰 106동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","도원동행정복지센터","달서구 한실로 53 (도원동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","산새경로당","달서구 도원남로 40 (산새마을)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","롯데캐슬경로당","달서구 상화로58길 86 (롯데캐슬레이크 109동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","미리샘경로당","달서구 한실로 134 (미리샘마을 208동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","나래경로당","달서구 한실로 29 (나래마을)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","동백만수당경로당","달서구 월배로32안길 35 (동백맨션 상가동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","월진경로당","달서구 월배로 117 (진천동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","신정경로당","달서구 상화로9길 81-17 (진천동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","아이엠뱅크월배영업부","달서구 월배로 109 (진천동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","진천경로당","달서구 상화북로 46-1 (진천동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","월배경로당","달서구 상화로7길 121 (진천동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","진천동행정복지센터","달서구 진천로9길 33","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","유천동행정복지센터","달서구 조암로 175 (유천동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","수복정경로당","달서구 학산로7길 39","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","아이엠뱅크신월성지점","달서구 조암로 5","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","학산경로당","달서구 월성로 77 (월성동, 월성주공아파트2단지)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","월성보성경로당","달서구 학산로 30 (월성동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","월성1동행정복지센터","달서구 조암로5길 5-12 (월성1동행정복지센터)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","래미안월성경로당","달서구 상원로 143 (월성동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","아이엠뱅크(월성동지점)","달서구 월성로 30 (월성동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","월성2동행정복지센터","달서구 월성로 65 (월성동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","학산종합사회복지관(만수정)","달서구 월성로 77 (월성동, 월성주공아파트2단지)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","아이엠뱅크(성서공단영업부)","달서구 성서공단로 124 (월암동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","IBK기업은행(성서공단지점)","달서구 성서공단로 126 (월암동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","솔고개경로당","달서구 월배로67안길 14 (송현동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","송현경로당","달서구 구마로52안길 18 (송현동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","본동종합사회복지관","달서구 송현로 113 (송현동)","공공시설",true,[600,1020,31],null,null,"053-667-3442"],
  ["달서구","소나무경로당","달서구 송현동4길 31","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","송공경로당","달서구 월배로68안길 43-7 (송현동)","특정계층 이용시설",false,null,null,null,"053-667-3445"],
  ["달서구","축협송현지점","달서구 송현로 34 (송현동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","아이엠뱅크월촌역지점","달서구 월배로 322 (송현동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","구암경로당","달서구 월배로75길 50-12 (송현동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","송현2동행정복지센터","달서구 월배로83길 120-14 (송현동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","대남경로당","달서구 앞산순환로39안길 11 (송현동)","특정계층 이용시설",false,null,null,null,"053-667-3445"],
  ["달서구","송영경로당","달서구 중흥로16길 84-12 (송현동)","특정계층 이용시설",false,null,null,null,"053-667-3445"],
  ["달서구","송현1동행정복지센터","달서구 중흥로8길 41 (송현동)","공공시설",true,[540,1080,31],null,null,"053-667-3445"],
  ["달서구","본동경로당","달서구 와룡로4길 19 (본동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","청구그린2차경로당","달서구 구마로36길 20 (본동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","노인종합복지관","달서구 학산로 140 (본동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","가무내경로당","달서구 학산로19길 55 (본동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","월성주공5단지경로당","달서구 구마로12길 89 (월성주공5단지아파트 주민복지관)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","본동행정복지센터","달서구 구마로26길 62 (본동)","공공시설",true,[540,1080,31],null,null,"053-667-3442"],
  ["달서구","아이엠뱅크본리동지점","달서구 구마로 180 (본동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달서구","산호경로당","달서구 달구벌대로203길 3 (호산동)","특정계층 이용시설",false,null,null,null,"053-667-3442"],
  ["달서구","아이엠뱅크성서3단지영업부","달서구 성서공단북로 132 (호산동)","생활밀착 민간시설",true,[540,960,31],null,null,"053-667-3442"],
  ["달성군","천내14리경로당","달성군 화원읍 화원로1길 15-7","특정계층 이용시설",false,null,null,null,""],
  ["달성군","IM뱅크(화원지점)","달성군 화원읍 비슬로 2597","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["달성군","화원읍농협(본점)","달성군 화원읍 비슬로 2575","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["달성군","천내8리경로당","달성군 화원읍 비슬로525길 37 (평광아파트)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","천내12리경로당","달성군 화원읍 화원로 37 (천내보성타운)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","천내5리경로당","달성군 화원읍 비슬로525길 21 (동서동산아파트)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","천내2리경로당","달성군 화원읍 인흥길 17-8","특정계층 이용시설",false,null,null,null,""],
  ["달성군","화원읍농협(동부지점)","달성군 화원읍 화원로1길 1","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["달성군","천내11리경로당","달성군 화원읍 화원로 36 (창신맨션)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","천내9리경로당","달성군 화원읍 화원로 26 (천내우방맨션)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","천내1리경로당","달성군 화원읍 명천로33길 12","특정계층 이용시설",false,null,null,null,""],
  ["달성군","천내3리경로당","달성군 화원읍 명천로19길 29-3 (천내3리새마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","천내13리경로당","달성군 화원읍 화원로7길 50-21","특정계층 이용시설",false,null,null,null,""],
  ["달성군","화원읍새마을금고","달성군 화원읍 비슬로 2576","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["달성군","천내6리경로당","달성군 화원읍 비슬로525길 2 (평광현대아파트 103동)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","구라6리경로당","달성군 화원읍비슬로539길 17","특정계층 이용시설",false,null,null,null,""],
  ["달성군","구라5리경로당","달성군 화원읍 비슬로 2715 (청구청룡맨션)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","성산3리경로당","달성군 화원읍 사문진로1길 6","특정계층 이용시설",false,null,null,null,""],
  ["달성군","천내15리경로당","달성군 화원읍 사문진로6길 17 (한샘타운)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","성산6리경로당","달성군 화원읍 사문진로 349 (화원삼주타운)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","설화1리경로당","달성군 화원읍 류목정길 42 , 설화리회관","특정계층 이용시설",false,null,null,null,""],
  ["달성군","화원읍보건지소","달성군 화원읍 화암로 10","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","화원읍행정복지센터","달성군 화원읍 화암로 10","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","화원읍농협(명곡지점)","달성군 화원읍 화암로 71","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["달성군","명곡3리경로당","달성군 화원읍 명곡로 11 (명곡미래빌 1단지)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","명곡4리경로당","달성군 화원읍 명천로 231 (명곡미래빌 2단지)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","명곡7리경로당","달성군 화원읍 명천로 243 (명곡역미래빌5단지505동)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","명곡5리경로당","달성군 화원읍 명곡로 30 (명곡미래빌3단지)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","명곡6리경로당","달성군 화원읍 화암로 120 (명곡미래빌4단지)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","명곡1리경로당","달성군 화원읍 명곡로22길 12","특정계층 이용시설",false,null,null,null,""],
  ["달성군","명곡2리경로당","달성군 화원읍 비슬로500길 7","특정계층 이용시설",false,null,null,null,""],
  ["달성군","화원119안전센터","달성군 화원읍 화암로 122","공공시설",true,[540,1080,127],[600,1320,96],[1080,1320,127],""],
  ["달성군","본리1리경로당","달성군 화원읍 인흥2길 91","특정계층 이용시설",false,null,null,null,""],
  ["달성군","본리2리경로당","달성군 화원읍 마비정길 268","특정계층 이용시설",false,null,null,null,"053-668-2994"],
  ["달성군","본리5리경로당","달성군 화원읍 명천로 57 (대곡역그린빌)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","본리4리경로당","달성군 화원읍 비슬로532길 27-56, 본리4리경노당","특정계층 이용시설",false,null,null,null,""],
  ["달성군","노이2리경로당","달성군 논공읍 노이길 205","특정계층 이용시설",false,null,null,null,""],
  ["달성군","노이1리경로당","달성군 논공읍 노이길 408","특정계층 이용시설",false,null,null,null,""],
  ["달성군","달성새마을금고(논공)","달성군 논공읍 비슬로 1777","생활밀착 민간시설",true,[540,1080,31],null,null,""],
  ["달성군","금포1리경로회관","달성군 논공읍 금포새터길 23","특정계층 이용시설",false,null,null,null,""],
  ["달성군","금포3리경로당","달성군 논공읍 금포새터길 1","특정계층 이용시설",false,null,null,null,""],
  ["달성군","논공읍행정복지센터","달성군 논공읍 비슬로 1779","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","국민건강보험공단달성고령지사1층로비","달성군 논공읍 달성군청로 32","공공시설",true,[540,1080,31],null,null,"053-668-2994"],
  ["달성군","금포2리경로당","달성군 논공읍 비슬로359길 33","특정계층 이용시설",false,null,null,null,""],
  ["달성군","삼리2리경로당","달성군 논공읍 안씩실길 61-1","특정계층 이용시설",false,null,null,null,""],
  ["달성군","삼리1리노인회관","달성군 논공읍 삼리1길 14","특정계층 이용시설",false,null,null,null,""],
  ["달성군","위천1리경로당","달성군 논공읍 위천1길 6","특정계층 이용시설",false,null,null,null,""],
  ["달성군","하1리경로당","달성군 논공읍 약산덧재2길 2","특정계층 이용시설",false,null,null,null,""],
  ["달성군","성요셉병원","달성군 논공읍 논공로 210","생활밀착 민간시설",true,[540,1080,31],null,null,""],
  ["달성군","달성군장애인복지관","달성군 논공읍 논공로 242 (달성장애인복지관)","공공시설",true,[540,1020,31],null,null,"053-668-2994"],
  ["달성군","남7리경로당","달성군 논공읍 남리길 7 (평광아파트)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","남2리경로당","달성군 논공읍 논공로7길 30-9","특정계층 이용시설",false,null,null,null,""],
  ["달성군","논공읍농협(남부지점)","달성군 논공읍 논공중앙로 114","생활밀착 민간시설",true,[540,1080,31],null,null,""],
  ["달성군","논공공단출장소","달성군 논공읍 논공중앙로33길 3","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","북5리경로당","달성군 논공읍 논공로7길 73 (논공청구APT)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","북7리경로당","달성군 논공읍 논공로23길 14 (논공성원아파트)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","달성군종합사회복지관","달성군 논공읍 논공로 697-9","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","북1리경로당","달성군 논공읍 북리2길 10-10","특정계층 이용시설",false,null,null,null,""],
  ["달성군","북3리경로당","달성군 논공읍 용호로 6 (평광현대APT)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","논공119안전센터","달성군 논공읍 논공중앙로33길 5","공공시설",true,[540,1080,127],null,null,""],
  ["달성군","이천리경로당","달성군 다사읍 다사로69길 72-2","특정계층 이용시설",false,null,null,null,""],
  ["달성군","달천리경로당","달성군 다사읍 다사로 494","특정계층 이용시설",false,null,null,null,""],
  ["달성군","박곡리경로당","달성군 다사읍 다사로109길 41","특정계층 이용시설",false,null,null,null,""],
  ["달성군","서재5리경로당","달성군 다사읍 서재로30길 7","특정계층 이용시설",false,null,null,null,""],
  ["달성군","서재3리경로당","달성군 다사읍 서재로 120 (서재화진금봉타운 관리실)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","서재4리경로당","달성군 다사읍 서재로30길 17 (서재보성타운 노인정)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","서재행복문화센터","달성군 다사읍 서재로18길 3-1","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","서재6리경로당","달성군 다사읍 서재로28길 39","특정계층 이용시설",false,null,null,null,""],
  ["달성군","서재1리경로당","달성군 다사읍 서재본2길 3","특정계층 이용시설",false,null,null,null,""],
  ["달성군","서재2리경로당","달성군 다사읍 서재로18길 5","특정계층 이용시설",false,null,null,null,""],
  ["달성군","다사서재출장소","달성군 다사읍 서재본길 25","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","다사농협(서재지점)","달성군 다사읍 서재로 129","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["달성군","세천리경로당","달성군 다사읍 세천본길 18-4","특정계층 이용시설",false,null,null,null,""],
  ["달성군","다사119안전센터","달성군 다사읍 달구벌대로 920","공공시설",true,[540,1080,127],[600,1320,96],[1080,1320,127],""],
  ["달성군","달성군립도서관","달성군 다사읍 달구벌대로174길 10-13","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","죽곡3리경로당","달성군 다사읍 달구벌대로 842-7","특정계층 이용시설",false,null,null,null,""],
  ["달성군","죽곡2리경로당","달성군 다사읍 강정길 30","특정계층 이용시설",false,null,null,null,""],
  ["달성군","죽곡4리경로당","달성군 다사읍 죽곡2길 6 (강창태성그린시티 관리실)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","죽곡5리경로당","달성군 다사읍 달구벌대로 812 (강창하이츠 102동)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","다사농협(대실지점)","달성군 다사읍 대실역남로 34","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["달성군","매곡119안전센터","달성군 다사읍 달구벌대로 753","공공시설",true,[540,1080,127],[600,1320,96],[1080,1320,127],""],
  ["달성군","다사농협(죽곡지점)","달성군 다사읍 대실역북로 11","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["달성군","IM뱅크(다사지점)","달성군 다사읍 달구벌대로 879","생활밀착 민간시설",true,[540,960,31],null,null,""],
  ["달성군","매곡8리경로당","달성군 다사읍 달구벌대로 802 (태왕드림하이츠 103동)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","다사읍보건지소","달성군 다사읍 매곡로 7","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","다사읍주민자치센터","달성군 다사읍 매곡로12길 37","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","매곡2리경로당","달성군 다사읍 다사로4길 1-16","특정계층 이용시설",false,null,null,null,""],
  ["달성군","매곡3리경로당","달성군 다사읍 왕선로 49 (강창동서아파트 104동)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","다사읍행정복지센터","달성군 다사읍 매곡로 7","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","매곡6리경로당","달성군 다사읍 달구벌대로 770","특정계층 이용시설",false,null,null,null,""],
  ["달성군","매곡1리경로당","달성군 다사읍 매곡안길 14","특정계층 이용시설",false,null,null,null,""],
  ["달성군","매곡4리경로당","달성군 다사읍 달구벌대로 790 (강창1차삼산타운 103동)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","부곡리경로당","달성군 다사읍 부곡2길 7-1","특정계층 이용시설",false,null,null,null,""],
  ["달성군","장귀미경로당","달성군 다사읍 장귀미길 50","특정계층 이용시설",false,null,null,null,""],
  ["달성군","문산리경로당","달성군 다사읍 달구벌대로92길 56","특정계층 이용시설",false,null,null,null,""],
  ["달성군","음리보건진료소","달성군 유가읍 음동1길 9","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","음리경로당","달성군 유가읍 음동길 79 (음리회관)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","양1리경로당","달성군 유가읍 휴양림2길 25-5","특정계층 이용시설",false,null,null,null,""],
  ["달성군","양2리경로당","달성군 유가읍 유가사1길 3-3","특정계층 이용시설",false,null,null,null,""],
  ["달성군","용3리경로당","달성군 유가읍 휴양림길 180-17","특정계층 이용시설",false,null,null,null,""],
  ["달성군","용2리경로당","달성군 유가읍 용리길 12","특정계층 이용시설",false,null,null,null,""],
  ["달성군","유가읍행정복지센터","달성군 유가읍 테크노상업로 95","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","쌍계1리경로당","달성군 유가읍유가북길 46-57","특정계층 이용시설",false,null,null,null,""],
  ["달성군","쌍계2리경로당","달성군 유가읍 테크노순환로 440","특정계층 이용시설",false,null,null,null,""],
  ["달성군","초곡리경로당","달성군 유가읍 유가북길 222","특정계층 이용시설",false,null,null,null,""],
  ["달성군","유곡1리경로당","달성군 유가읍 유곡길 53","특정계층 이용시설",false,null,null,null,""],
  ["달성군","유곡2리경로당","달성군 유가읍 유가길 49","특정계층 이용시설",false,null,null,null,""],
  ["달성군","도의3리경로당","달성군 유가읍 도의길 92","특정계층 이용시설",false,null,null,null,""],
  ["달성군","도의2리경로당","달성군 유가읍도의1길 6","특정계층 이용시설",false,null,null,null,""],
  ["달성군","도의1리경로당","달성군 유가읍 도의길 193","특정계층 이용시설",false,null,null,null,""],
  ["달성군","가태1리경로당","달성군 유가읍 가태길 54","특정계층 이용시설",false,null,null,null,""],
  ["달성군","한정3리경로당","달성군 유가읍 비슬로34길 12","특정계층 이용시설",false,null,null,null,""],
  ["달성군","한정보건진료소","달성군 유가읍 달창로26길 17","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","한정1리경로당","달성군 유가읍 달창로26길 115","특정계층 이용시설",false,null,null,null,""],
  ["달성군","한정2리경로당","달성군 유가읍 달창로25길 40","특정계층 이용시설",false,null,null,null,""],
  ["달성군","본말1리경로당","달성군 유가읍달창로 440","특정계층 이용시설",false,null,null,null,""],
  ["달성군","본말2리경로당","달성군 유가읍 개실길 68","특정계층 이용시설",false,null,null,null,""],
  ["달성군","신당리경로당","달성군 옥포읍 신당4길 27","특정계층 이용시설",false,null,null,null,""],
  ["달성군","옥포119안전센터","달성군 옥포읍 돌미로 93","공공시설",true,[540,1080,127],null,null,""],
  ["달성군","교항2리경로당","달성군 옥포읍 금계길 44","특정계층 이용시설",false,null,null,null,""],
  ["달성군","교항1리경로당","달성군 옥포읍다리목중앙길 20","특정계층 이용시설",false,null,null,null,""],
  ["달성군","교항3리경로당","달성군 옥포읍 교항제림길 10 (옥포제림뉴타운)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","강림1리경로당","달성군 옥포읍 강림1길 41","특정계층 이용시설",false,null,null,null,""],
  ["달성군","강림2리경로당","달성군 옥포읍 시저로 33","특정계층 이용시설",false,null,null,null,""],
  ["달성군","송촌리경로당","달성군 옥포읍 송촌길 256","특정계층 이용시설",false,null,null,null,""],
  ["달성군","간경리경로당","달성군 옥포읍 간경길 7 (간경리회관)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","기세리경로당","달성군 옥포읍 옥포로57길 17","특정계층 이용시설",false,null,null,null,""],
  ["달성군","반송1리경로당","달성군 옥포읍 용연사길 35","특정계층 이용시설",false,null,null,null,""],
  ["달성군","반송2리경로당","달성군 옥포읍 반송길 103","특정계층 이용시설",false,null,null,null,""],
  ["달성군","김흥1리경로당(김흥1리회관)","달성군 옥포읍 김흥길 66","특정계층 이용시설",false,null,null,null,""],
  ["달성군","김흥3리경로당","달성군 옥포읍 능전길 88","특정계층 이용시설",false,null,null,null,""],
  ["달성군","김흥2리경로당","달성군 옥포읍 옥포로113길 74","특정계층 이용시설",false,null,null,null,""],
  ["달성군","본리1리경로당(옥포)","달성군 옥포읍 본리로16길 5","특정계층 이용시설",false,null,null,null,""],
  ["달성군","옥포읍행정복지센터","달성군 옥포읍 비슬로 2215","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","본리3리경로당","달성군 옥포읍 본리로 102 (세광무지개마을)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","본리2리경로당(옥포)","달성군 옥포읍 대방길 5","특정계층 이용시설",false,null,null,null,""],
  ["달성군","상2리경로당","달성군 현풍읍현풍동로21길 9","특정계층 이용시설",false,null,null,null,""],
  ["달성군","중2리경로당","달성군 현풍읍 현풍동로 23","특정계층 이용시설",false,null,null,null,""],
  ["달성군","중1리경로당","달성군 현풍읍현풍중앙로14길 76","특정계층 이용시설",false,null,null,null,""],
  ["달성군","부2리경로당","달성군 현풍읍 현풍동로27길 51","특정계층 이용시설",false,null,null,null,""],
  ["달성군","현풍면사무소","달성군 현풍읍비슬로134길 157","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","부1리경로당(부1리노인정)","달성군 현풍읍현풍중앙로16길 31","특정계층 이용시설",false,null,null,null,""],
  ["달성군","부4리경로당","달성군 현풍읍현풍동로29길 19-11","특정계층 이용시설",false,null,null,null,""],
  ["달성군","하리경로당","달성군 현풍읍 현풍중앙로 55-1","특정계층 이용시설",false,null,null,null,""],
  ["달성군","현풍할아버지경로당","달성군 현풍읍현풍로 54","특정계층 이용시설",false,null,null,null,""],
  ["달성군","현풍농협(지점)","달성군 현풍읍 비슬로130길 95","생활밀착 민간시설",true,[540,1080,31],null,null,""],
  ["달성군","성하1리경로당","달성군 현풍읍성하1길 106-5","특정계층 이용시설",false,null,null,null,""],
  ["달성군","성하2리경로당","달성군 현풍읍성하1길 12-4","특정계층 이용시설",false,null,null,null,""],
  ["달성군","성하3리경로당","달성군 현풍읍비슬로136길 17","특정계층 이용시설",false,null,null,null,""],
  ["달성군","원교1리경로당","달성군 현풍읍현풍로8길 42","특정계층 이용시설",false,null,null,null,""],
  ["달성군","원교3리경로당","달성군 현풍읍비슬로120길 13","특정계층 이용시설",false,null,null,null,""],
  ["달성군","원교2리경로당","달성군 현풍읍비슬로130길 30","특정계층 이용시설",false,null,null,null,""],
  ["달성군","현풍119안전센터","달성군 현풍읍 비슬로 480","공공시설",true,[540,1080,127],[600,1320,96],[1080,1320,127],""],
  ["달성군","자모리경로당","달성군 현풍읍 현풍서로91길 46","특정계층 이용시설",false,null,null,null,""],
  ["달성군","오산2리경로당","달성군 현풍읍현풍서로71길 105","특정계층 이용시설",false,null,null,null,""],
  ["달성군","오산1리경로당","달성군 현풍읍현풍서로43길 36","특정계층 이용시설",false,null,null,null,""],
  ["달성군","지2리경로당","달성군 현풍읍지동길 128","특정계층 이용시설",false,null,null,null,""],
  ["달성군","지1리경로당","달성군 현풍읍지동2길 9","특정계층 이용시설",false,null,null,null,""],
  ["달성군","대1리경로당","달성군 현풍읍삼강길 42","특정계층 이용시설",false,null,null,null,""],
  ["달성군","신기리경로당","달성군 현풍읍 국가산단북로100길 120","특정계층 이용시설",false,null,null,null,""],
  ["달성군","구지읍농협","달성군 구지읍 창리로11길 24","생활밀착 민간시설",true,[540,1080,31],null,null,""],
  ["달성군","구지읍새마을금고","달성군 구지읍 창리로11길 58-7","생활밀착 민간시설",true,[540,1080,31],null,null,""],
  ["달성군","구지읍우체국","달성군 구지읍 창리로11길 18","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","구지읍행정복지센터","달성군 구지읍 창리로11길 38","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","구지읍노인회경로당","달성군 구지읍 구지시장길 46-8 (구지면노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","창3리경로당","달성군 구지읍 창리로19길 38","특정계층 이용시설",false,null,null,null,""],
  ["달성군","창2리경로당","달성군 구지읍 창리서로6길 4-3","특정계층 이용시설",false,null,null,null,""],
  ["달성군","창1리경로당","달성군 구지읍 창리로 59","특정계층 이용시설",false,null,null,null,""],
  ["달성군","창4리경로당","달성군 구지읍 구지시장길 34 (창4리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","응암1리경로당","달성군 구지읍 응암길 11","특정계층 이용시설",false,null,null,null,""],
  ["달성군","응암5리경로당(과학마을청아람)","달성군 구지읍 과학마을로 70 (과학마을청아람)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","응암3리경로당(반도유보라)","달성군 구지읍 과학마을로3길 14 (대구국가산단 반도유보라 아이비파크)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","응암4리경로당(화성파크드림)","달성군 구지읍 과학마을로2길 6","특정계층 이용시설",false,null,null,null,""],
  ["달성군","고봉리경로당","달성군 구지읍 구지동로 42 (고봉리회관)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","구지읍농협동부지소","달성군 구지읍 구지동로 47","생활밀착 민간시설",true,[540,1080,31],null,null,""],
  ["달성군","고봉보건진료소","달성군 구지읍 구지동로 47-2","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","가천리경로당","달성군 구지읍 가천1길 55","특정계층 이용시설",false,null,null,null,""],
  ["달성군","평촌1리경로당","달성군 구지읍 구지동로16길 85","특정계층 이용시설",false,null,null,null,""],
  ["달성군","평촌2리경로당","달성군 구지읍 구지동로40길 38-3","특정계층 이용시설",false,null,null,null,""],
  ["달성군","예현리경로당","달성군 구지읍 예현1길 11-9","특정계층 이용시설",false,null,null,null,""],
  ["달성군","유산리경로당","달성군 구지읍 유산길 17","특정계층 이용시설",false,null,null,null,""],
  ["달성군","목단1리경로당","달성군 구지읍 구지남로57길 1","특정계층 이용시설",false,null,null,null,""],
  ["달성군","목단2리경로당","달성군 구지읍 구미마을길 89-2","특정계층 이용시설",false,null,null,null,""],
  ["달성군","대암1리경로당","달성군 구지읍 대암4길 5-5","특정계층 이용시설",false,null,null,null,""],
  ["달성군","대암보건진료소","달성군 구지읍 대암4길 5-3","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","대암2리경로당","달성군 구지읍 대암2길 18","특정계층 이용시설",false,null,null,null,""],
  ["달성군","내리경로당","달성군 구지읍 내리길 47","특정계층 이용시설",false,null,null,null,""],
  ["달성군","구지119안전센터","달성군 구지읍 달성2차로 111","공공시설",true,[540,1080,127],[600,1320,96],[1080,1320,127],""],
  ["달성군","화산리경로당","달성군 구지읍 국가산단북로25길 30-8","특정계층 이용시설",false,null,null,null,""],
  ["달성군","수리1리경로당","달성군 구지읍 국가산단북로23길 54-3","특정계층 이용시설",false,null,null,null,""],
  ["달성군","수리3리경로당","달성군 구지읍 국가산단북로3길 24-6","특정계층 이용시설",false,null,null,null,""],
  ["달성군","수리2리경로당","달성군 구지읍 국가산단북로11길 82","특정계층 이용시설",false,null,null,null,""],
  ["달성군","징리보건진료소","달성군 구지읍 구지서로10길 46","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","징리경로당","달성군 구지읍 구지서로10길 62","특정계층 이용시설",false,null,null,null,""],
  ["달성군","오설리경로당","달성군 구지읍 구지서로60길 62-4","특정계층 이용시설",false,null,null,null,""],
  ["달성군","도동1리경로당","달성군 구지읍 구지서로 712","특정계층 이용시설",false,null,null,null,""],
  ["달성군","도동2리경로당","달성군 구지읍 도동절골길 5","특정계층 이용시설",false,null,null,null,""],
  ["달성군","용계1,3리경로당","달성군 가창면 가창로220길 2","특정계층 이용시설",false,null,null,null,""],
  ["달성군","용계5리경로당","달성군 가창면 가창로 1008 (가창중석타운)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","용계6리경로당","달성군 가창면 가창로216길 25 (주공아파트)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","용계7리경로당","달성군 가창면 가창로216길 55 (국태모닝포유아파트)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","가창면사무소","달성군 가창면 가창로 1100","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","오2리경로당","달성군 가창면 헐티로11길 90","특정계층 이용시설",false,null,null,null,""],
  ["달성군","오1리경로당","달성군 가창면 헐티로10길 27","특정계층 이용시설",false,null,null,null,""],
  ["달성군","정대1리경로당","달성군 가창면 헐티로 498","특정계층 이용시설",false,null,null,null,""],
  ["달성군","정대2리경로당","달성군 가창면 헐티로2길 2","특정계층 이용시설",false,null,null,null,""],
  ["달성군","정대매계경로당","달성군 가창면 헐티로7길 8","특정계층 이용시설",false,null,null,null,""],
  ["달성군","냉천2리경로당","달성군 가창면 가창동로1길 22","특정계층 이용시설",false,null,null,null,""],
  ["달성군","냉천1리경로당","달성군 가창면 가창로 761","특정계층 이용시설",false,null,null,null,""],
  ["달성군","행정1리경로당","달성군 가창면 가창동로 122-18","특정계층 이용시설",false,null,null,null,""],
  ["달성군","행정2리경로당","달성군 가창면 가창동로 124","특정계층 이용시설",false,null,null,null,""],
  ["달성군","상원1리경로당","달성군 가창면 가창로126길 182","특정계층 이용시설",false,null,null,null,""],
  ["달성군","상원가재경로당","달성군 가창면 가창동로 271-24","특정계층 이용시설",false,null,null,null,""],
  ["달성군","단산리경로당","달성군 가창면 단산길 97-3","특정계층 이용시설",false,null,null,null,""],
  ["달성군","단산신서경로당","달성군 가창면 단산1길 8","특정계층 이용시설",false,null,null,null,""],
  ["달성군","대일1리경로당","달성군 가창면 가창로126길 3","특정계층 이용시설",false,null,null,null,""],
  ["달성군","대일2리경로당","달성군 가창면 원정길 183-3","특정계층 이용시설",false,null,null,null,""],
  ["달성군","주3리경로당","달성군 가창면 주리2길 124","특정계층 이용시설",false,null,null,null,""],
  ["달성군","주1리경로당","달성군 가창면 주리1길 14","특정계층 이용시설",false,null,null,null,""],
  ["달성군","주2리경로당(내주리)","달성군 가창면 주리1길 136","특정계층 이용시설",false,null,null,null,""],
  ["달성군","옥분리경로당","달성군 가창면 가창로 440","특정계층 이용시설",false,null,null,null,""],
  ["달성군","옥분리정안경로당","달성군 가창면 가창로75길 6","특정계층 이용시설",false,null,null,null,""],
  ["달성군","삼산리경로당(본동)","달성군 가창면 녹문길 22","특정계층 이용시설",false,null,null,null,""],
  ["달성군","백록마을회관(우록2리경로당)","달성군 가창면 우록길 461","특정계층 이용시설",false,null,null,null,""],
  ["달성군","우록1리경로당","달성군 가창면 우록길 255","특정계층 이용시설",false,null,null,null,""],
  ["달성군","하산3리경로당","달성군 하빈면 하산3길 4","특정계층 이용시설",false,null,null,null,""],
  ["달성군","하산1리경로당","달성군 하빈면 하목정길 40-2","특정계층 이용시설",false,null,null,null,""],
  ["달성군","하산2리경로당","달성군 하빈면 하산2길 37","특정계층 이용시설",false,null,null,null,""],
  ["달성군","묘2리경로당","달성군 하빈면 묘동2길 19-1","특정계층 이용시설",false,null,null,null,""],
  ["달성군","묘2리(안곡)경로당","달성군 하빈면 하빈로87길 93","특정계층 이용시설",false,null,null,null,""],
  ["달성군","묘1리경로당","달성군 하빈면 육신사길 26","특정계층 이용시설",false,null,null,null,""],
  ["달성군","기곡1리경로당","달성군 하빈면 기곡3길 8","특정계층 이용시설",false,null,null,null,""],
  ["달성군","기곡1리(못안)경로당","달성군 하빈면 기곡3길 35-14","특정계층 이용시설",false,null,null,null,""],
  ["달성군","기곡2리경로당","달성군 하빈면 기곡1길 96","특정계층 이용시설",false,null,null,null,""],
  ["달성군","기곡1리(터개월)경로당","달성군 하빈면 터개울길 29","특정계층 이용시설",false,null,null,null,""],
  ["달성군","대평3리경로당","달성군 하빈면 하빈로172길 40","특정계층 이용시설",false,null,null,null,""],
  ["달성군","대평2리경로당","달성군 하빈면 하빈로171길 40","특정계층 이용시설",false,null,null,null,""],
  ["달성군","대평1리경로당","달성군 하빈면 하빈로180길 21","특정계층 이용시설",false,null,null,null,""],
  ["달성군","무등2리경로당","달성군 하빈면 하빈로120길 94","특정계층 이용시설",false,null,null,null,""],
  ["달성군","무등1리경로당","달성군 하빈면 하빈로140길 52","특정계층 이용시설",false,null,null,null,""],
  ["달성군","하빈면행정복지센터","달성군 하빈면 하빈로84길 1","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","현내2리경로당","달성군 하빈면 하빈로90길 5","특정계층 이용시설",false,null,null,null,""],
  ["달성군","현내1리경로당","달성군 하빈면 하빈로107길 5","특정계층 이용시설",false,null,null,null,""],
  ["달성군","현내3리경로당","달성군 하빈면 하빈로 402-5","특정계층 이용시설",false,null,null,null,""],
  ["달성군","하빈면민복지회관","달성군 하빈면하빈로84길 23","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","감문1리경로당","달성군 하빈면 하빈로52길 19","특정계층 이용시설",false,null,null,null,""],
  ["달성군","감문2리경로당","달성군 하빈면 하빈로24길 63-1","특정계층 이용시설",false,null,null,null,""],
  ["달성군","동곡2리경로당","달성군 하빈면 달구벌대로35길 16","특정계층 이용시설",false,null,null,null,""],
  ["달성군","동곡1리경로당","달성군 하빈면 하빈남로37길 26-3","특정계층 이용시설",false,null,null,null,""],
  ["달성군","봉촌보건진료소","달성군 하빈면 하빈남로52길 66","공공시설",true,[540,1080,31],null,null,""],
  ["달성군","봉촌2리경로당","달성군 하빈면 하빈남로 383 (봉촌2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["달성군","봉촌1리경로당","달성군 하빈면 하빈남로52길 58","특정계층 이용시설",false,null,null,null,""],
  ["달성군","봉촌1길(수무실)경로당","달성군 하빈면 봉촌2길 19","특정계층 이용시설",false,null,null,null,""],
  ["달성군","봉촌1리(한실)경로당","달성군 하빈면 봉촌1길 4","특정계층 이용시설",false,null,null,null,""],
  ["군위군","동부1리경로당","군위군 군위읍 동서6길 27","특정계층 이용시설",false,null,null,null,""],
  ["군위군","동부2리경로당","군위군 군위읍 동서5길 19 , 아촌","특정계층 이용시설",false,null,null,null,""],
  ["군위군","KT군위지점","군위군 군위읍 동서길 22","공공시설",true,[540,1080,31],null,null,"054-915-9203"],
  ["군위군","서부2리경로당","군위군 군위읍 동서2길 14","특정계층 이용시설",false,null,null,null,""],
  ["군위군","서부1리경로당","군위군 군위읍 동서길 24-30, 노하","특정계층 이용시설",false,null,null,null,""],
  ["군위군","군위LH천년나무아파트경로당","군위군 군위읍 동산새길 50","특정계층 이용시설",false,null,null,null,""],
  ["군위군","서부3리경로당","군위군 군위읍 중앙6길 9","특정계층 이용시설",false,null,null,null,""],
  ["군위군","군위보건경로당","군위군 군위읍 중앙5길 12 (군위군보훈회관)","공공시설",true,[540,1080,31],null,null,""],
  ["군위군","금구2리경로당","군위군 군위읍 구지길 126 , 비들못","특정계층 이용시설",false,null,null,null,""],
  ["군위군","금구1리경로당","군위군 군위읍 쇳골길 51-5","특정계층 이용시설",false,null,null,null,""],
  ["군위군","무성2리경로당","군위군 군위읍 무성1길 67-2, 하모","특정계층 이용시설",false,null,null,null,""],
  ["군위군","무성3리경로당","군위군 군위읍 무성3길 4 , 중모","특정계층 이용시설",false,null,null,null,""],
  ["군위군","무성1리경로당","군위군 군위읍 용산길 22","특정계층 이용시설",false,null,null,null,""],
  ["군위군","수서2리(안장수골)경로당","군위군 군위읍 장수길 166","특정계층 이용시설",false,null,null,null,""],
  ["군위군","군위수서2리경로당","군위군 군위읍 장수길 17 (수서2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","군위수서1리경로당","군위군 군위읍 서금로 717 , 서군","특정계층 이용시설",false,null,null,null,""],
  ["군위군","사직2리경로당","군위군 군위읍 사직2길 49","특정계층 이용시설",false,null,null,null,""],
  ["군위군","사직1리경로당","군위군 군위읍 사직1길 110-1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","내량2리경로당","군위군 군위읍 내외량길 244","특정계층 이용시설",false,null,null,null,""],
  ["군위군","내량1리(태양)경로당","군위군 군위읍 내량1길 6-1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","내량1리경로당","군위군 군위읍 내량길 166","특정계층 이용시설",false,null,null,null,""],
  ["군위군","외량3리경로당","군위군 군위읍 새터길 26","특정계층 이용시설",false,null,null,null,""],
  ["군위군","외량2리경로당","군위군 군위읍 내외량길 152","특정계층 이용시설",false,null,null,null,""],
  ["군위군","외량1리경로당","군위군 군위읍 외량1길 16","특정계층 이용시설",false,null,null,null,""],
  ["군위군","삽령리경로당","군위군 군위읍 삽령길 113-5, 삽령리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","대북1리경로당","군위군 군위읍 대북1길 8","특정계층 이용시설",false,null,null,null,""],
  ["군위군","대북2리경로당","군위군 군위읍 대북길 70-4","특정계층 이용시설",false,null,null,null,""],
  ["군위군","오곡리경로당","군위군 군위읍 오곡길 60-4, 오곡리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","정2리경로당","군위군 군위읍 정2길 18 (정2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","정3리경로당","군위군 군위읍 정3길 30-6","특정계층 이용시설",false,null,null,null,""],
  ["군위군","정1리경로당","군위군 군위읍 정1길 16-12 (정1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","하곡리(속골)경로당","군위군 군위읍 하곡2길 14 , 속골경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","하곡리경로당","군위군 군위읍 하곡1길 35","특정계층 이용시설",false,null,null,null,""],
  ["군위군","용대리경로당","군위군 군위읍 용대2길 5 , 용대리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","상곡리경로당","군위군 군위읍 상곡1길 5","특정계층 이용시설",false,null,null,null,""],
  ["군위군","광현3리경로당","군위군 군위읍 광현길 23","특정계층 이용시설",false,null,null,null,""],
  ["군위군","광현2리경로당","군위군 군위읍 장대길 66 (광현2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","광현1리경로당","군위군 군위읍 군위금성로 617 (마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","대흥1리경로당","군위군 군위읍 대흥1길 14-18 (대흥1리마을노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","대흥2리경로당","군위군 군위읍 대흥2길 19-5 (대흥2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","사리1리경로당","군위군 소보면 만세길 46-15 (사리1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","사리2리경로당","군위군 소보면 사계길 219-10 (사리2리마을회관(경로당))","특정계층 이용시설",false,null,null,null,""],
  ["군위군","보현1리경로당","군위군 소보면 소보안계로 650 (보현1리마을노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","보현2리경로당","군위군 소보면 보현2길 35 (보현2리마을노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","복성리경로당","군위군 소보면 소보안계로 460","특정계층 이용시설",false,null,null,null,""],
  ["군위군","위성1리경로당","군위군 소보면 위성1길 4 (위성1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","위성3리경로당","군위군 소보면 위성2길 7 (위성3리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","위성4리경로당","군위군 소보면 사촌길 263 (위성4리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","위성2리경로당","군위군 소보면 대량길 53 (위성2리마을노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","달산1리경로당(달산)","군위군 소보면 도군로 1259","특정계층 이용시설",false,null,null,null,""],
  ["군위군","달산2리경로당(달산)","군위군 소보면 달산3길 1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","달산2리(수철)경로당","군위군 소보면 달산1길 15-3","특정계층 이용시설",false,null,null,null,""],
  ["군위군","송원2리(여성)경로당","군위군 소보면 송원4길 9-9","특정계층 이용시설",false,null,null,null,""],
  ["군위군","송원1리경로당","군위군 소보면 송원5길 43 (송원1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","송원2리경로당","군위군 소보면 송원2길 5 (송원2리마을노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","신계리경로당","군위군 소보면 도신로 845 , 신계리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","도산1리경로당","군위군 소보면 도산길 57-1 (도산1리 마을노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","도산2리경로당","군위군 소보면 칠봉길 169 (도산2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","도산1리(원마)경로당","군위군 소보면 신원길 35-6, 도산1리(원마)경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","서경용수리경로당","군위군 소보면 서경2길 171","특정계층 이용시설",false,null,null,null,""],
  ["군위군","서경리경로당","군위군 소보면 송백로 1145","특정계층 이용시설",false,null,null,null,""],
  ["군위군","평호리(평지)경로당","군위군 소보면 송백로 1075","특정계층 이용시설",false,null,null,null,""],
  ["군위군","평호리경로당","군위군 소보면 평호길 149","특정계층 이용시설",false,null,null,null,""],
  ["군위군","산법리경로당","군위군 소보면 산법길 8 , 산법리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","내의3리경로당","군위군 소보면 내의길 753 (내의3리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","내의1리(상암)경로당","군위군 소보면 봉내길 250","특정계층 이용시설",false,null,null,null,""],
  ["군위군","내의2리경로당","군위군 소보면 내의길 365-3 (내의2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","내의1리경로당","군위군 소보면 하량길 21 (내의1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","봉황1리경로당","군위군 소보면 봉황1길 38 (봉황1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","봉황2리경로당","군위군 소보면 도군로 1828 (봉황2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","봉황3리경로당","군위군 소보면 상주영천고속도로 32","특정계층 이용시설",false,null,null,null,""],
  ["군위군","봉소리","군위군 소보면 봉소2길 146 , 봉소리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","봉소리(하소)경로당","군위군 소보면 봉소1길 55-6, 하소경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","오천리경로당","군위군 효령면 오천1길 6 , 오천리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","성1리경로당","군위군 효령면 성1길 47 (성1리마을노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","성2리경로당","군위군 효령면 성3길 71 (성2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","병수1리경로당","군위군 효령면 간동길 19 (병수리복지회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","병수2리경로당","군위군 효령면 배방길 142-1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","불로리경로당","군위군 효령면 불로길 114-2","특정계층 이용시설",false,null,null,null,""],
  ["군위군","내리리경로당","군위군 효령면 불곡길 152-1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","중구2리경로당","군위군 효령면 중리길 9 (중구2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","중구1리경로당","군위군 효령면 중구2길 18-36","특정계층 이용시설",false,null,null,null,""],
  ["군위군","거매리(여림실)경로당","군위군 효령면 거매1길 87","특정계층 이용시설",false,null,null,null,""],
  ["군위군","거매리경로당","군위군 효령면 거매2길 34-21, 거매리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","장군1리경로당","군위군 효령면 나곡길 1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","장군3리경로당","군위군 효령면 장군로 831-20","특정계층 이용시설",false,null,null,null,""],
  ["군위군","장군2리경로당","군위군 효령면 장군당2길 24","특정계층 이용시설",false,null,null,null,""],
  ["군위군","장군4리경로당","군위군 효령면 녹동길 146","특정계층 이용시설",false,null,null,null,""],
  ["군위군","장기3리경로당","군위군 효령면 고암길 29 (효령면장기3리 노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","노행1리경로당","군위군 효령면 장기길 339","특정계층 이용시설",false,null,null,null,""],
  ["군위군","장기1리경로당","군위군 효령면 금산길 18-1 (장기1리마을노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","금매1리경로당","군위군 효령면 신매길 24-5","특정계층 이용시설",false,null,null,null,""],
  ["군위군","금매2리경로당","군위군 효령면 삽실길 65-12","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화계3리경로당","군위군 효령면 화계봉산길 46","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화계3리(홍골)경로당","군위군 효령면 화계봉산길 131-3","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화계2리경로당","군위군 효령면 신월길 11-2","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화계1리경로당","군위군 효령면 소계길 36-1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","마시2리경로당","군위군 효령면 덕동길 96-3","특정계층 이용시설",false,null,null,null,""],
  ["군위군","마시3리경로당","군위군 효령면 교수촌동길 10","특정계층 이용시설",false,null,null,null,""],
  ["군위군","마시1리경로당","군위군 효령면 마시길 33","특정계층 이용시설",false,null,null,null,""],
  ["군위군","매곡1리(수동)경로당","군위군 효령면 용매로 814-1 (매곡1리수동경로회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","매곡2리경로당","군위군 효령면 용매로 742","특정계층 이용시설",false,null,null,null,""],
  ["군위군","노행2리경로당","군위군 효령면 점말길 23-133","특정계층 이용시설",false,null,null,null,""],
  ["군위군","매곡1리경로당","군위군 효령면 용매로 851 , 매곡1리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","고곡3리경로당","군위군 효령면 서고암2길 7-1 (고곡3리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","고곡2리(한실)경로당","군위군 효령면 한실길 9","특정계층 이용시설",false,null,null,null,""],
  ["군위군","고곡2리경로당","군위군 효령면 한실길 9 (마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","창평2리경로당","군위군 부계면 남방길 44 (창평2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","창평1리경로당","군위군 부계면 창평길 25-13 (창평1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","가호1리경로당","군위군 부계면 한티로 2483","특정계층 이용시설",false,null,null,null,""],
  ["군위군","가호2리경로당","군위군 부계면 가호1길 276","특정계층 이용시설",false,null,null,null,""],
  ["군위군","춘산리경로당","군위군 부계면 춘산2길 38 , 춘산리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","춘산리(현창)경로당","군위군 부계면 춘산1길 32 , 춘산리(현창)경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","대율1리마을회관","군위군 부계면 한티로 2146-1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","대율2리경로당","군위군 부계면 한티로 2117","특정계층 이용시설",false,null,null,null,""],
  ["군위군","동산1리경로당","군위군 부계면 동산2길 37","특정계층 이용시설",false,null,null,null,""],
  ["군위군","동산2리경로당","군위군 부계면 동산1길 26","특정계층 이용시설",false,null,null,null,""],
  ["군위군","남산1리(갖골)경로당","군위군 부계면 남산3길 38","특정계층 이용시설",false,null,null,null,""],
  ["군위군","남산1리경로당","군위군 부계면 남산4길 27-22","특정계층 이용시설",false,null,null,null,""],
  ["군위군","남산2리경로당","군위군 부계면 한티로 1732","특정계층 이용시설",false,null,null,null,""],
  ["군위군","남산2리(멀미)경로당","군위군 부계면 남산2길 70","특정계층 이용시설",false,null,null,null,""],
  ["군위군","명산리경로당","군위군 부계면 마명길 195 , 명산리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","신화2리경로당","군위군 부계면 신화3길 251","특정계층 이용시설",false,null,null,null,""],
  ["군위군","신화1리경로당","군위군 부계면 신화2길 9-8","특정계층 이용시설",false,null,null,null,""],
  ["군위군","나호2리경로당","군위군 우보면 진밭길 70-1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","나호3리경로당","군위군 우보면 윗라불길 16-20","특정계층 이용시설",false,null,null,null,""],
  ["군위군","나호1리경로당","군위군 우보면 아랫라불길 17","특정계층 이용시설",false,null,null,null,""],
  ["군위군","이화2리경로당","군위군 우보면 이화길 175 (이화2리경로당)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","이화3리경로당","군위군 우보면 이화리 1707-6","특정계층 이용시설",false,null,null,null,""],
  ["군위군","이화1리(호포)경로당","군위군 우보면 이화길 148","특정계층 이용시설",false,null,null,null,""],
  ["군위군","이화1리경로당","군위군 우보면 이화1길 26-9","특정계층 이용시설",false,null,null,null,""],
  ["군위군","이화3리백양경로당","군위군 우보면 동부로 1380-3","특정계층 이용시설",false,null,null,null,""],
  ["군위군","두북리경로당","군위군 우보면 두북3길 14","특정계층 이용시설",false,null,null,null,""],
  ["군위군","선곡2리경로당","군위군 우보면 선동길 166","특정계층 이용시설",false,null,null,null,""],
  ["군위군","선곡1리경로당","군위군 우보면 원골길 11","특정계층 이용시설",false,null,null,null,""],
  ["군위군","선곡3리경로당","군위군 우보면 사답길 19","특정계층 이용시설",false,null,null,null,""],
  ["군위군","미성1리(새마)경로당","군위군 우보면 미성2길 7","특정계층 이용시설",false,null,null,null,""],
  ["군위군","미성1리(길동)경로당","군위군 우보면 미성5길 60 , 미성1리(길동)경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","미성1리경로당","군위군 우보면 미성4길 12-6 (미성1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","미성2리경로당","군위군 우보면 미성3길 61-14 (미성2리노인정)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","모산리경로당","군위군 우보면 문산3길 2 , 모산리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","모산리(옥전)경로당","군위군 우보면 옥전길 13 (옥전노인정)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","문덕1리경로당","군위군 우보면 철길로 157","특정계층 이용시설",false,null,null,null,""],
  ["군위군","문덕2리경로당","군위군 우보면 거평길 160","특정계층 이용시설",false,null,null,null,""],
  ["군위군","달산1경(우보)로당","군위군 우보면 달산리 117-1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","두북리(기와골)경로당","군위군 우보면 고산길 6","특정계층 이용시설",false,null,null,null,""],
  ["군위군","달산2리(우보)경로당","군위군 우보면 고산길 6","특정계층 이용시설",false,null,null,null,""],
  ["군위군","달산2리(솥다리)경로당","군위군 우보면 고산길 212-2","특정계층 이용시설",false,null,null,null,""],
  ["군위군","봉산2리경로당","군위군 우보면 봉산4길 5","특정계층 이용시설",false,null,null,null,""],
  ["군위군","봉산1리경로당","군위군 우보면 화계봉산길 847","특정계층 이용시설",false,null,null,null,""],
  ["군위군","봉산2리지경경로당","군위군 우보면 봉산4길 109-29","특정계층 이용시설",false,null,null,null,""],
  ["군위군","읍내2리경로당","군위군 의흥면 읍내6길 6","특정계층 이용시설",false,null,null,null,""],
  ["군위군","읍내1리경로당","군위군 의흥면 읍내2길 21","특정계층 이용시설",false,null,null,null,""],
  ["군위군","수북3리경로당","군위군 의흥면 수북3길 277","특정계층 이용시설",false,null,null,null,""],
  ["군위군","수북1리경로당","군위군 의흥면 수북1길 74","특정계층 이용시설",false,null,null,null,""],
  ["군위군","수북2리경로당","군위군 의흥면 수북1길 23","특정계층 이용시설",false,null,null,null,""],
  ["군위군","수서1리경로당","군위군 의흥면 수서1길 45-5","특정계층 이용시설",false,null,null,null,""],
  ["군위군","수서2리경로당","군위군 의흥면 수서2길 43-3","특정계층 이용시설",false,null,null,null,""],
  ["군위군","이지2리경로당","군위군 의흥면 가지골길 53 (이지2리회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","이지1리경로당","군위군 의흥면 배일길 40","특정계층 이용시설",false,null,null,null,""],
  ["군위군","파전리경로당","군위군 의흥면 파전길 3 , 파전리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","신덕2리경로당","군위군 의흥면 신덕길 81-1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","신덕2리(덕골)경로당","군위군 의흥면 파전신덕길 186-1","특정계층 이용시설",false,null,null,null,""],
  ["군위군","신덕1리경로당","군위군 의흥면 파전신덕길 145 (신덕1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","지호2리경로당","군위군 의흥면 지호2길 31 (지호2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","지호1리경로당","군위군 의흥면 지호1길 12-4","특정계층 이용시설",false,null,null,null,""],
  ["군위군","지호3리경로당","군위군 의흥면 지호3길 23","특정계층 이용시설",false,null,null,null,""],
  ["군위군","연계2리경로당","군위군 의흥면 동부로 650 (연계리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","연계1리경로당","군위군 의흥면 백련길 1 (연계1리새마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","매성1리경로당","군위군 의흥면 아랫매성길 10","특정계층 이용시설",false,null,null,null,""],
  ["군위군","매성2리경로당","군위군 의흥면 윗매성길 8","특정계층 이용시설",false,null,null,null,""],
  ["군위군","원산3리(샛터)경로당","군위군 의흥면 원산1길 17 , 원산3리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","원산2리경로당","군위군 의흥면 원산3길 51-4","특정계층 이용시설",false,null,null,null,""],
  ["군위군","원산1리경로당","군위군 의흥면 원산2길 41","특정계층 이용시설",false,null,null,null,""],
  ["군위군","원산3리경로당","군위군 의흥면 원산2길 10-3 (원산3리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","금양2리경로당","군위군 의흥면 금양4길 22-5","특정계층 이용시설",false,null,null,null,""],
  ["군위군","금양1리행골경로당","군위군 의흥면 원산금양길 420","특정계층 이용시설",false,null,null,null,""],
  ["군위군","금양1리(샛터)경로당","군위군 의흥면 금양2길 22-8","특정계층 이용시설",false,null,null,null,""],
  ["군위군","금양1리경로당","군위군 의흥면 금양3길 8 (금양1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","백학1리경로당","군위군 산성면 치산효령로 919-2","특정계층 이용시설",false,null,null,null,""],
  ["군위군","백학2리경로당","군위군 산성면 백학길 208 (백학2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","삼산1리경로당","군위군 산성면 범하1길 34","특정계층 이용시설",false,null,null,null,""],
  ["군위군","삼산2리경로당","군위군 산성면 범상길 4 (삼산2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","봉림2리경로당","군위군 산성면 갑티로 76 (봉림2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","봉림1리경로당","군위군 산성면 범박길 101","특정계층 이용시설",false,null,null,null,""],
  ["군위군","무암1리(옥정)경로당","군위군 산성면 옥정길 26","특정계층 이용시설",false,null,null,null,""],
  ["군위군","무암1리경로당","군위군 산성면 만석길 30 (무암1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","무암2리경로당","군위군 산성면 아치길 100 (무암2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","운산리경로당","군위군 산성면 산성가음로 527 , 운산리경로당","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화본2리경로당","군위군 산성면 부흥로 538 (화본2리노인회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화본3리경로당","군위군 산성면 상동길 4 (화본3리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화본1리경로당","군위군 산성면 산성가음로 685 (화본1리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화전1리경로당","군위군 산성면 화전1길 131 (화전1리회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화전2리경로당","군위군 산성면 화전2길 36 (화전2리마을회관)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화수2리경로당","군위군 삼국유사면 넌덕길 17","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화수1리경로당","군위군 삼국유사면 화수길 12","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화북1리경로당","군위군 삼국유사면 화북1길 12-8","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화북4리경로당","군위군 삼국유사면 화산길 619-26","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화북3리경로당","군위군 삼국유사면 화북3길 6","특정계층 이용시설",false,null,null,null,""],
  ["군위군","화북2리경로당","군위군 삼국유사면 화북2길 187","특정계층 이용시설",false,null,null,null,""],
  ["군위군","괴산리경로당","군위군 삼국유사면 괴산길 353","특정계층 이용시설",false,null,null,null,""],
  ["군위군","학성2리경로당","군위군 삼국유사면 안용아길 219","특정계층 이용시설",false,null,null,null,""],
  ["군위군","학성리경로당","군위군 삼국유사면 삼국유사로 448","특정계층 이용시설",false,null,null,null,""],
  ["군위군","인곡리경로당","군위군 삼국유사면 인곡1길 335","특정계층 이용시설",false,null,null,null,""],
  ["군위군","양지리경로당","군위군 삼국유사면 삼국유사로 1027","특정계층 이용시설",false,null,null,null,""],
  ["군위군","낙전리경로당","군위군 삼국유사면 아미산로 350","특정계층 이용시설",false,null,null,null,""],
  ["군위군","가암1리경로당","군위군 삼국유사면 아미산로 109","특정계층 이용시설",false,null,null,null,""],
  ["군위군","가암2리(백암)경로당","군위군 삼국유사면 가암2길 248-6","특정계층 이용시설",false,null,null,null,""],
  ["군위군","가암2리경로당","군위군 삼국유사면 가암2길 99","특정계층 이용시설",false,null,null,null,""],
  ["군위군","석산리경로당","군위군 삼국유사면 석산길 15-7","특정계층 이용시설",false,null,null,null,""],
  ["군위군","석산리(석정)경로당","군위군 삼국유사면 석정길 15","특정계층 이용시설",false,null,null,null,""],
  ["군위군","학암2리(동부)경로당","군위군 삼국유사면 학암3길 28 (학암2리마을공동창고)","특정계층 이용시설",false,null,null,null,""],
  ["군위군","학암2리경로당","군위군 삼국유사면 학암2길 36","특정계층 이용시설",false,null,null,null,""],
  ["군위군","학암1리경로당","군위군 삼국유사면 학암1길 56-2","특정계층 이용시설",false,null,null,null,""]
];
const DAEGU_DISTRICTS=['중구','동구','서구','남구','북구','수성구','달서구','달성군','군위군'];
const SHELTER_DAYS=['월','화','수','목','금','토','일'];
const SHELTER_PAGE_SIZE=12;
const SHELTER_ACCESS_LABELS={stepFree:'단차 없는 출입구',toilet:'장애인 화장실',lift:'엘리베이터',parking:'장애인 주차구역',charging:'전동휠체어 충전기'};
const SHELTER_CHARGER_SOURCE='https://www.daegu.go.kr/cmsh/daegu.go.kr/welf/file/%EC%A0%84%EB%8F%99%ED%9C%A0%EC%B2%B4%EC%96%B4%EA%B8%89%EC%86%8D%EC%B6%A9%EC%A0%84%EA%B8%B0%EC%84%A4%EC%B9%98%EC%9E%A5%EC%86%8C%ED%98%84%ED%99%A9%28%EA%B3%B5%EA%B3%B5%EA%B8%B0%EA%B4%80%EB%93%B1%29.pdf';
const SHELTER_ACCESS={
  '수성구 달구벌대로 2451':{stepFree:'정문은 계단이 있으며, 단차 없는 보조출입구 이용',toilet:'있음',lift:'있음',parking:'2면',charging:'지하 1층',phone:'053-668-1600',source:'https://access.visitkorea.or.kr/ms/detail.do?cotId=2c49b578-e3e7-4240-9441-0c40f947330e'},
  '수성구 지범로41길 36':{stepFree:'주출입구까지 경사로, 단차 없는 자동문',toilet:'있음',lift:'있음',parking:'1면',charging:'1층 로비',phone:'053-668-1700',source:'https://access.visitkorea.or.kr/ms/detail.do?cotId=adfae7a6-3267-4fcb-b2be-14077d6eb8b2'},
  '서구 평리로73길 37':{toilet:'있음',lift:'있음',parking:'지상 1면',approach:'자동문 · 출입구 단차 미확인',phone:'053-663-3881',source:'https://access.visitkorea.or.kr/ms/detail.do?cotId=0db5c873-9eb5-42b3-9dd4-82968af0c28f'},
  '동구 금호강변로 360 (안심도서관)':{charging:'2층 종합자료실'},
  '동구 동촌로 79 (검사동)':{charging:'1층 로비'},
  '서구 당산로 343 (중리동)':{charging:'1층 민원실'},
  '남구 이천로 51 (봉덕동)':{charging:'1층 로비'},
  '북구 구암서로 32 (구암동)':{charging:'1층 좌측 출입문 오른쪽'},
  '수성구 달구벌대로 2450 (수성구청)':{charging:'1층 민원실'},
  '수성구 수성로 213 (수성구보건소)':{charging:'1층 민원실'},
  '수성구 달구벌대로650길 6 (신매동)':{charging:'1층 로비'},
  '수성구 들안로67길 64 , 수성4가동주민센터 (수성동4가)':{charging:'1층 로비'},
  '수성구 용학로33길 9 (지산동)':{charging:'1층 민원실'},
  '수성구 고산로 152 (고산3동행정복지센터)':{charging:'1층 민원실'}
};
const shelterFilters={region:'all',time:'960',day:'all',extended:false,restricted:false,access:false,limit:SHELTER_PAGE_SIZE};
let shelterAdvancedOpen=null;
function shelterAdvancedActive(){
  return ['extended','restricted','access',...Object.keys(SHELTER_ACCESS_LABELS)].some(key=>shelterFilters[key]);
}

function shelterTime(minutes){return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
function shelterHours(row,includeExtended){
  const [, , , , , regular,extra,night]=row;
  return [['기본',regular],...(includeExtended?[['특보 시 추가',extra],['특보 시 연장',night]]:[])].filter(([,hours])=>!!hours);
}
function matchesShelterHours(hours,filters){
  const [from,to,days]=hours;
  if(filters.day!=='all'&&!(days&(1<<Number(filters.day))))return false;
  if(filters.time==='all')return true;
  const close=to<from?to+1440:to;
  return close>Number(filters.time);
}
function sheltersFor(filters,rows=DAEGU_SHELTER_ROWS){
  return rows.flatMap(row=>{
    const [region, ,address, , publicAccess]=row;
    if((filters.region!=='all'&&filters.region!==region)||(!filters.restricted&&!publicAccess))return [];
    const access=SHELTER_ACCESS[address];
    if((filters.access&&!access)||Object.keys(SHELTER_ACCESS_LABELS).some(key=>filters[key]&&!access?.[key]))return [];
    const schedules=shelterHours(row,filters.extended);
    const matches=schedules.filter(([,hours])=>matchesShelterHours(hours,filters));
    if(!matches.length&&(filters.time!=='all'||filters.day!=='all'||schedules.length))return [];
    const regular=matches.some(([kind])=>kind==='기본');
    return [{row,matches,regular,access}];
  }).sort((a,b)=>{
    const order=Number(b.regular)-Number(a.regular);
    return order||DAEGU_DISTRICTS.indexOf(a.row[0])-DAEGU_DISTRICTS.indexOf(b.row[0])||a.row[1].localeCompare(b.row[1],'ko');
  });
}
function shelterScheduleLine(label,[from,to,days]){
  const dayText=SHELTER_DAYS.filter((_,i)=>days&(1<<i)).join('·');
  const hours=from===0&&to===1440?'24시간':`${shelterTime(from)}–${to<from?'다음 날 ':''}${shelterTime(to)}`;
  return `<li><b>${label} ${hours}</b>${dayText?` <span class="muted">${dayText}</span>`:' <span class="muted">요일 미기재</span>'}</li>`;
}
function shelterCard(entry){
  const {row,matches,regular,access}=entry;
  const [region,name,address,facility,publicAccess, , , ,phone]=row;
  const map=`https://map.kakao.com/link/search/${encodeURIComponent(`대구광역시 ${address}`)}`;
  return `<article class="card stack shelter-card"><div class="actions">${pill(region)}${pill(publicAccess?'누구나 이용 안내':'이용 대상 확인',publicAccess?'green':'orange')}${matches.length&&!regular?pill('특보 시 운영표','orange'):''}</div><h3>${escapeHTML(name)}</h3><p class="muted small">대구광역시 ${escapeHTML(address)} · ${escapeHTML(facility)}</p>${matches.length?`<ul class="shelter-hours">${matches.map(([label,hours])=>shelterScheduleLine(label,hours)).join('')}</ul>`:'<p class="small muted">선택 조건에 해당하는 운영시간이 공식 자료에 기재되지 않았습니다.</p>'}
  ${access?`<div class="shelter-access-facts stack"><h4>휠체어 이용 조건</h4><dl>${Object.entries(SHELTER_ACCESS_LABELS).map(([key,label])=>`<div><dt>${label}</dt><dd class="${access[key]?'':'muted'}">${access[key]||'미확인'}</dd></div>`).join('')}</dl>${access.approach?`<p class="muted small">${access.approach}</p>`:''}<div class="shelter-links">${access.source?external('접근성 공식 자료',access.source):''}${access.charging?external('대구시 충전기 자료',SHELTER_CHARGER_SOURCE):''}${access.phone?`<a href="tel:${access.phone}">시설 ${access.phone}</a>`:''}</div></div>`:'<p class="muted small">휠체어 이용 조건 미확인</p>'}
  <div class="shelter-links">${external('지도에서 위치 보기',map)}${phone?`<a href="tel:${phone}">담당 부서 ${phone}</a>`:''}</div></article>`;
}
function shelterResults(){
  const rows=sheltersFor(shelterFilters), shown=rows.slice(0,shelterFilters.limit);
  const summary=rows.length?`${rows.length.toLocaleString('ko-KR')}곳 · ${shown.length.toLocaleString('ko-KR')}곳 표시`:'선택 조건에 맞는 운영 안내를 찾지 못했습니다.';
  return `<p id="shelter-count" class="shelter-count" role="status">${summary}</p>${shown.length?`<div class="shelter-grid">${shown.map(shelterCard).join('')}</div>`:`<div class="notice warn">${icon('info')}<div>다른 구·군이나 시간대를 선택해 보세요. 운영시간이 미기재된 시설은 시간 필터에서 제외합니다.</div></div>`}${rows.length>shown.length?`<div class="actions">${button('쉼터 더 보기','shelters-more',{kind:'secondary'})}</div>`:''}`;
}
function shelterFinder(){
  const areas={all:'대구광역시 전체',...Object.fromEntries(DAEGU_DISTRICTS.map(area=>[area,area]))};
  const weekdays=Object.entries(SHELTER_DAYS).map(([i,name])=>`<option value="${i}" ${shelterFilters.day===i?'selected':''}>${name}요일</option>`).join('');
  return `<section class="stack" aria-labelledby="shelter-heading"><div class="card stack"><h2 id="shelter-heading">대구 무더위쉼터 찾기</h2><p class="muted small">국민안전24의 2026년 등록 운영표입니다. 폭염 기간, 휴관일과 공휴일에 따라 달라질 수 있으니 방문 전 담당 부서에 확인하세요.</p><div class="form-grid compact-filters"><label class="field">대구 구·군<select name="shelter-region">${optionList(areas,shelterFilters.region)}</select></label><label class="field">요일<select name="shelter-day">${optionList({all:'요일 전체'},shelterFilters.day)}${weekdays}</select></label></div><fieldset class="shelter-time"><legend>운영 시간대</legend><div class="radio-row">${[['960','16시 이후'],['1080','18시 이후'],['1200','20시 이후'],['all','전체 시간']].map(([value,label])=>`<label><input type="radio" name="shelter-time" value="${value}" ${shelterFilters.time===value?'checked':''}>${label}</label>`).join('')}</div></fieldset>
  <details id="shelter-advanced" ${(shelterAdvancedOpen??!compactScreen.matches)?'open':''}><summary>추가 검색 조건 <span id="shelter-advanced-status" class="muted small">${shelterAdvancedActive()?' · 적용 중':''}</span></summary><div class="stack"><div class="shelter-options"><label class="check-row small"><input type="checkbox" name="shelter-extended" ${shelterFilters.extended?'checked':''}>폭염특보 시 추가·연장 운영 포함</label><label class="check-row small"><input type="checkbox" name="shelter-restricted" ${shelterFilters.restricted?'checked':''}>이용 대상 확인이 필요한 시설 포함</label></div>
  <fieldset id="shelter-access" class="shelter-time stack"><legend>휠체어 이용 조건</legend><label class="check-row"><input type="checkbox" name="shelter-access" ${shelterFilters.access?'checked':''}>접근성 정보가 있는 쉼터</label><div class="shelter-access-options">${Object.entries(SHELTER_ACCESS_LABELS).map(([key,label])=>`<label class="check-row small"><input type="checkbox" name="shelter-${key}" ${shelterFilters[key]?'checked':''}>${label}</label>`).join('')}</div><p class="small muted">선택한 조건이 모두 공식 자료에서 확인된 시설을 표시합니다. 보조출입구도 단차 없는 출입구에 포함됩니다. 시설까지의 보행 경로와 운영 여부는 방문 전 확인하세요.</p></fieldset>
  </div></details><div class="shelter-filter-footer">${button('검색 결과 보기','shelter-results',{kind:'secondary'})}<p class="small muted">${sourceLink('map')}</p></div></div><div id="shelter-results" class="stack">${shelterResults()}</div></section>`;
}
function updateShelterResults(){
  const target=$('#shelter-results');
  if(target){target.innerHTML=shelterResults();setLive($('#shelter-count').textContent);}
  const status=$('#shelter-advanced-status');
  if(status)status.textContent=shelterAdvancedActive()?' · 적용 중':'';
}
function nearbyPage() {
  return `${pageHeading('대구광역시','대응시설 안내','대구 응급실과 오후에도 이용 가능한 무더위쉼터를 찾아보세요.')}<div class="stack">
    <div class="actions shelter-shortcuts">${button('16시 이후 쉼터 찾기','shelters-after16',{kind:'primary',mark:'clock'})}${button('휠체어 이용 조건으로 찾기','shelters-wheelchair')}${button('무료 물 나눔 행사','water-events',{mark:'drop'})}${button('폭염 안전 가이드','guide',{mark:'book'})}</div>
    <details class="card nearby-emergency" ${compactScreen.matches?'':'open'}><summary>대구 응급실 찾기</summary><div class="stack"><div class="actions"><a class="btn danger" href="tel:119">${icon('phone')} 실제 긴급상황 119</a><a class="btn secondary" href="${SOURCES.emergency.href.replaceAll('&','&amp;')}" target="_blank" rel="noopener noreferrer">${icon('heart')} ${SOURCES.emergency.label}</a></div><p class="muted small">대구광역시가 선택된 중앙응급의료센터 화면에서 구·군을 고를 수 있습니다. 긴급 이송은 119 안내를 받으세요.</p></div></details>
    ${shelterFinder()}
    <details class="card"><summary>소방서 · 119안전센터 안내</summary><div class="stack"><div class="grid two"><div class="metric"><b>수성119안전센터</b><small>대구광역시 수성구 들안로60길 30<br>053-741-2119</small></div><div class="metric"><b>산격119안전센터</b><small>대구광역시 북구 유통단지로8길 88<br>053-350-5790</small></div></div><p class="small">${external('소방청 · 전국소방기관 안내',FIRE_URL)} (2026.11.23 확인)</p></div></details></div>`;
}

// Keep the official activity record and browser drafts alongside the shared directory.
const WATER_OFFICIAL=[{
  id:'official-dongdaegu-20250730',name:'건강한 여름나기 생수 나눔',organizer:'대구광역시자원봉사센터 · 대구기업자원봉사협의체',district:'동구',place:'동대구역 광장',address:'대구광역시 동구 동대구역 광장',date:'2025-07-30',from:'',to:'',note:'폭염에 지친 시민과 방문객에게 생수와 여름용품을 나눈 지난 행사입니다.',source:'https://dgvolunteer.co.kr/programs/user/community/photo/read.asp?idx=9381&pageno=1&searchType=%2C&searchVal=',official:true
}];
const WATER_STORAGE='heat-check-ai-water-1';
const WATER_MODES={today:'오늘 일정',now:'배부 중 확인',future:'예정 행사',past:'지난 행사',mine:'내 행사·저장 목록'};
const WATER_API='https://heat-check-ai.eternalflora32.chatgpt.site/api/water/events';
const WATER_LIVE_STATUS={pending:['현장 확인 대기',''],open:['배부 중','green'],paused:['잠시 중단','orange'],empty:['물 소진','orange'],moved:['장소 변경','orange'],closed:['배부 종료','']};
const WATER_FRESH_MS=45*60000;
const WATER_EMPTY={name:'',organizer:'',district:'',place:'',address:'',date:'',from:'',to:'',lat:'',lng:'',signup:'',source:'',note:''};
const WATER_LABELS={name:'행사 이름',organizer:'주최 단체 또는 공개 활동명',district:'대구 구·군',place:'배부 장소',address:'공개 장소 주소',date:'행사 날짜',from:'배부 시작',to:'배부 종료',lat:'위도',lng:'경도',signup:'공개 봉사 신청 폼 주소',source:'주최자 행사 공지 주소',note:'배부·참여 안내'};
const WATER_LIMITS={name:56,organizer:60,place:64,address:112,note:160};
const WATER_REQUIRED=['name','organizer','district','place','address','date','from','to'];
const WATER_ID=/^[a-zA-Z0-9_-]{1,100}$/;
let waterItems=[],waterStoreOK=true,waterDraft={...WATER_EMPTY},waterErrors={},waterEditId=null,waterFormLocationMessage='',sharedWater=null,sharedWaterError=false;
let waterMode='today',waterDistrict='all',waterPosition=null,waterPositionMessage='',waterLocating=false,waterLocationRequest=0;
let waterPublic=[],waterConnection='loading',waterSharedConnection='loading',waterLiveId='',waterRefreshing=false,waterBusy=false;

function waterDate(timestamp=Date.now()) {return new Date(timestamp+9*3600000).toISOString().slice(0,10);}
function waterTimeIsValid(time){return typeof time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time);}
function publicWaterUrl(value){
  if(typeof value!=='string'||value.length>250||!/^https:\/\//i.test(value.trim()))return '';
  try{const u=new URL(value.trim());return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
function waterCoordinate(value){
  if(typeof value!=='number'&&!(typeof value==='string'&&/^-?\d+(?:\.\d+)?$/.test(value.trim())))return null;
  return Number.isFinite(Number(value))?Number(value):null;
}
function validateWaterEvent(input){
  const item={}, errors={};
  for(const [key,limit] of Object.entries(WATER_LIMITS)){
    const text=typeof input[key]==='string'?input[key].trim():'';
    if(text.length>limit)errors[key]=`${limit}자 이내로 입력하세요.`;
    item[key]=text.slice(0,limit);
  }
  for(const key of ['district','date','from','to'])item[key]=typeof input[key]==='string'?input[key].trim():'';
  for(const key of WATER_REQUIRED)if(!item[key]&&!errors[key])errors[key]=`${WATER_LABELS[key]}을(를) 입력하세요.`;
  if(!DAEGU_DISTRICTS.includes(item.district))errors.district='대구 구·군 중에서 선택하세요.';
  // Allow pasted road addresses with or without the city prefix. Compare the named district when present.
  const strippedAddress=item.address.replace(/^대구(?:광역시)?\s+/,'');
  const area=strippedAddress.split(/\s+/)[0];
  if(DAEGU_DISTRICTS.includes(area)&&area!==item.district)errors.address='주소와 선택한 구·군을 확인하세요.';
  if(/^(서울|부산|인천|울산|광주|대전|세종|경기|경상[남북]도|충청[남북]도|강원(?:특별자치)?도|전라[남북]도|제주)(?:특별자치도|특별시|광역시|시|도)?\s/.test(item.address))errors.address='대구에 있는 배부 장소의 주소를 입력하세요.';
  if(item.address&&DAEGU_DISTRICTS.includes(item.district)&&!errors.address)item.address=`대구광역시 ${DAEGU_DISTRICTS.includes(area)?'':item.district+' '}${strippedAddress}`;
  if(item.address.length>WATER_LIMITS.address)errors.address='시·구를 포함한 주소를 112자 이내로 입력하세요.';
  const start=Date.parse(`${item.date}T00:00:00+09:00`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||!Number.isFinite(start)||waterDate(start)!==item.date)errors.date='올바른 행사 날짜를 입력하세요.';
  if(!waterTimeIsValid(item.from))errors.from='시작 시간을 입력하세요.';
  if(!waterTimeIsValid(item.to)||item.to<=item.from)errors.to='같은 날 시작 시간보다 늦은 종료 시간을 입력하세요.';
  for(const key of ['signup','source']){
    const value=typeof input[key]==='string'?input[key].trim():'';
    item[key]=publicWaterUrl(value);
    if(value&&!item[key])errors[key]='https://로 시작하는 공개 링크를 입력하세요.';
  }
  const hasCoordinates=[input.lat,input.lng].some(value=>value!==null&&value!==undefined&&String(value).trim()!=='');
  item.lat=waterCoordinate(input.lat);item.lng=waterCoordinate(input.lng);
  if(hasCoordinates){
    if(item.lat===null||item.lat< -90||item.lat>90)errors.lat='위도는 -90~90 사이의 숫자로 입력하세요.';
    if(item.lng===null||item.lng< -180||item.lng>180)errors.lng='경도는 -180~180 사이의 숫자로 입력하세요.';
    if(!errors.lat&&!errors.lng&&(item.lat<35.4||item.lat>36.5||item.lng<128.1||item.lng>129.1))errors.lat='좌표가 대구 일대인지 확인하세요.';
    if(item.lat!==null)item.lat=Number(item.lat.toFixed(5));
    if(item.lng!==null)item.lng=Number(item.lng.toFixed(5));
  }
  return {item,errors};
}
function readSharedWater(hash){
  if(!hash.startsWith('#water='))return null;
  try{
    const value=hash.slice(7);
    if(value.length>3200||!/^[A-Za-z0-9_-]+$/.test(value))throw Error();
    const bytes=Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),ch=>ch.charCodeAt(0));
    const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(data?.v!==1||!WATER_ID.test(data.id||'')||!data.event)throw Error();
    const {item,errors}=validateWaterEvent(data.event);
    if(Object.keys(errors).length)throw Error();
    return {...item,id:data.id};
  }catch{return false;}
}
function waterShareUrl(item,page){
  const url=new URL(page);
  url.search='';
  if(item.live){url.hash=`water-live=${item.id}`;return url.href;}
  const fields=Object.fromEntries(Object.keys(WATER_EMPTY).map(key=>[key,item[key]]));
  const bytes=new TextEncoder().encode(JSON.stringify({v:1,id:item.id,event:fields}));
  url.hash=`water=${btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}`;
  return url.href;
}
function loadWaterItems(){
  try{
    const data=JSON.parse(localStorage.getItem(WATER_STORAGE)||'[]');
    if(!Array.isArray(data))return;
    waterItems=data.flatMap(row=>{
      if(!row||!WATER_ID.test(row.id||''))return [];
      const {item,errors}=validateWaterEvent(row);
      const liveKey=row.owned===true&&/^[a-f0-9]{64}$/.test(row.liveKey||'')?row.liveKey:'';
      return Object.keys(errors).length?[]:[{...item,id:row.id,owned:row.owned===true,live:row.live===true,liveKey,liveStatus:row.liveStatus,reportedAt:row.reportedAt,revision:row.revision,listed:row.listed===true}];
    });
  }catch{waterStoreOK=false;}
}
function saveWaterItems(){
  try{localStorage.setItem(WATER_STORAGE,JSON.stringify(waterItems));waterStoreOK=true;}
  catch{waterStoreOK=false;}
}
function waterScheduleStatus(item,now=Date.now()){
  const today=waterDate(now);
  if(item.date<today)return {status:'past',label:'종료된 일정',tone:''};
  if(item.date>today)return {status:'future',label:'예정 일정',tone:''};
  const clock=new Date(now+9*3600000).toISOString().slice(11,16);
  if(waterTimeIsValid(item.to)&&clock>=item.to)return {status:'past',label:'오늘 배부 시간 종료',tone:''};
  if(waterTimeIsValid(item.from)&&waterTimeIsValid(item.to)&&clock>=item.from&&clock<item.to)return {status:'now',label:'공지된 시간대 · 현장 미확인',tone:'orange'};
  return {status:'future',label:'오늘 예정',tone:'orange'};
}
function waterDistance(a,b){
  const rad=Math.PI/180;
  const hav=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
  return 12742*Math.asin(Math.sqrt(clamp(hav,0,1)));
}
function waterDirectory({mode=waterMode,district=waterDistrict,position=waterPosition,now=Date.now(),items=waterItems}={}){
  const today=waterDate(now);
  const all=mode==='mine'?items.map(item=>{
    const live=waterPublic.find(row=>row.id===item.id);
    return live?{...item,...live,owned:item.owned,liveKey:item.liveKey}:item;
  }):[...WATER_OFFICIAL,...waterPublic,...items.filter(item=>!item.owned&&!item.live)];
  return all.map(item=>({item,...waterDisplayStatus(item,now,waterConnection),distance:position&&item.lat!=null&&item.lng!=null?waterDistance(position,item):null}))
    .filter(({item,status,confirmed})=>{
      if(district!=='all'&&item.district!==district)return false;
      if(mode==='mine')return true;
      if(mode==='today')return item.date===today;
      if(mode==='now')return confirmed;
      if(mode==='future')return status==='future';
      return status===mode;
    }).sort((a,b)=>{
      if(mode==='today'&&a.confirmed!==b.confirmed)return a.confirmed?-1:1;
      if(position&&mode!=='past'&&a.distance!==b.distance)return a.distance===null?1:b.distance===null?-1:a.distance-b.distance;
      const order=(a.item.date+a.item.from).localeCompare(b.item.date+b.item.from);
      return mode==='past'?-order:order;
    });
}
function waterLink(label,href,kind=''){
  return `<a class="btn ${kind}" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`;
}
function waterCard({item,status,label,tone,distance=null},{highlight=false,manage=false,shared=false}={}){
  const district=item.district, location=item.address;
  const mapSearch=encodeURIComponent(`${location} ${item.place}`);
  const map=item.lat!=null&&item.lng!=null?`https://map.kakao.com/link/map/${encodeURIComponent(item.place)},${item.lat},${item.lng}`:`https://map.kakao.com/link/search/${mapSearch}`;
  const sourceLabel=item.official?'주최 기관 활동 기록':'주최자 공지';
  const formHost=item.signup?new URL(item.signup).hostname:'';
  return `<article class="card stack water-card${highlight?' water-closest':''}"><div class="actions">${pill(label,tone)}${pill(district)}${pill(item.official?'주최 기관 자료':item.owned?'내 행사':item.live?'주최자 현장 제보':'공유된 주최자 안내')}${highlight?pill('거리순 첫 장소','green'):''}</div>
  <h3>${escapeHTML(item.name)}</h3><p class="muted small">${escapeHTML(item.organizer)}</p>
  <div class="water-facts"><div><b>배부 장소</b><p>${escapeHTML(item.place)}<br><span class="muted small">${escapeHTML(location)}</span></p></div><div><b>일정</b><p>${escapeHTML(item.date)}${item.from?` · ${escapeHTML(item.from)}–${escapeHTML(item.to)}`:''}${distance===null?'':`<br><span class="muted small">직선거리 약 ${distance<1?`${Math.round(distance*1000)}m`:`${distance.toFixed(1)}km`}</span>`}</p></div></div>
  ${item.note?`<p class="small">${escapeHTML(item.note)}</p>`:''}
  ${item.live&&item.reportedAt?`<p class="small muted">주최자 마지막 현장 갱신 · ${waterReportedTime(item.reportedAt)}</p>`:''}
  ${manage&&item.owned&&!item.live?'<p class="small muted">이 기기에 저장된 초안입니다. 공개하면 방문자가 현장 상태를 확인할 수 있습니다.</p>':''}
  <div class="actions">${status!=='past'?waterLink('지도에서 장소 보기',map):''}${status!=='past'&&item.signup?waterLink(`봉사 신청 (${formHost})`,item.signup,'secondary'):''}${item.source?waterLink(sourceLabel,item.source):''}${shared?button('이 기기에 일정 저장','save-shared-water',{kind:'secondary'}):''}${manage&&item.owned?button('일정·장소 수정','water-edit',{value:item.id,mark:'edit'}):''}${manage&&item.owned?button(item.live?'현장 상태판':'행사 공개','water-manage',{value:item.id,kind:'primary'}):''}${!shared&&!item.official?button('행사·모집 링크','water-share',{value:item.id,mark:'pin'}):''}${manage&&!(item.owned&&item.live)?button('목록에서 삭제','water-remove',{value:item.id}):''}</div>${shared?`<div class="actions">${button('배부 중인 다른 행사 찾기','water-now',{kind:'secondary',mark:'pin'})}${button('가까운 배부 장소 찾기','water-live-near',{mark:'pin'})}</div>`:''}</article>`;
}
function waterResults(){
  const results=waterDirectory(), first=results.find(result=>result.distance!==null);
  const closest=waterPosition&&waterMode==='now'?first:null;
  const empty={today:'오늘 등록된 행사가 없습니다.',now:'현재 배부 중으로 확인된 행사가 없습니다.',future:'확인할 수 있는 예정 일정이 없습니다.',past:'이 조건에 해당하는 지난 일정이 없습니다.',mine:'이 기기에 만든 행사나 저장한 공유 일정이 없습니다.'};
  const copy=results.length?`${results.length}건${waterPosition&&waterMode!=='past'?' · 좌표가 있는 행사를 직선거리순으로 표시':''}`:empty[waterMode];
  const connectionText=waterConnection==='loading'?'공개 현장 상태를 불러오는 중입니다.':'현장 상태에 연결하지 못했습니다. 최신 배부 여부는 확인이 필요합니다.';
  return `${waterConnection==='ok'?'':`<p class="small muted" role="status">${connectionText}</p>`}<p id="water-result-count" class="shelter-count" role="status">${copy}</p>${waterPosition&&waterMode==='now'&&results.length&&!closest?notice('목록에 좌표가 있는 행사가 없습니다. 주소로 지도에서 위치를 확인하세요.','warn'):''}${results.length?`<div class="water-grid">${results.map(row=>waterCard(row,{highlight:row===closest,manage:waterMode==='mine'})).join('')}</div>`:''}${(!results.length&&['now','today','future'].includes(waterMode))?`<div class="card actions">${waterMode==='now'?button('오늘 전체 일정 보기','water-today'):''}${button('대구 무더위쉼터 찾기','nearby',{kind:'secondary',mark:'pin'})}${waterLink('대구자원봉사센터 공지', 'https://dgvolunteer.co.kr/')}</div>`:''}`;
}
function waterEventsPage(){
  const areas={all:'대구광역시 전체',...Object.fromEntries(DAEGU_DISTRICTS.map(area=>[area,area]))};
  return `${pageHeading('대구광역시','무료 물 나눔 행사','더운 날 시원한 물을 받을 배부 장소를 찾거나, 직접 행사를 열어 봉사자를 모집하세요.')}<div class="stack">
  ${waterStoreOK?'':notice('이 브라우저에서 일정 저장을 사용할 수 없어, 새로고침 전까지 현재 탭에서만 일정을 볼 수 있습니다.','warn')}
  <section class="card stack water-intro"><div class="actions water-visitor-actions">${button('배부 중인 행사 보기','water-now',{kind:'primary'})}${button('내 주변 배부 장소 찾기','water-locate',{mark:'pin'})}</div><p class="muted small">위치는 허용한 경우에만 거리 계산에 사용합니다. 공유 링크나 기록에 저장하지 않습니다.</p><p id="water-location-status" class="small" role="status">${escapeHTML(waterPositionMessage)}</p><div class="actions water-organizer-actions">${button('행사 등록·현장 상태판','water-owner',{kind:'secondary',mark:'edit'})}${waterPosition||waterLocating?button('위치 사용 끄기','water-forget-position'):''}</div></section>
  <section class="card stack"><h2>배부 일정</h2><div class="form-grid compact-filters"><label class="field">대구 구·군<select name="water-filter-district">${optionList(areas,waterDistrict)}</select></label><label class="field">일정 보기<select name="water-filter-mode">${optionList(WATER_MODES,waterMode)}</select></label></div><p class="muted small">현장 상태는 주최자가 기록하며 화면을 열어 두면 15초마다 확인합니다. 배부 중 표시는 마지막 확인 후 45분 동안 유효합니다.</p>${waterMode==='mine'?`<div class="actions">${button('새 행사 등록','water-new',{kind:'primary',mark:'edit'})}</div>`:''}</section>
  <div id="water-results" class="stack">${waterResults()}</div><div class="actions">${button('대응시설 안내','nearby')}</div></div>`;
}
function waterInput(key,{type='text',placeholder=''}={}){
  const required=WATER_REQUIRED.includes(key), error=waterErrors[key], value=escapeHTML(waterDraft[key]);
  const attr=`name="water-${key}" id="water-${key}" ${required?'required':''} ${error?'aria-invalid="true" aria-describedby="water-error-'+key+'"':''}`;
  let control;
  if(key==='district')control=`<select ${attr}>${optionList(Object.fromEntries(DAEGU_DISTRICTS.map(area=>[area,area])),waterDraft[key],true)}</select>`;
  else if(key==='note')control=`<textarea ${attr} maxlength="160" placeholder="${placeholder}">${value}</textarea>`;
  else control=`<input ${attr} type="${type}" value="${value}" placeholder="${placeholder}" ${type==='number'?'step="any" inputmode="decimal"':WATER_LIMITS[key]||type==='url'?`maxlength="${WATER_LIMITS[key]||250}"`:''}>`;
  return `<label class="field" for="water-${key}"><span>${WATER_LABELS[key]} ${required?'<small>필수</small>':'<small>선택</small>'}</span>${control}${error?`<small id="water-error-${key}" class="water-field-error">${escapeHTML(error)}</small>`:''}</label>`;
}
function waterFormPage(){
  return `${pageHeading('행사 준비',waterEditId?'물 나눔 행사 수정':'물 나눔 행사 안내 만들기','날짜와 공개 배부 장소를 등록해 시민에게 보낼 안내 링크를 만드세요.')}<form id="water-form" class="form-shell stack" novalidate>
  ${Object.keys(waterErrors).length?notice('표시된 항목을 확인하세요.','red','alert'):''}<section class="card stack"><h2>무료 배부 일정</h2><div class="form-grid">${waterInput('name')}${waterInput('organizer')}${waterInput('district')}${waterInput('place',{placeholder:'예: 공원 정문 안내 부스'})}${waterInput('address',{placeholder:'예: 도로명과 건물 번호'})}${waterInput('date',{type:'date'})}${waterInput('from',{type:'time'})}${waterInput('to',{type:'time'})}</div>${waterInput('note',{placeholder:'누가 받을 수 있는지, 준비 수량 소진 시 종료 여부 등을 적어주세요.'})}</section>
  <details${waterFormLocationMessage||waterErrors.lat||waterErrors.lng?' open':''}><summary>가까운 행사 검색에 사용할 장소 좌표</summary><div class="stack"><p class="small muted">행사 장소에 있을 때 좌표를 가져오거나 지도에서 확인한 위도·경도를 입력하세요. 이 좌표는 안내 링크에 공개됩니다.</p><div class="actions">${button('현재 위치를 배부 장소 좌표로 넣기','water-venue-location',{mark:'pin'})}</div><p id="water-venue-status" role="status" class="small">${escapeHTML(waterFormLocationMessage)}</p><div class="form-grid">${waterInput('lat',{type:'number'})}${waterInput('lng',{type:'number'})}</div></div></details>
  <section class="card stack"><h2>봉사 모집과 변경 공지</h2><p class="muted small">봉사 신청을 받으려면 주최자가 준비한 공개 신청 폼을 연결하세요. 방문객은 안내 링크에서 무료 배부 장소와 시간을 확인할 수 있습니다.</p><div class="form-grid">${waterInput('signup',{type:'url',placeholder:'https://'})}${waterInput('source',{type:'url',placeholder:'https://'})}</div></section>
  <p id="water-form-status" role="status" class="small muted">공개 장소와 단체명만 입력하세요.</p><div class="actions"><button type="submit" class="btn primary">${waterItems.find(row=>row.id===waterEditId)?.live?'공개 일정 변경 저장':'초안 저장'}</button>${button('행사 목록','water-owner')}</div></form>`;
}
function waterSharedPage(){
  const r=sharedWater;
  if(waterLiveId&&!r){
    const text={loading:'주최자의 현장 상태를 불러오는 중입니다.',missing:'공개된 물 나눔 행사를 찾을 수 없습니다.',offline:'현장 상태에 연결하지 못했습니다.'}[waterSharedConnection];
    return `${pageHeading('물 나눔','무료 물 나눔 행사')}<div class="card stack"><p role="status">${text||''}</p><div class="actions">${button('다시 확인','water-refresh')}${button('배부 중인 다른 행사 찾기','water-now',{kind:'secondary'})}</div></div>`;
  }
  if(sharedWaterError||!r)return `${pageHeading('물 나눔','공유 링크를 확인해 주세요','행사 정보가 없거나 링크 형식이 올바르지 않습니다.')}<div class="actions">${button('대구 물 나눔 일정','water-events',{kind:'secondary'})}</div>`;
  return `${pageHeading('공유된 일정','무료 물 나눔 행사',r.live?'주최자의 현장 상태를 15초마다 확인합니다.':'주최자가 공유한 장소와 시간입니다. 방문 전에 변경 여부를 확인하세요.')}<div class="stack water-shared">${waterCard({item:r,...waterDisplayStatus(r,Date.now(),waterSharedConnection)},{shared:true})}<div class="actions">${button('대구 물 나눔 일정 더 보기','water-today',{kind:'secondary'})}</div></div>`;
}
function refreshWaterResults(announce=true){
  const target=$('#water-results');if(!target)return;
  const focused=document.activeElement;
  const action=target.contains(focused)&&focused.dataset.action;
  const value=action&&focused.dataset.value;
  const html=waterResults();
  if(target.dataset.rendered===html&&!announce)return;
  target.dataset.rendered=html;target.innerHTML=html;
  if(action){[...target.querySelectorAll('[data-action]')].find(control=>control.dataset.action===action&&control.dataset.value===value)?.focus({preventScroll:true});}
  if(announce)setLive($('#water-result-count').textContent);
}
function requestWaterLocation(venue=false){
  if(!venue&&waterLocating)return;
  const initialDraft=waterDraft, messageId=venue?'#water-venue-status':'#water-location-status', request=++waterLocationRequest;
  const setMessage=message=>{if(venue)waterFormLocationMessage=message;else waterPositionMessage=message;const target=$(messageId);if(target)target.textContent=message;};
  if(!window.isSecureContext||!navigator.geolocation){setMessage('위치 기능은 HTTPS로 열린 사이트에서 사용할 수 있습니다. 구·군을 직접 선택할 수 있어요.');return;}
  if(!venue)waterLocating=true;
  setMessage('브라우저에서 위치 사용을 확인하고 있습니다.');
  navigator.geolocation.getCurrentPosition(({coords})=>{
    if(request!==waterLocationRequest)return;
    if(venue){
      if(view!=='water-form'||waterDraft!==initialDraft)return;
      waterDraft.lat=coords.latitude.toFixed(5);waterDraft.lng=coords.longitude.toFixed(5);
      $('#water-lat').value=waterDraft.lat;$('#water-lng').value=waterDraft.lng;
      setMessage('장소 좌표를 입력했습니다. 안내 링크에 포함하기 전에 배부 장소가 맞는지 확인하세요.');
    }else{
      waterLocating=false;waterPosition={lat:coords.latitude,lng:coords.longitude};
      waterMode='now';waterDistrict='all';setMessage('대구 전체에서 현재 위치 기준 직선거리로 표시합니다. 실제 이동 거리와 다를 수 있습니다.');
      if(view==='water-events'){
        render(false,compactScreen.matches?null:'[name="water-filter-mode"]');
        if(compactScreen.matches)focusSection($('#water-results'));
      }
    }
  },error=>{
    if(request!==waterLocationRequest||(venue&&waterDraft!==initialDraft))return;
    if(!venue)waterLocating=false;
    setMessage(error.code===1?'위치 권한을 사용할 수 없습니다. 구·군을 직접 선택해 찾을 수 있어요.':'위치를 확인하지 못했습니다. 잠시 뒤 다시 시도하거나 구·군을 직접 선택하세요.');
  },{timeout:8000,maximumAge:60000});
}
function newWaterDraft(id){
  const entry=id?waterItems.find(row=>row.id===id&&row.owned):null;
  if(id&&!entry)return;
  waterDraft={...WATER_EMPTY,...(entry||{date:waterDate()})};waterEditId=entry?.id||null;waterErrors={};waterFormLocationMessage='';
  navigate('water-form');
}
function openWaterShare(id){
  const item=waterPublic.find(row=>row.id===id)||waterItems.find(row=>row.id===id);if(!item)return;
  const deployed=window.location.protocol==='https:'||item.live;
  const page=window.location.protocol==='https:'?location.href:new URL(WATER_API).origin;
  const share=deployed?waterShareUrl(item,page):'';
  const details=item.live?'같은 링크에서 장소 변경과 최신 배부 상태를 확인할 수 있습니다.':'일정만 담긴 링크입니다. 현장 상태를 공유하려면 행사를 공개하고 공개 링크를 보내세요.';
  showDialog('행사·모집 링크',`<div class="stack"><p><b>${escapeHTML(item.name)}</b> · ${escapeHTML(item.date)} · ${escapeHTML(item.place)}</p><p class="small muted">${details}${item.signup?' 봉사 신청은 연결한 외부 폼에서 접수됩니다.':''}</p>${deployed?'':`<label class="field">이 개선판을 올린 공개 사이트 주소<input id="water-share-base" type="url" placeholder="https://계정.github.io/저장소/"></label>${button('공개 주소로 링크 만들기','water-build-link',{value:id})}`}<label class="field">공유 주소<input id="water-share-url" readonly value="${escapeHTML(share)}"></label><div class="actions">${button('링크 복사','water-copy',{kind:'primary'})}${button('닫기','dismiss')}</div><p id="water-share-status" role="status" class="small muted"></p></div>`);
}
async function copyWaterShare(){
  const field=$('#water-share-url'), status=$('#water-share-status');
  if(!field.value){status.textContent='먼저 공개 사이트 주소로 링크를 만드세요.';$('#water-share-base')?.focus();return;}
  try{await navigator.clipboard.writeText(field.value);status.textContent='행사 링크를 복사했습니다.';}
  catch{field.focus();field.select();status.textContent='선택한 주소를 복사해 공유하세요.';}
}
function waterReportedTime(timestamp){
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(timestamp);
}
function waterDisplayStatus(item,now,connection){
  const schedule=waterScheduleStatus(item,now);
  if(!item.live)return schedule;
  if(connection!=='ok')return {...schedule,label:'최신 현장 상태 확인 필요',tone:'orange'};
  if(item.liveStatus==='open'){
    if(schedule.status==='past')return schedule;
    if(schedule.status!=='now'||!item.reportedAt||now-item.reportedAt>=WATER_FRESH_MS)return {...schedule,label:'배부 상태 재확인 필요',tone:'orange'};
    return {...schedule,label:'배부 중',tone:'green',confirmed:true};
  }
  if(item.liveStatus==='pending'&&schedule.status!=='now')return schedule;
  const [label,tone]=WATER_LIVE_STATUS[item.liveStatus]||WATER_LIVE_STATUS.pending;
  return {...schedule,label,tone};
}
async function waterRequest(path='',{method='GET',key,data}={}){
  const headers={};
  if(key)headers.Authorization=`Bearer ${key}`;
  if(data)headers['Content-Type']='application/json';
  const response=await fetch(`${WATER_API}${path}`,{method,headers,body:data?JSON.stringify(data):undefined,cache:'no-store',signal:AbortSignal.timeout(7000)});
  const result=await response.json();
  if(!response.ok)throw Object.assign(new Error(result.error||'unavailable'),{status:response.status,latest:result.latest});
  return result;
}
function parseWaterLive(row){
  if(!row||typeof row.id!=='string'||!WATER_ID.test(row.id)||!Object.hasOwn(WATER_LIVE_STATUS,row.status)||!row.event||!Number.isInteger(row.revision))return null;
  const {item,errors}=validateWaterEvent(row.event);
  if(Object.keys(errors).length)return null;
  return {...item,id:row.id,live:true,liveStatus:row.status,reportedAt:Number.isSafeInteger(row.reportedAt)&&row.reportedAt>0?row.reportedAt:null,revision:row.revision,listed:row.listed===true};
}
function rememberWaterLive(item){
  const local=waterItems.find(row=>row.id===item.id);
  if(!local||Number(local.revision)>item.revision)return;
  Object.assign(local,item);saveWaterItems();
}
function updateWaterPublic(item){
  const index=waterPublic.findIndex(row=>row.id===item.id);
  if(index>=0&&waterPublic[index].revision>item.revision)return;
  if(index>=0)waterPublic.splice(index,1);
  if(item.listed)waterPublic.push(item);
  rememberWaterLive(item);
}
async function refreshWaterLive(){
  if(document.hidden||waterRefreshing||waterBusy)return;
  if(view!=='water-events'&&(view!=='water-shared'||!waterLiveId))return;
  waterRefreshing=true;
  const id=view==='water-shared'?waterLiveId:'';
  const previous=id?JSON.stringify([waterSharedConnection,sharedWater,sharedWater&&waterDisplayStatus(sharedWater,Date.now(),waterSharedConnection)]):'';
  try{
    if(id){
      const item=parseWaterLive(await waterRequest(`/${id}`));
      if(!item)throw Error('unavailable');
      if(waterLiveId!==id)return;
      sharedWater=item;waterSharedConnection='ok';rememberWaterLive(item);
    }else{
      const result=await waterRequest();
      if(!Array.isArray(result.events))throw Error('unavailable');
      const byId=new Map(waterPublic.map(item=>[item.id,item]));
      waterPublic=result.events.map(parseWaterLive).filter(Boolean).map(item=>{
        const cached=byId.get(item.id);
        return cached&&cached.revision>item.revision?cached:item;
      });
      waterPublic.forEach(rememberWaterLive);
      waterConnection='ok';
    }
  }catch(error){
    if(!id)waterConnection='offline';
    else if(waterLiveId===id){waterSharedConnection=error.status===404?'missing':'offline';if(error.status===404)sharedWater=null;}
  }finally{
    waterRefreshing=false;
    if(view==='water-events')refreshWaterResults(false);
    if(view==='water-shared'&&waterLiveId===id){
      const current=JSON.stringify([waterSharedConnection,sharedWater,sharedWater&&waterDisplayStatus(sharedWater,Date.now(),waterSharedConnection)]);
      if(current!==previous||$('#main').dataset.waterShared!==current){$('#main').dataset.waterShared=current;render(false);}
    }
    if(view==='water-shared'&&waterLiveId&&waterLiveId!==id&&waterSharedConnection==='loading')refreshWaterLive();
    if(view==='water-events'&&id&&waterConnection==='loading')refreshWaterLive();
  }
}
function waterError(error){
  if(error.status===409)return '다른 화면에서 먼저 변경했습니다. 상태판을 다시 열어 최신 상태를 확인하세요.';
  if(error.status===422)return '공지된 배부 시간에만 배부 중으로 표시할 수 있습니다. 시간을 먼저 수정할 수 있습니다.';
  if(error.status===400)return '행사 날짜와 입력 정보를 확인하세요.';
  if(error.status===403)return '이 브라우저에서 행사 관리 권한을 확인할 수 없습니다.';
  return '서버에 연결하지 못했습니다. 같은 버튼으로 다시 시도하세요.';
}
function waterManager(id){
  const item=waterItems.find(row=>row.id===id&&row.owned);if(!item)return;
  if(!item.live){
    showDialog('물 나눔 행사 공개',`<div class="stack"><p><b>${escapeHTML(item.name)}</b></p><p>행사 이름, 단체명, 장소, 일정과 등록한 공개 링크가 대구 물 나눔 목록에 표시됩니다. 상태판은 이 브라우저에서 관리합니다.</p><div class="actions">${button('대구 행사 목록에 공개','water-publish',{value:id,kind:'primary'})}${button('닫기','dismiss')}</div><p id="water-manager-status" class="small" role="status"></p></div>`);
    return;
  }
  const options=[['open','배부 중'],['paused','잠시 중단'],['empty','물 소진'],['closed','배부 종료']];
  const [label,tone]=WATER_LIVE_STATUS[item.liveStatus]||WATER_LIVE_STATUS.pending;
  showDialog('주최자 현장 상태판',`<div class="stack"><p><b>${escapeHTML(item.name)}</b> ${pill(label,tone)}</p>${item.reportedAt?`<p class="muted small">마지막 현장 갱신 · ${waterReportedTime(item.reportedAt)}</p>`:''}<p class="small">변경 내용은 같은 공유 링크에 반영됩니다. 장소가 바뀌면 ‘일정·장소 수정’에서 새 장소를 저장하세요.</p><div class="actions water-status-controls">${options.map(([status,label])=>button(label,'water-report',{value:`${id}:${status}`,kind:status==='open'?'primary':'secondary'})).join('')}</div><div class="actions">${button('일정·장소 수정','water-manage-edit',{value:id,mark:'edit'})}${button('공개 링크','water-share',{value:id})}${button('닫기','dismiss')}</div><p id="water-manager-status" class="small" role="status"></p></div>`);
}
async function waterMutation(item,{method='PATCH',data,statusField,after,control}){
  if(waterBusy)return;
  waterBusy=true;
  if(control)control.disabled=true;
  statusField.textContent='서버에 저장 중입니다.';
  try{
    let revision=item.revision;
    if(method==='PATCH'){
      const latest=parseWaterLive(await waterRequest(`/${item.id}`));
      if(!latest)throw Error('unavailable');
      if(latest.revision!==revision)throw Object.assign(Error('conflict'),{status:409,latest});
      revision=latest.revision;
    }
    const path=method==='POST'?'':`/${item.id}`;
    const result=parseWaterLive(await waterRequest(path,{method,key:item.liveKey,data:{...data,revision}}));
    if(!result)throw Error('unavailable');
    updateWaterPublic(result);after(result);
  }catch(error){
    const latest=error.latest?.live?error.latest:parseWaterLive(error.latest);
    if(latest)updateWaterPublic(latest);
    statusField.textContent=waterError(error);
  }finally{
    waterBusy=false;
    if(control)control.disabled=false;
    if(view==='water-events')refreshWaterLive();
  }
}
function publishWater(id,control){
  const item=waterItems.find(row=>row.id===id&&row.owned);if(!item||item.live||waterBusy)return;
  const statusField=$('#water-manager-status');
  if(!globalThis.crypto?.getRandomValues){statusField.textContent='보안 연결이 지원되는 브라우저에서 열어 주세요.';return;}
  item.liveKey||=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
  saveWaterItems();
  if(!waterStoreOK){statusField.textContent='이 브라우저에 관리 권한을 저장할 수 없습니다. 사이트 저장을 허용해 주세요.';return;}
  const event=Object.fromEntries(Object.keys(WATER_EMPTY).map(field=>[field,item[field]]));
  waterMutation(item,{method:'POST',data:{id,event,listed:true},statusField,control,after:()=>{
    refreshWaterResults();if(!statusField.isConnected||!$('#dialog').open)return;
    waterManager(id);$('#water-manager-status').textContent='대구 행사 목록에 공개했습니다.';
  }});
}
function reportWater(value,control){
  const [id,status]=value.split(':');
  const item=waterItems.find(row=>row.id===id&&row.owned&&row.live);
  if(!item||!Object.hasOwn(WATER_LIVE_STATUS,status))return;
  const statusField=$('#water-manager-status');
  waterMutation(item,{data:{status},statusField,control,after:()=>{
    refreshWaterResults();if(!statusField.isConnected||!$('#dialog').open)return;
    waterManager(id);$('#water-manager-status').textContent='현장 상태를 저장했습니다.';
    $('#dialog [data-value="'+id+':'+status+'"]')?.focus();
  }});
}
loadWaterItems();

function settingsPage() {
  const p=store.prefs;
  return `${pageHeading('사용자 설정','환경 설정','테마와 글자 크기, 안전 코치 기본값을 변경할 수 있습니다.')}<div class="form-shell stack">
    <section class="card stack"><h2>화면 표시</h2><div><h3>기본 테마</h3>${radios('theme',{light:'밝은 화면',dark:'저조도'},p.theme)}</div><div><h3>훈련실 테마</h3>${radios('room-theme',{light:'밝은 화면',dark:'저조도'},p.room)}</div><label class="field" for="scale">글자 크기 <output id="scale-label">${p.scale}%</output><input type="range" id="scale" name="scale" min="90" max="130" step="5" value="${p.scale}"></label><label class="check-row"><input type="checkbox" name="reduce" ${p.reduce?'checked':''}>애니메이션 최소화</label></section>
    ${coachForm(p.coach,p.tone)}<p class="muted small">코치 설정은 새로 시작하는 훈련에 적용됩니다.</p></div>`;
}
function showDialog(title,content) {
  const dialog=$('#dialog');
  dialog.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2>${smallButton('닫기','dismiss','close')}</div>${content}`;
  if (!dialog.open) dialog.showModal();
  else {
    const heading=$('#dialog-title');
    heading.tabIndex=-1;heading.focus({preventScroll:true});dialog.scrollTop=0;
  }
}
const dismiss = () => {if ($('#dialog').open) $('#dialog').close();};
const confirm = (title,text,label,action,value='') => showDialog(title,`<div class="stack"><p>${text}</p><div class="actions">${button(label,action,{value,kind:'danger'})}${button('돌아가기','dismiss')}</div></div>`);
function shareScenario(id) {
  if(!Object.hasOwn(SCENARIOS,id))return;
  if(location.protocol==='file:'){
    showDialog('시나리오 공유',`<div class="stack"><p>GitHub Pages에 업로드한 뒤 공개 주소에서 이 버튼을 사용하면 ${SCENARIOS[id].name} 바로가기 링크를 만들 수 있습니다.</p>${button('확인','dismiss')}</div>`);
    return;
  }
  const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('scenario',id);
  showDialog('시나리오 공유',`<div class="stack"><p>${SCENARIOS[id].name} · 가상 복지관 기본 설정</p><label class="field">공유 링크<input id="share-url" readonly value="${escapeHTML(url.href)}"></label><div class="actions">${button('링크 복사','copy-share',{kind:'primary'})}${button('닫기','dismiss')}</div><p id="share-status" role="status" class="small muted"></p></div>`);
}
function reportDialog(){
  const r=run(),s=r.state, checked=assessRun(s,r.facility,r.config,r.history);
  const events=checked.pending.map(id=>EVENTS[id].name), after=r.aftercare||{};
  showDialog('폭염 대응 훈련 보고서',`<div class="stack print-body"><p>${SCENARIOS[r.config.scenario].name} · 대구 복지관 · ${time(r.created)}</p><div class="metrics">${metric('추가 보호 필요',`${s.people-protectedCount(s)}명`)}${metric('열 노출 저감',`${protectedCount(s)} / ${s.people}명`)}${metric('기본 과제',`${checked.achieved}/${checked.goals.length}`)}${metric('가상 경과',`${s.minute}분`)}</div><h3>우선 점검</h3><p>${[...checked.critical,...events].join(' · ')||'별도로 표시된 중대 조치와 돌발상황 없음'}</p><p>${nextResponse(r,checked)}</p><dl><dt>담당 역할</dt><dd>${escapeHTML(after.role)||'미지정'}</dd><dt>다음 점검일</dt><dd>${escapeHTML(after.date)||'미지정'}</dd></dl><p class="small muted">교육용 가상훈련 · 규칙 ${r.rules} · 시설 안전성은 별도로 점검하세요.</p><div class="actions">${button('인쇄 또는 PDF 저장','print-report',{kind:'primary'})}${button('닫기','dismiss')}</div></div>`);
}
function downloadBackup() {
  const data={format:'heat-check-ai-records',version:2,records:store.runs};
  const href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=href;link.download=`heat-check-ai-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function boundedText(value,max) {return typeof value==='string'?value.slice(0,max):'';}
function backedPlan(value) {
  const p=value||{};
  const items=Object.fromEntries(AREAS.map(([id])=>[id,boundedText(p.items?.[id],700)]));
  const confirmed=Object.fromEntries(AREAS.map(([id])=>[id,p.confirmed?.[id]===true]));
  return {kind:Object.hasOwn(PLAN_NAMES,p.kind)?p.kind:'none',text:boundedText(p.text,8000),items,confirmed};
}
function backedState(raw,template){
  const state={...template};
  for(const key of Object.keys(template)){
    const value=raw?.[key], fallback=template[key];
    if(Array.isArray(fallback)){
      const choices=key==='done'?actions:EVENTS;
      if(Array.isArray(value))state[key]=[...new Set(value.filter(id=>typeof id==='string'&&Object.hasOwn(choices,id)))];
    }else if(typeof fallback==='number'||fallback===null){
      if(Number.isInteger(value)&&value>=0&&value<=25000)state[key]=value;
    }else if(typeof fallback==='boolean')state[key]=value===true;
    else if(typeof value==='string'&&value.length<90)state[key]=value;
  }
  return state;
}
function backedHistory(entries,f,config,initial){
  if(!Array.isArray(entries)||entries.length>11)throw Error('잘못된 행동 기록입니다.');
  let state=initial;
  return entries.map(raw=>{
    if(!Object.hasOwn(actions,raw?.id))throw Error('확인할 수 없는 행동이 포함되어 있습니다.');
    if(config.rules===RULES){
      const calculated=step(state,f,config,raw.id);if(!calculated)throw Error('현재 규칙과 일치하지 않는 행동 기록입니다.');
      state=calculated.after;return calculated;
    }
    const before=backedState(raw.before,initial),after=backedState(raw.after,initial);
    return {id:raw.id,at:before.minute,elapsed:Math.max(0,after.minute-before.minute),before,after,ok:raw.ok===true,message:boundedText(raw.message,500),events:after.events.filter(id=>!before.events.includes(id))};
  });
}
function backupSignature(r){
  return JSON.stringify([r.rules,r.created,r.config.scenario,r.config.mode,r.config.depth,r.facility,backedPlan(r.plan),r.improvedPlan?backedPlan(r.improvedPlan):null,r.aftercare?.role||'',r.aftercare?.date||'',r.status==='active'?'paused':r.status,r.history.map(row=>row.id),r.branches.map(b=>[b.point,b.closed,b.history.map(row=>row.id)])]);
}
function importRecords(raw){
  const pack=JSON.parse(raw);
  if(pack?.format!=='heat-check-ai-records'||pack.version!==2||!Array.isArray(pack.records))throw Error('HEAT CHECK AI 기록 백업 파일을 선택하세요.');
  const checked=[], ids=new Map();
  for(const entry of pack.records){
    if(typeof entry?.id!=='string'||!/^[a-z0-9_-]{1,100}$/i.test(entry.id)||ids.has(entry.id)||!['1.0',RULES].includes(entry.rules))throw Error('기록 형식이나 규칙 버전을 확인하세요.');
    const config={scenario:entry.config?.scenario,mode:entry.config?.mode,depth:entry.config?.depth,rules:entry.rules};
    if(!Object.hasOwn(SCENARIOS,config.scenario)||!Object.hasOwn(DEPTH,config.depth)||!Object.hasOwn(MODE,config.mode))throw Error('시나리오 설정이 올바르지 않습니다.');
    const f=normalizeFacility(Object.fromEntries(Object.keys(EMPTY).map(key=>[key,entry.facility?.[key]??EMPTY[key]])));
    if(Object.keys(facilityErrors(f)).length)throw Error('시설 정보가 올바르지 않습니다.');
    f.notes=boundedText(f.notes,500);f.hours=boundedText(f.hours,40);
    for(const key of ['lift','route','power','backupCooling','water','comms','equipment','night'])if(!Object.hasOwn(OPTIONS,f[key]))f[key]='unknown';
    const template=initialState(f,config), initial=config.rules===RULES?template:backedState(entry.initial,template);
    const history=backedHistory(entry.history,f,config,initial);
    if(config.rules===RULES&&history.length>decisionLimit(config,history))throw Error('이 기록의 훈련 판단 횟수를 확인하세요.');
    const branches=(Array.isArray(entry.branches)?entry.branches:[]).map(b=>{
      if(!Number.isInteger(b.point)||b.point<0||!history[b.point]||!b.history?.length)throw Error('대체 경로의 분기점을 확인할 수 없습니다.');
      const rows=backedHistory(b.history,f,config,history[b.point].before);
      const all=[...history.slice(0,b.point),...rows];
      if(config.rules===RULES&&all.length>decisionLimit(config,all))throw Error('대체 경로의 판단 횟수를 확인하세요.');
      return {id:newId(),point:b.point,history:rows,state:rows.at(-1).after,closed:b.closed===true};
    });
    const candidate={id:entry.id,created:Number.isFinite(entry.created)&&entry.created>=0&&entry.created<=8640000000000000?entry.created:Date.now(),rules:entry.rules,facility:f,config,plan:backedPlan(entry.plan),coach:Object.hasOwn(COACHES,entry.coach)?entry.coach:'robot',tone:Object.hasOwn(TONES,entry.tone)?entry.tone:'warm',quick:entry.quick===true,parentId:entry.parentId,initial,state:history.at(-1)?.after||initial,history,branches,improvedPlan:entry.improvedPlan?backedPlan(entry.improvedPlan):null,status:entry.status==='active'?'paused':Object.hasOwn(STATUS,entry.status)?entry.status:'incomplete',aftercare:{role:boundedText(entry.aftercare?.role,80),date:boundedText(entry.aftercare?.date,10)}};
    const same=store.runs.find(r=>(r.id===entry.id||r.importedFrom===entry.id)&&backupSignature(r)===backupSignature(candidate));
    if(same){ids.set(entry.id,same.id);continue;}
    if(recordBy(candidate.id)){candidate.importedFrom=entry.id;candidate.id=newId();}
    ids.set(entry.id,candidate.id);checked.push(candidate);
  }
  for(const r of checked){r.parentId=ids.get(r.parentId)||null;store.runs.push(r);}
  return checked.length;
}
const pages={home:homePage,scenarios:scenariosPage,coach:coachPage,facility:facilityPage,plan:planPage,setup:setupPage,training:trainingPage,results:resultsPage,whatif:whatIfPage,'fork-training':trainingPage,'fork-result':forkResultPage,improve:improvePage,compare:comparePage,review:reviewPage,records:recordsPage,guide:guidePage,nearby:nearbyPage,'water-events':waterEventsPage,'water-form':waterFormPage,'water-shared':waterSharedPage,settings:settingsPage};

function startDraft(quick,scenario) {
  if (store.draft) {
    const saved=store.draft;
    showDialog('입력 중인 훈련이 있어요',`<div class="stack"><p>${SCENARIOS[saved.config.scenario].name} 준비 내용이 있습니다. 새 훈련을 시작하면 기존 설정은 기록의 임시저장에 보관합니다.</p><div class="actions">${button('작성 중인 설정 이어하기','resume-draft',{kind:'secondary'})}${button('보관하고 새 설정 시작','new-draft',{value:quick?scenario||'cooling':'custom',kind:'primary'})}${button('취소','dismiss')}</div></div>`);
    return;
  }
  store.draft=newDraft(quick,scenario);draftTo(store.draft.stage);
}
function validDraft(stage) {
  const result=facilityErrors(normalizeFacility(store.draft.facility));
  if (!Object.keys(result).length) return true;
  view='facility';store.draft.stage='facility';errors=result;persist();render(stage==='setup');
  const error=$(`#field-${Object.keys(result)[0]}`);
  const details=error?.closest('details');if(details)details.open=true;
  error?.focus();return false;
}
function finishRun(status) {
  run().status=status;
  navigate('results');
}
function recordAction(id,inFork) {
  if (performance.now()<proceedLock) return;
  const r=run(), target=inFork?branch():r;
  if (!target || (!inFork&&!isOpen(r)) || (inFork&&target.closed)) return;
  const entry=step(target.state,r.facility,r.config,id);
  if (!entry) return;
  proceedLock=performance.now()+270;
  target.history.push(entry);target.state=entry.after;
  const used=target.history.length+(inFork?target.point:0);
  setLive(`${actions[id].label}. ${entry.message} 가상 ${target.state.minute}분 경과.`);
  if (used>=decisionLimit(r.config,withPrefix(r,inFork?target:null))) {
    if (inFork) {target.closed=true;navigate('fork-result');} else finishRun('complete');
  } else {
    persist();render();focusSection($('#last-update'),compactScreen.matches?'start':'nearest');
  }
}
function updateImprovement() {run().improvedPlan=COPY(improvement);persist();}
function fieldChange(target,fromChange) {
  const key=target.name, value=target.type==='checkbox'?target.checked:target.value;
  if (!key) return;
  if(view==='water-events'&&fromChange&&key==='water-filter-district'){waterDistrict=value;refreshWaterResults();return;}
  if(view==='water-events'&&fromChange&&key==='water-filter-mode'){waterMode=value;refreshWaterResults();return;}
  if(view==='water-form'&&key.startsWith('water-')&&Object.hasOwn(WATER_EMPTY,key.slice(6))){waterDraft[key.slice(6)]=value;return;}
  if(view==='nearby'&&fromChange&&key.startsWith('shelter-')){
    shelterFilters[key.slice(8)]=value;shelterFilters.limit=SHELTER_PAGE_SIZE;updateShelterResults();return;
  }
  if(view==='guide'&&key.startsWith('welfare-')&&fromChange){store.prefs.checklist||={};store.prefs.checklist[key.slice(8)]=value;persist();return;}
  if(view==='results'&&['after-role','after-date'].includes(key)){run().aftercare||={};run().aftercare[key.slice(6)]=value;persist();return;}
  if(['fork-result','compare'].includes(view)&&fromChange&&key==='compare-basis'){compareBasis=value;render(false,'[name="compare-basis"]');return;}
  if (view==='settings') {
    if (!['theme','room-theme','scale','reduce','coach','tone'].includes(key)) return;
    store.prefs[key==='room-theme'?'room':key]=key==='scale'?Number(value):value;
    persist();applyPrefs();
    if (key==='scale') $('#scale-label').textContent=`${value}%`;
    if(fromChange&&['theme','room-theme'].includes(key)) renderChrome();
    return;
  }
  const d=store.draft;
  if (view==='coach') {d[key]=value;persist();return;}
  if (view==='facility' && Object.hasOwn(EMPTY,key)) {
    d.facility[key]=value;
    if (key==='room' && fromChange) {
      if(value!=='yes')d.facility.capacity='';
      delete errors.capacity;delete errors.room;persist();render(false,'#field-room');
    }
    if (key==='hasPlan' && fromChange) {
      if (value==='no') d.plan.kind='none';
      else if (d.plan.kind==='none') d.plan.kind='structured';
    }
    persist();return;
  }
  if (view==='plan'||view==='improve') {
    const p=view==='plan'?d.plan:improvement;
    const findings=$('#plan-findings'), wasOpen=!!findings?.querySelector('details[open]');
    if (key==='kind' && fromChange) {p.kind=value;$('#plan-editor').innerHTML=planEditor(p);$(`#plan-editor input:checked`)?.focus();}
    else if(key==='text'&&p.text!==value){p.text=value;p.confirmed={};}
    else if(key.startsWith('area-'))p.items[key.slice(5)]=value;
    else if(key.startsWith('confirm-')){p.confirmed||={};p.confirmed[key.slice(8)]=value;}
    if(view==='plan')persist();else updateImprovement();
    if(fromChange&&findings&&!key.startsWith('confirm-')){
      const context=view==='plan'?d:run();findings.innerHTML=planFindings(p,context.facility,context.config.scenario,true,wasOpen);
    }
    return;
  }
  if (view==='setup'&&fromChange&&Object.hasOwn(d.config,key)) {d.config[key]=value;persist();render(false,`[name="${key}"]${target.type==='radio'?':checked':''}`);return;}
  if (view==='whatif'&&fromChange&&key==='point') {point=Number(value);alternative='';render(false,'[name="point"]');}
  if (view==='whatif'&&key==='alternative') alternative=value;
  if (view==='review'&&fromChange&&key==='review') {review=Number(value);render(false,'[name="review"]:checked');}
}
function removeSavedRecord(id){
  try{localStorage.removeItem(runKey+id);savedRuns.delete(id);}catch{storageOK=false;}
  store.runs=store.runs.filter(r=>r.id!==id);
}
const handlers={
  quick:()=>{const d=newDraft(true);createRun(normalizeFacility(d.facility),d.config,d.plan,d.coach,d.tone,true);navigate('training');},custom:()=>startDraft(false), 'choose-scenario':id=>startDraft(true,id),
  'new-draft':id=>{dismiss();holdDraft();store.draft=newDraft(id!=='custom',id==='custom'?'cooling':id);draftTo(store.draft.stage);},
  'resume-draft':()=>{dismiss();if (store.draft) draftTo(store.draft.stage);},
  'open-draft':id=>{const chosen=store.heldDrafts.find(d=>d.id===id);if(!chosen)return;store.heldDrafts=store.heldDrafts.filter(d=>d.id!==id);holdDraft();store.draft=chosen;draftTo(chosen.stage==='coach'?'setup':chosen.stage);},
  'delete-draft':id=>confirm('임시저장을 삭제할까요?','이 임시저장의 시설 설정과 계획을 삭제합니다.','임시저장 삭제','confirm-draft-delete',id),
  'confirm-draft-delete':id=>{dismiss();store.heldDrafts=store.heldDrafts.filter(d=>d.id!==id);navigate('records');},
  'skip-coach':()=>{store.draft.coach=store.prefs.coach;store.draft.tone=store.prefs.tone;draftTo('setup');},
  'to-facility':()=>draftTo('facility'), 'back-facility':()=>store.draft.quick?draftTo('setup'):navigate('home'),
  'to-setup':()=>draftTo('setup'), 'edit-setup':()=>draftTo(store.draft.quick?'facility':'plan'), 'edit-quick-coach':()=>draftTo('coach'),
  start:()=>{const d=store.draft;if (!d||!validDraft('setup'))return;createRun(normalizeFacility(d.facility),d.config,d.plan,d.coach,d.tone,d.quick);store.draft=null;navigate('training');},
  act:id=>recordAction(id,false),'fork-act':id=>recordAction(id,true),
  'training-pane':pane=>{
    if(!isTrainingView(view)||trainingPane===pane||!trainingPanes.some(([id])=>id===pane))return;
    trainingPane=pane;render(true);
  },
  'training-menu':()=>{
    if(!isTrainingView(view))return;
    const options=view==='fork-training'?button('현재 시점 비교','finish-fork',{kind:'secondary'}):`${button('일시 중단','pause',{kind:'secondary'})}${button('훈련 종료','end-run')}`;
    showDialog('훈련 메뉴',`<div class="actions">${options}${button('계속 훈련','dismiss',{kind:'primary'})}</div>`);
  },
  pause:()=>{dismiss();run().status='paused';navigate('records');},
  'end-run':()=>showDialog('훈련을 종료할까요?',`<div class="stack"><p>이미 선택한 행동까지만 결과에 반영합니다.</p><div class="actions">${button('현재까지 평가','end-incomplete',{kind:'primary'})}${button('사용자 중단','end-stopped',{kind:'danger'})}${button('계속 훈련','dismiss')}</div></div>`),
  'end-incomplete':()=>{dismiss();finishRun('incomplete');},'end-stopped':()=>{dismiss();finishRun('stopped');},
  resume:id=>{const r=recordBy(id);if(!isOpen(r)||r.rules!==RULES)return;r.status='active';runId=id;navigate('training');},
  reuse:id=>{const r=recordBy(id);if(!r)return;holdDraft();store.draft={...newDraft(false,r.config.scenario),facility:{...EMPTY,...COPY(r.facility)},plan:COPY(r.improvedPlan||r.plan),config:{...r.config,rules:RULES},coach:r.coach,tone:r.tone};draftTo('facility');setLive('시설을 복사했습니다. 기존 임시저장은 내 훈련 기록에 보관했습니다.');},
  'open-result':id=>{runId=id;navigate('results');}, 'back-result':()=>navigate('results'),
  delete:id=>{const children=store.runs.filter(r=>r.parentId===id).length;confirm('훈련 기록을 삭제할까요?',`이 기록과 해당 WHAT IF? 경로를 삭제합니다.${children?` 재훈련 ${children}건은 보존되며 최초 기록과의 비교는 사용할 수 없게 됩니다.`:''}`,'기록 삭제','confirm-delete',id);},
  'confirm-delete':id=>{dismiss();removeSavedRecord(id);navigate('records');},
  whatif:()=>{if(run()?.rules!==RULES)return;point=0;alternative='';compareBasis='decision';navigate('whatif');},
  'start-fork':()=>{
    const r=run(), selected=r.history[point];
    if (!alternative||alternative===selected.id) {setLive('대체 행동을 선택하세요.');$('[name="alternative"]').focus();showDialog('대체 행동 선택',`<div class="stack"><p>비교할 행동을 먼저 선택하세요.</p>${button('확인','dismiss')}</div>`);return;}
    const first=step(selected.before,r.facility,r.config,alternative);if(!first)return;
    const b={id:newId(),point,state:first.after,history:[first],closed:point+1>=decisionLimit(r.config,[...r.history.slice(0,point),first])};
    r.branches.push(b);branchId=b.id;navigate(b.closed?'fork-result':'fork-training');
  },
  'open-fork':id=>{branchId=id;compareBasis='decision';navigate(branch().closed||run().rules!==RULES?'fork-result':'fork-training');},
  'finish-fork':()=>{dismiss();branch().closed=true;navigate('fork-result');},
  'continue-fork':()=>{branch().closed=false;navigate('fork-training');},
  improve:()=>{improvement=COPY(run().improvedPlan||run().plan);if(improvement.kind==='none')improvement.kind='structured';navigate('improve');},
  'save-improve':()=>{updateImprovement();showDialog(storageOK?'개선 계획 보관됨':'이번 세션에 반영됨',`<div class="stack"><p>${storageOK?'내 훈련 기록에서 이 개선 계획을 다시 열 수 있습니다.':'브라우저 저장 제한으로 열린 페이지에서 계획을 사용할 수 있습니다.'}</p>${button('확인','dismiss',{kind:'primary'})}</div>`);},
  retrain:()=>{const parent=run();updateImprovement();createRun(parent.facility,parent.config,improvement,parent.coach,parent.tone,parent.quick,parent);navigate('training');},
  compare:()=>{compareBasis='decision';navigate('compare');}, review:()=>{review=null;navigate('review');},
  report:reportDialog, 'print-report':()=>{document.body.classList.add('printing-report');window.print();},
  backup:downloadBackup, 'pick-backup':()=>$('#backup-file')?.click(),
  'shelters-after16':()=>{shelterFilters.time='960';shelterFilters.limit=SHELTER_PAGE_SIZE;navigate('nearby');focusSection($('#shelter-heading'));},
  'shelters-wheelchair':()=>{
    shelterAdvancedOpen=true;shelterFilters.access=true;shelterFilters.limit=SHELTER_PAGE_SIZE;navigate('nearby');
    const filters=$('#shelter-access');filters.querySelector('input').focus({preventScroll:true});filters.scrollIntoView({block:'start'});
  },
  'shelter-results':()=>focusSection($('#shelter-results')),
  'shelters-more':()=>{const next=shelterFilters.limit;shelterFilters.limit+=SHELTER_PAGE_SIZE;updateShelterResults();const card=document.querySelectorAll('#shelter-results .shelter-card')[next];if(card){card.tabIndex=-1;card.focus();}},
  'water-new':()=>newWaterDraft(), 'water-edit':newWaterDraft,
  'water-owner':()=>{waterMode='mine';waterDistrict='all';navigate('water-events');},
  'water-manage':waterManager, 'water-publish':publishWater, 'water-report':reportWater,
  'water-manage-edit':id=>{dismiss();newWaterDraft(id);},
  'water-now':()=>{waterMode='now';waterDistrict='all';navigate('water-events');if(compactScreen.matches)focusSection($('#water-results'));},
  'water-today':()=>{waterMode='today';waterDistrict='all';navigate('water-events');},
  'water-live-near':()=>{waterMode='now';waterDistrict='all';navigate('water-events');requestWaterLocation();},
  'water-refresh':refreshWaterLive,
  'water-share':openWaterShare, 'water-copy':copyWaterShare,
  'water-build-link':id=>{
    const item=waterItems.find(row=>row.id===id), base=publicWaterUrl($('#water-share-base').value), status=$('#water-share-status');
    if(!item||!base){status.textContent='https://로 시작하는 공개 배포 주소를 입력하세요.';$('#water-share-base').focus();return;}
    $('#water-share-url').value=waterShareUrl(item,base);status.textContent='공유 주소가 만들어졌습니다.';
  },
  'water-locate':()=>requestWaterLocation(), 'water-venue-location':()=>requestWaterLocation(true),
  'water-forget-position':()=>{waterLocationRequest++;waterLocating=false;waterPosition=null;waterPositionMessage='위치 사용을 종료했습니다.';render(false,'[data-action="water-locate"]');},
  'save-shared-water':()=>{
    if(!sharedWater)return;
    const local=waterItems.find(row=>row.id===sharedWater.id);
    if(local?.owned){setLive('이미 이 기기에 주최자로 저장한 행사입니다.');return;}
    waterItems=waterItems.filter(row=>row.id!==sharedWater.id);waterItems.push({...sharedWater,owned:false});saveWaterItems();
    waterMode='mine';waterDistrict='all';navigate('water-events');setLive(waterStoreOK?'이 기기에 공유 일정을 저장했습니다.':'이 탭에서 공유 일정을 열 수 있습니다.');
  },
  'water-remove':id=>confirm('이 목록에서 행사를 삭제할까요?','이 기기에 저장된 사본을 삭제합니다. 이전에 공유한 안내 링크의 내용은 계속 열릴 수 있습니다.','삭제','water-remove-confirm',id),
  'water-remove-confirm':id=>{dismiss();waterItems=waterItems.filter(item=>item.id!==id);saveWaterItems();navigate('water-events');},
  'share-scenario':shareScenario,
  'copy-share':async()=>{const input=$('#share-url'), status=$('#share-status');try{await navigator.clipboard.writeText(input.value);status.textContent='공유 링크를 복사했습니다.';}catch{input.focus();input.select();status.textContent='선택한 링크를 복사해 공유하세요.';}},
  emergency:()=>showDialog('실제 긴급 안전 안내',`<div class="actions emergency-first"><a href="tel:119" class="btn danger">${icon('phone')} 실제 119 전화</a></div>${guideContent(true)}`),
  dismiss,
  'toggle-theme':()=>{const key=isTrainingView(view)?'room':'theme';store.prefs[key]=store.prefs[key]==='dark'?'light':'dark';persist();applyPrefs();if(view==='settings')render(false);else renderChrome();$('#topbar [data-action="toggle-theme"]')?.focus();}
};
document.addEventListener('click',event=>{
  const advancedSummary=event.target.closest('#shelter-advanced > summary');
  if(advancedSummary)shelterAdvancedOpen=!advancedSummary.parentElement.open;
  const selected=event.target.closest('button[data-action]');if(!selected)return;
  const action=selected.dataset.action;
  if (Object.hasOwn(navItems,action)) navigate(action);
  else if(action==='water-publish'||action==='water-report')handlers[action](selected.dataset.value,selected);
  else handlers[action]?.(selected.dataset.value);
});
document.addEventListener('input',event=>{if(!['radio','checkbox','select-one'].includes(event.target.type))fieldChange(event.target,false);});
document.addEventListener('change',async event=>{
  if(event.target.id!=='backup-file'){fieldChange(event.target,true);return;}
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>10*1024*1024)throw Error('10MB 이하의 기록 백업을 선택하세요.');
    const count=importRecords(await file.text());persist();render(false);
    showDialog('훈련 기록 가져오기',`<div class="stack"><p>${count?`${count}건을 가져왔습니다.${storageOK?'':' 이번 세션에서 사용할 수 있습니다.'}`:'새로 가져올 기록이 없습니다.'}</p>${button('확인','dismiss',{kind:'primary'})}</div>`);
  }catch(error){showDialog('기록을 가져오지 못했습니다',`<div class="stack"><p>${escapeHTML(error.message)}</p>${button('확인','dismiss')}</div>`);}
  finally{event.target.value='';}
});
window.addEventListener('afterprint',()=>document.body.classList.remove('printing-report'));
window.addEventListener('storage',event=>{
  if(!event.key?.startsWith(runKey))return;
  const id=event.key.slice(runKey.length), local=recordBy(id);
  if(local&&(JSON.stringify(local)!==savedRuns.get(id)||(id===runId&&['training','fork-training','improve'].includes(view)))){
    storageConflict='같은 기록이 다른 탭에서 바뀌었습니다. 필요하면 이 탭의 변경 내용을 백업하세요.';
    setLive(storageConflict);return;
  }
  if(!event.newValue){store.runs=store.runs.filter(r=>r.id!==id);savedRuns.delete(id);}
  else{
    try{const remote=loadRecord(event.newValue);if(!remote)return;if(local)store.runs[store.runs.indexOf(local)]=remote;else store.runs.push(remote);savedRuns.set(id,JSON.stringify(remote));}catch{return;}
  }
  if(view==='records'||view==='home')render(false);
});
document.addEventListener('submit',event=>{
  if(event.target.id==='water-form'){
    event.preventDefault();
    if(waterBusy)return;
    const values=Object.fromEntries([...new FormData(event.target)].map(([key,value])=>[key.slice(6),value]));
    const {item,errors}=validateWaterEvent(values);waterErrors=errors;
    if(Object.keys(errors).length){waterDraft={...WATER_EMPTY,...values};render(false);const invalid=$(`#water-${Object.keys(errors)[0]}`);invalid?.focus();return;}
    const id=waterEditId||newId();
    const existing=waterItems.find(row=>row.id===id&&row.owned);
    if(existing?.live){
      const form=event.target;
      waterMutation(existing,{data:{event:item},statusField:$('#water-form-status'),control:form.querySelector('[type="submit"]'),after:()=>{
        if(!form.isConnected)return;
        waterMode='mine';waterDistrict='all';navigate('water-events');waterManager(id);$('#water-manager-status').textContent='공개 일정을 변경했습니다.';
      }});
      return;
    }
    waterItems=waterItems.filter(row=>row.id!==id);waterItems.push({...existing,...item,id,owned:true});saveWaterItems();
    waterMode='mine';waterDistrict='all';navigate('water-events');waterManager(id);return;
  }
  if(event.target.id!=='facility-form')return;
  event.preventDefault();if(validDraft('facility'))draftTo('plan');
});
// Keep mobile form controls clear of the on-screen keyboard and navigation.
const appViewport=window.visualViewport;
if(appViewport){
  function syncKeyboard(){
    const focused=document.activeElement;
    const input=focused?.matches('textarea,input:not([type=radio]):not([type=checkbox]):not([type=range]),select');
    const keyboard=compactScreen.matches&&input&&appViewport.scale<1.05&&window.innerHeight-appViewport.height>120;
    document.body.toggleAttribute('data-keyboard-open',keyboard);
    if(keyboard&&focused.getBoundingClientRect().bottom>appViewport.offsetTop+appViewport.height-24){
      focused.scrollIntoView({block:'center',behavior:'instant'});
    }
  }
  appViewport.addEventListener('resize',syncKeyboard);
  document.addEventListener('focusin',syncKeyboard);
  document.addEventListener('focusout',()=>requestAnimationFrame(syncKeyboard));
}
const linkedScenario=new URLSearchParams(location.search).get('scenario');
if(Object.hasOwn(SCENARIOS,linkedScenario)&&!store.draft){store.draft=newDraft(true,linkedScenario);view='setup';persist();}
function openWaterHash(){
  if(location.hash.startsWith('#water-live=')){
    const id=location.hash.slice(12);
    waterLiveId=WATER_ID.test(id)?id:'';sharedWater=null;sharedWaterError=!waterLiveId;waterSharedConnection='loading';return true;
  }
  const parsed=readSharedWater(location.hash);
  if(parsed===null)return false;
  waterLiveId='';sharedWater=parsed||null;sharedWaterError=parsed===false;return true;
}
if(openWaterHash())view='water-shared';
window.addEventListener('hashchange',()=>{if(openWaterHash())navigate('water-shared');});
render();
refreshWaterLive();
setInterval(refreshWaterLive,15000);
document.addEventListener('visibilitychange',refreshWaterLive);
