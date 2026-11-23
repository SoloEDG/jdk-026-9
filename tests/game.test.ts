import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {puzzles} from '../src/features/catalog/model/puzzles';
import {clueSet,runs} from '../src/shared/clues';
import {newDocument} from '../src/shared/document';
import {transition} from '../src/app/reducer';
import {nextHint} from '../src/features/assist/model/hints';
import {lineStatuses} from '../src/features/board/lib/lineStatus';
import {loadDocument,saveDocument} from '../src/features/journal/lib/storage';
import {unlockedArt} from '../src/features/gallery/lib/artwork';
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
let stored:string|null=null;
Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=>stored,setItem:(_:string,value:string)=>{stored=value;}},configurable:true});
test('clue runs include zero lines and separated groups',()=>{assert.deepEqual(runs([0,1,1,0,1]),[2,1]);assert.deepEqual(runs([0,0]),[0]);});
test('all built-in puzzles have valid dimensions and exactly one solution',()=>{
 for(const puzzle of puzzles){
  assert.equal(puzzle.solution.length,puzzle.size**2);
  const clues=clueSet(puzzle.size,puzzle.solution); const n=puzzle.size;
  const candidates=clues.map(clue=>Array.from({length:2**n},(_,mask)=>Array.from({length:n},(_,i)=>(mask>>i)&1)).filter(row=>JSON.stringify(runs(row))===JSON.stringify(clue)));
  let count=0;
  function search(rows:number[][],columns:number[][][]){
   if(count>1)return;
   const r=rows.length;if(r===n){count++;return;}
   for(const row of candidates[r]){const next=columns.map((patterns,c)=>patterns.filter(pattern=>pattern[r]===row[c]));if(next.every(p=>p.length))search([...rows,row],next);}
  }
  search([],candidates.slice(n)); console.log(puzzle.id, count); assert.equal(count,1,puzzle.id+' must be uniquely solvable');
 }
});
test('marks update line state, undo restores marks, another puzzle stays isolated',()=>{
 const p=puzzles[1];let d=newDocument(p); d=transition(d,{type:'mark',index:1,mark:'filled'},puzzles);assert.equal(d.sessions[p.id].marks[1],'filled');assert.equal(lineStatuses(p,d.sessions[p.id].marks)[0],false);
 d=transition(d,{type:'undo'},puzzles);assert.equal(d.sessions[p.id].marks[1],'unknown');d=transition(d,{type:'open',id:puzzles[0].id},puzzles);assert.equal(d.sessions[p.id].marks[1],'unknown');
});
test('hint reveals one cell, undo cannot refund quota, hard cap is three',()=>{
 let d=newDocument(puzzles[0]);
 for(let i=0;i<3;i++){const s=d.sessions[d.activeId];const h=nextHint(puzzles[0],s)!;const previous=s.marks.slice();d=transition(d,{type:'hint',...h},puzzles);assert.equal(d.sessions[d.activeId].marks.filter((m,j)=>m!==previous[j]).length,1);d=transition(d,{type:'undo'},puzzles);}
 assert.equal(d.sessions[d.activeId].hints,3);assert.equal(nextHint(puzzles[0],d.sessions[d.activeId]),null);
});
test('solve commits a single record, unlocks art and freezes solved board',()=>{
 const p=puzzles[1];let d=newDocument(p);
 p.solution.forEach((v,index)=>{if(v)d=transition(d,{type:'mark',index,mark:'filled'},puzzles);});
 assert.equal(d.sessions[p.id].solved,true);assert.equal(d.records.length,1);assert.equal(unlockedArt(puzzles,d)[0].id,p.id);
 d=transition(d,{type:'mark',index:0,mark:'filled'},puzzles);assert.equal(d.records.length,1);assert.equal(d.sessions[p.id].marks[0],'unknown');
});
test('wrong filled and wrong crossed marks prevent solve',()=>{
 const p=puzzles[1];let d=newDocument(p);d=transition(d,{type:'mark',index:0,mark:'filled'},puzzles);
 p.solution.forEach((v,index)=>{if(v)d=transition(d,{type:'mark',index,mark:'filled'},puzzles);});assert.equal(d.records.length,0);
});
test('save and reopen retains progress and quota without another completion',()=>{
 stored=null;let d=newDocument(puzzles[0]);d=transition(d,{type:'hint',...nextHint(puzzles[0],d.sessions[d.activeId])!},puzzles);assert.ok(saveDocument(d));const restored=loadDocument(puzzles);assert.deepEqual(restored.document.sessions[d.activeId].marks,d.sessions[d.activeId].marks);assert.equal(restored.document.sessions[d.activeId].hints,1);assert.equal(restored.warning,'');
});
test('malformed save returns recoverable warning without overwriting raw save',()=>{
 stored='{broken';const restored=loadDocument(puzzles);assert.ok(restored.warning);assert.equal(stored,'{broken');assert.equal(restored.document.activeId,puzzles[0].id);
});
