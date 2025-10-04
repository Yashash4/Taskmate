function toDateInputValue(date){
  if(!date) return '';
  const d=new Date(date);
  const tz=d.getTimezoneOffset()*60000;
  return new Date(d - tz).toISOString().slice(0,10);
}
function badgeFor(deadline, done){
  if(!deadline||done) return '';
  const today=new Date(); today.setHours(0,0,0,0);
  const d=new Date(deadline); d.setHours(0,0,0,0);
  if(d<today) return ' • <span class="badge status-open">Overdue</span>';
  if(d.getTime()===today.getTime()) return ' • <span class="badge status-open">Due Today</span>';
  return '';
}
function priorityClass(p){ return p?('priority-'+p):''; }
function renderCards(el,tasks){
  const total=tasks.length;
  const done=tasks.filter(t=>t.status==='done').length;
  const open=tasks.filter(t=>t.status==='open').length;
  const submitted=tasks.filter(t=>t.status==='submitted').length;
  const today=new Date(); today.setHours(0,0,0,0);
  const overdue=tasks.filter(t=>t.deadline && new Date(t.deadline)<today && t.status!=='done').length;
  const high=tasks.filter(t=>t.priority==='high').length;
  const metrics=[{title:'Total',value:total},{title:'Open',value:open},{title:'Submitted',value:submitted},{title:'Done',value:done},{title:'Overdue',value:overdue},{title:'High Priority',value:high}];
  el.innerHTML=metrics.map(m=>`<article class="card"><h3>${m.title}</h3><p class="big">${m.value}</p></article>`).join('');
}
