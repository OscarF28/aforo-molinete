
const $ = (s, root=document)=>root.querySelector(s);
const $$ = (s, root=document)=>[...root.querySelectorAll(s)];
const REV_DEFAULT=[1,2,3,4,5,10,15,20,25,30,35,40,45,50,60,70,80,90,100,150,200,250];
let state={config:{site:'',date:new Date().toISOString().slice(0,10),width:'',section:'Trapezoidal',observations:5,method:'0.6',serial:'73359',suspension:'Varilla'},points:[]};

function fmt(x,n=3){return Number.isFinite(x)?x.toFixed(n):''}
function exactVelocity(serial,suspension,time,rev){
  const s=CALIBRATIONS[String(serial)]; if(!s)return null;
  const block=s[suspension]; if(!block)return null;
  const row=block.table[String(Number(time))]; if(!row)return null;
  const v=row[String(Number(rev))]; return typeof v==='number'?v:null;
}
function totalPoints(){return Number(state.config.observations)*2+1}
function regeneratePoints(force=false){
  const n=totalPoints(), w=Number(state.config.width)||0, old=state.points;
  let arr=[];
  for(let i=1;i<=n;i++){
    let prev=old.find(p=>p.i===i)||{};
    let distance=(n>1? Math.round((w*(i-1)/(n-1))*100)/100:0);
    if(!force && prev.distance!==undefined && old.length===n && Number(state.config.width)===Number(state._lastWidth)) distance=prev.distance;
    arr.push({i,distance,depth:prev.depth??'',r1:prev.r1??'',t1:prev.t1??'',r2:prev.r2??'',t2:prev.t2??''});
  }
  if(state.config.section==='Trapezoidal' && arr.length){arr[0].depth=0;arr[arr.length-1].depth=0;}
  state.points=arr; state._lastWidth=state.config.width;
}
function pointCalc(idx){
  const p=state.points[idx]; if(!p)return {};
  const effectiveDepth=(state.config.section==='Trapezoidal' && (idx===0||idx===state.points.length-1))?0:Number(p.depth);
  const measure=p.i%2===0;
  const v1=measure?exactVelocity(state.config.serial,state.config.suspension,Number(p.t1),Number(p.r1)):null;
  const v2=(measure&&state.config.method==='0.2-0.8')?exactVelocity(state.config.serial,state.config.suspension,Number(p.t2),Number(p.r2)):null;
  let vmean=null;
  if(measure){ if(state.config.method==='0.6') vmean=v1; else if(v1!==null&&v2!==null) vmean=(v1+v2)/2; }
  let sectionWidth=null, depthMean=null, area=null, q=null;
  if(measure && idx>0 && idx<state.points.length-1){
    const a=Number(state.points[idx-1].depth), b=effectiveDepth, c=Number(state.points[idx+1].depth);
    const xa=Number(state.points[idx-1].distance), xc=Number(state.points[idx+1].distance);
    if(Number.isFinite(xa)&&Number.isFinite(xc)) sectionWidth=xc-xa;
    if(Number.isFinite(a)&&Number.isFinite(b)&&Number.isFinite(c)) depthMean=(a+2*b+c)/4;
    if(sectionWidth!==null&&depthMean!==null) area=sectionWidth*depthMean;
    if(area!==null&&vmean!==null) q=area*vmean;
  }
  return {effectiveDepth,measure,v1,v2,vmean,sectionWidth,depthMean,area,q};
}
function totals(){let area=0,q=0,complete=0;state.points.forEach((_,i)=>{const c=pointCalc(i);if(c.area!==null)area+=c.area;if(c.q!==null){q+=c.q;complete++;}});return {area,q,lps:q*1000,vavg:area? q/area:null,complete};}
function bindConfig(){
  const map={site:'#site',date:'#date',width:'#width',section:'#section',observations:'#observations',method:'#method',serial:'#serial',suspension:'#suspension'};
  Object.entries(map).forEach(([k,s])=>{const el=$(s); el.value=state.config[k]; el.onchange=()=>{state.config[k]=el.type==='number'&&k==='observations'?Number(el.value):el.value; regeneratePoints(k==='width'||k==='observations'||k==='section'); renderAll();saveLocal();};});
  $('#calSheet').textContent=MOLINETE_META[state.config.serial]?.sheet||'';
  $('#pointCount').textContent=totalPoints();
  $('#spacing').textContent=state.config.width?fmt(Number(state.config.width)/(totalPoints()-1),2)+' m':'—';
}
function renderCapture(){
  const box=$('#pointList'); box.innerHTML='';
  state.points.forEach((p,idx)=>{
    const c=pointCalc(idx), measure=c.measure, endpoint=idx===0||idx===state.points.length-1;
    const d=document.createElement('section'); d.className='card point-card';
    const depthDisabled=state.config.section==='Trapezoidal'&&endpoint;
    d.innerHTML=`<div class="point-title"><h3>Punto ${p.i} · ${fmt(Number(p.distance),2)} m</h3><span class="badge ${measure?'measure':'depth'}">${measure?'MOLINETE':'SONDEO'}</span></div>
      <div class="grid3">
       <div><label>Distancia desde origen (m)</label><input class="input p-distance" type="number" step="0.01" value="${p.distance}" ${endpoint?'readonly':''}></div>
       <div><label>Profundidad (m)</label><input class="input p-depth" type="number" min="0" step="0.001" value="${p.depth}" ${depthDisabled?'disabled':''}></div>
       <div><label>Profundidad efectiva</label><input class="auto" disabled value="${fmt(c.effectiveDepth)}"></div>
      </div>
      ${measure?`<div class="grid3" style="margin-top:10px">
        <div><label>${state.config.method==='0.6'?'Profundidad 0.6D':'Profundidad 0.2D'}</label><input class="auto" disabled value="${Number.isFinite(c.effectiveDepth)?fmt(c.effectiveDepth*(state.config.method==='0.6'?0.6:0.2)):''}"></div>
        <div><label>Revoluciones 1</label><input class="input p-r1" type="number" min="1" step="1" list="revList" value="${p.r1}"></div>
        <div><label>Tiempo 1 (s)</label><input class="input p-t1" type="number" min="40" max="70" step="1" value="${p.t1}"></div>
      </div>
      ${state.config.method==='0.2-0.8'?`<div class="grid3" style="margin-top:10px"><div><label>Profundidad 0.8D</label><input class="auto" disabled value="${Number.isFinite(c.effectiveDepth)?fmt(c.effectiveDepth*0.8):''}"></div><div><label>Revoluciones 2</label><input class="input p-r2" type="number" min="1" step="1" list="revList" value="${p.r2}"></div><div><label>Tiempo 2 (s)</label><input class="input p-t2" type="number" min="40" max="70" step="1" value="${p.t2}"></div></div>`:''}
      <div class="grid3" style="margin-top:10px"><div><label>Velocidad ${state.config.method==='0.6'?'':'1'} (m/s)</label><input class="auto" disabled value="${c.v1!==null?fmt(c.v1):''}"></div>${state.config.method==='0.2-0.8'?`<div><label>Velocidad 2 (m/s)</label><input class="auto" disabled value="${c.v2!==null?fmt(c.v2):''}"></div>`:''}<div><label>Velocidad media (m/s)</label><input class="auto" disabled value="${c.vmean!==null?fmt(c.vmean):''}"></div></div>
      <div class="grid3" style="margin-top:10px"><div><label>Anchura sección (m)</label><input class="auto" disabled value="${c.sectionWidth!==null?fmt(c.sectionWidth):''}"></div><div><label>Profundidad media (m)</label><input class="auto" disabled value="${c.depthMean!==null?fmt(c.depthMean):''}"></div><div><label>Q parcial (m³/s)</label><input class="auto" disabled value="${c.q!==null?fmt(c.q):''}"></div></div>
      <div class="${(p.r1&&p.t1&&c.v1===null)||(state.config.method==='0.2-0.8'&&p.r2&&p.t2&&c.v2===null)?'status bad':'hidden'}">La combinación de revoluciones/tiempo no existe en la tabla exacta seleccionada.</div>`:''}`;
    box.appendChild(d);
    const set=(sel,key)=>{
      const el=$(sel,d);
      if(!el)return;
      // Mientras se escribe, conserva el foco y el teclado numérico abierto.
      el.oninput=()=>{p[key]=el.value; saveLocal();};
      // Al terminar el dato, actualiza velocidades, secciones y resultados.
      el.onchange=()=>{p[key]=el.value; renderCapture(); renderResults(); saveLocal();};
    };
    set('.p-distance','distance'); set('.p-depth','depth'); set('.p-r1','r1'); set('.p-t1','t1'); set('.p-r2','r2'); set('.p-t2','t2');
  });
}
function renderResults(){
  const t=totals(); $('#qTotal').textContent=fmt(t.q); $('#lpsTotal').textContent=fmt(t.lps,1); $('#areaTotal').textContent=fmt(t.area); $('#vAvg').textContent=t.vavg!==null?fmt(t.vavg):'—';
  $('#completion').textContent=`${t.complete} de ${state.config.observations} secciones con caudal calculado`;
  const tbody=$('#resultsBody');tbody.innerHTML='';
  state.points.forEach((p,i)=>{const c=pointCalc(i);if(!c.measure)return;const tr=document.createElement('tr');tr.innerHTML=`<td>${p.i}</td><td>${fmt(Number(p.distance),2)}</td><td>${fmt(c.effectiveDepth)}</td><td>${c.v1!==null?fmt(c.v1):''}</td><td>${c.v2!==null?fmt(c.v2):''}</td><td>${c.vmean!==null?fmt(c.vmean):''}</td><td>${c.sectionWidth!==null?fmt(c.sectionWidth):''}</td><td>${c.depthMean!==null?fmt(c.depthMean):''}</td><td>${c.area!==null?fmt(c.area):''}</td><td>${c.q!==null?fmt(c.q):''}</td>`;tbody.appendChild(tr);});
}
function renderCalTable(){
  const serial=$('#tableSerial').value||state.config.serial, susp=$('#tableSusp').value||state.config.suspension; const b=CALIBRATIONS[serial][susp];
  $('#tableMeta').textContent=`${MOLINETE_META[serial].sheet} · ${susp}`;
  let h='<table class="cal-table"><thead><tr><th>T \\ R</th>'+b.revolutions.map(r=>`<th>${r}</th>`).join('')+'</tr></thead><tbody>';
  b.times.forEach(t=>{h+=`<tr><td>${t}</td>`+b.revolutions.map(r=>`<td>${Number(b.table[t][r]).toFixed(3)}</td>`).join('')+'</tr>'});h+='</tbody></table>';$('#calTable').innerHTML=h;
}
function renderAll(){regeneratePoints(false);bindConfig();renderCapture();renderResults(); $('#tableSerial').value=state.config.serial;$('#tableSusp').value=state.config.suspension;renderCalTable();}
function saveLocal(){localStorage.setItem('aforoMolineteState',JSON.stringify(state));$('#saveMsg').textContent='Guardado en este dispositivo';setTimeout(()=>$('#saveMsg').textContent='',1200)}
function loadLocal(){try{const x=JSON.parse(localStorage.getItem('aforoMolineteState'));if(x&&x.config){state=x;return true}}catch(e){}return false}
function newAforo(){if(!confirm('¿Crear un aforo nuevo? Se limpiarán los datos de captura actuales.'))return;state={config:{site:'',date:new Date().toISOString().slice(0,10),width:'',section:'Trapezoidal',observations:5,method:'0.6',serial:'73359',suspension:'Varilla'},points:[]};regeneratePoints(true);renderAll();saveLocal();}
function exportCSV(){let rows=[['Punto','Distancia_m','Profundidad_m','Rev1','Tiempo1_s','Vel1_m_s','Rev2','Tiempo2_s','Vel2_m_s','VelMedia_m_s','Anchura_m','ProfMedia_m','Area_m2','Q_m3_s']];state.points.forEach((p,i)=>{const c=pointCalc(i);if(c.measure)rows.push([p.i,p.distance,c.effectiveDepth,p.r1,p.t1,c.v1??'',p.r2,p.t2,c.v2??'',c.vmean??'',c.sectionWidth??'',c.depthMean??'',c.area??'',c.q??''])});const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`aforo_${(state.config.site||'canal').replace(/[^a-z0-9_-]+/gi,'_')}_${state.config.date}.csv`;a.click();URL.revokeObjectURL(a.href)}
function showView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));scrollTo({top:0,behavior:'smooth'});}
document.addEventListener('DOMContentLoaded',()=>{
  loadLocal();regeneratePoints(false);renderAll();
  $$('nav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));
  $('#saveBtn').onclick=saveLocal;$('#newBtn').onclick=newAforo;$('#csvBtn').onclick=exportCSV;$('#printBtn').onclick=()=>{showView('resultados');setTimeout(()=>print(),100)};
  $('#tableSerial').onchange=renderCalTable;$('#tableSusp').onchange=renderCalTable;
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
});
