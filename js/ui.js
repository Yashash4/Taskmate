export const $  = (sel, root=document)=>root.querySelector(sel);
export const $$ = (sel, root=document)=>[...root.querySelectorAll(sel)];
export const esc = (s)=>String(s??"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
export const maskEmail = (e)=>{ if(!e) return ""; const [a,b]=e.split("@"); return (a?.slice(0,2)||"")+"***@"+(b||""); };
export const csvCell = (s)=>`"${String(s??"").replace(/"/g,'""')}"`;
export const download = (name,content)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type:'text/csv'})); a.download=name; a.click(); };
export const pill = (status)=>`<span class="pill status-${status}">${esc(status)}</span>`;
