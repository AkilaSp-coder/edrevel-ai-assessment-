import { useState } from 'react'
import './App.css';

type BlockType = 'start' | 'section' | 'group' | 'complete'
type Block = { id: number; type: BlockType; title: string; description: string; questions: number; duration: number; difficulty: string; condition?: string }
type SavedPath = { id?: number; databaseId?: number; name?: string; description?: string; payload?: string | { nodes?: unknown[] }; content?: string | unknown[] }
const API = 'http://localhost:8080/api/learning-paths'
const initial: Block[] = [
 {id:1,type:'start',title:'Start Assessment',description:'Begin the adaptive assessment.',questions:0,duration:0,difficulty:'—'},
 {id:2,type:'section',title:'Math Module 1',description:'Regular section',questions:22,duration:35,difficulty:'Medium'},
 {id:3,type:'group',title:'Math Module 2',description:'Adaptive based on Module 1 performance.',questions:0,duration:0,difficulty:'Adaptive',condition:'Routes learners based on Module 1 score.'},
 {id:4,type:'section',title:'Math Module 2 - Easy',description:'Foundational practice for learners who need support.',questions:22,duration:35,difficulty:'Easy',condition:'If score < 50%'},
 {id:5,type:'section',title:'Math Module 2 - Advanced',description:'Advanced practice for learners who meet the threshold.',questions:22,duration:35,difficulty:'Advanced',condition:'If score ≥ 50%'},
 {id:6,type:'section',title:'Reading & Comp Module 1',description:'Reading comprehension assessment.',questions:27,duration:32,difficulty:'Medium'},
 {id:7,type:'group',title:'Reading & Comp Module 2',description:'Adaptive reading comprehension module.',questions:0,duration:0,difficulty:'Adaptive',condition:'Adaptive based on Module 1 performance.'},
 {id:8,type:'section',title:'R&C Module 2 - Easy',description:'Foundational reading practice.',questions:27,duration:32,difficulty:'Easy',condition:'If score < 50%'},
 {id:9,type:'section',title:'R&C Module 2 - Advanced',description:'Advanced reading practice.',questions:27,duration:32,difficulty:'Advanced',condition:'If score ≥ 50%'},
 {id:10,type:'complete',title:'Complete Assessment',description:'Finish the learning path.',questions:0,duration:0,difficulty:'—'}
]
const pos: Record<number,{x:number;y:number}> = {1:{x:355,y:22},2:{x:355,y:112},3:{x:345,y:204},4:{x:175,y:305},5:{x:520,y:305},6:{x:355,y:412},7:{x:345,y:505},8:{x:175,y:606},9:{x:520,y:606},10:{x:355,y:710}}
const edges = [[1,2],[2,3],[3,4],[3,5],[4,6],[5,6],[6,7],[7,8],[7,9],[8,10],[9,10]]
const idOf = (p: SavedPath) => p.databaseId ?? p.id

export default function App() {
 const [blocks,setBlocks] = useState<Block[]>(initial)
 const [selectedId,setSelectedId] = useState(4)
 const [prompt,setPrompt] = useState('Create conditional quiz flows with adaptive sections.')
 const [status,setStatus] = useState('Builder ready')
 const [paths,setPaths] = useState<SavedPath[]>([])
 const [pathId,setPathId] = useState('')
 const [loading,setLoading] = useState(false)
 const [preview,setPreview] = useState(false)
 const [zoom,setZoom] = useState(70)
 const [showConditions,setShowConditions] = useState(true)
 const [error,setError] = useState('')
 const selected = blocks.find(b=>b.id===selectedId) ?? blocks[0]

 function update<K extends keyof Block>(key:K,value:Block[K]) {
  setBlocks(curr=>curr.map(b=>b.id===selectedId?{...b,[key]:value}:b)); setStatus('Unsaved changes')
 }
 function add(type:'section'|'group') {
  const id=Math.max(0,...blocks.map(b=>b.id))+1
  setBlocks(curr=>[...curr,{id,type,title:type==='section'?'New Section':'New Group',description:'',questions:0,duration:0,difficulty:'Select difficulty',condition:type==='group'?'Add routing conditions.':''}])
  setSelectedId(id);setStatus('Unsaved changes')
 }
 function saveLocal() {
  try {
    const draft = {
      blocks,
      prompt,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      'edrevel-adaptive-path',
      JSON.stringify(draft)
    );

    setStatus('Draft saved successfully');
    setError('');
    alert('Draft saved successfully!');
  } catch (error) {
    console.error('Save draft failed:', error);
    setError('Unable to save draft. Please try again.');
    setStatus('Save failed');
  }
}
 function loadLocal() {
  try { const raw=localStorage.getItem('edrevel-adaptive-path'); if(!raw) throw Error('No local draft found.')
   const p=JSON.parse(raw);if(!Array.isArray(p.blocks)) throw Error('Draft format is invalid.')
   setBlocks(p.blocks);setPrompt(p.prompt??'');setSelectedId(p.blocks[0]?.id??1);setStatus('Local draft loaded');setError('')
  } catch(e){setError(e instanceof Error?e.message:'Could not load local draft.')}
 }
 async function loadPaths() {
  setLoading(true);setError('')
  try {const r=await fetch(API);if(!r.ok)throw Error(`HTTP ${r.status}`);const d=await r.json();if(!Array.isArray(d))throw Error('API did not return a list.')
   setPaths(d);setStatus(`Backend connected — ${d.length} path(s) found`)
  }catch(e){setError(`Could not load backend paths. Check Spring Boot at localhost:8080. ${e instanceof Error?e.message:''}`)}
  finally{setLoading(false)}
 }
 function loadPath() {
  const p=paths.find(p=>idOf(p)===Number(pathId));if(!p){setError('Choose a saved backend path first.');return}
  try {let raw:any=p.payload??p.content;if(typeof raw==='string')raw=JSON.parse(raw);if(typeof raw==='string')raw=JSON.parse(raw)
   const list=Array.isArray(raw)?raw:raw?.nodes;if(!Array.isArray(list))throw Error('Saved path has no node list.')
   setBlocks(list.map((n:any,i:number)=>({id:Number(n.id)||i+1,type:String(n.type).toLowerCase().includes('group')?'group':String(n.type).toLowerCase().includes('start')?'start':String(n.type).toLowerCase().includes('complete')?'complete':'section',title:n.title??n.label??`Section ${i+1}`,description:n.description??'',questions:Number(n.questions??n.config?.questions?.length??0),duration:Number(n.duration??n.config?.duration??0),difficulty:n.difficulty??n.config?.difficulty??'Select difficulty',condition:n.condition??n.config?.condition??''})))
   setSelectedId(Number(list[0]?.id)||1);setStatus(`Loaded path #${pathId}`);setError('')
  }catch(e){setError(e instanceof Error?e.message:'Could not parse saved path.')}
 }
 async function saveBackend() {
  setLoading(true);setError('')
  try {
   const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    name:'Edrevel Adaptive Learning Path',description:prompt,status:'DRAFT',version:1,
    nodes:blocks.map(b=>({id:String(b.id),componentId:String(b.id),type:b.type,label:b.title,description:b.description,position:pos[b.id]??{x:100,y:b.id*100},config:{questions:b.questions,duration:b.duration,difficulty:b.difficulty,condition:b.condition}})),
    edges:edges.map(([from,to])=>({from:String(from),to:String(to)}))
   })})
   if(!r.ok)throw Error(`HTTP ${r.status}: ${await r.text()}`)
   setStatus('Saved to backend');await loadPaths()
  }catch(e){setError(`Save failed: ${e instanceof Error?e.message:'Unknown error'}`)}
  finally{setLoading(false)}
 }
 function validate() {
  const missing=blocks.filter(b=>!b.title.trim()||!b.description.trim())
  if(missing.length){setError(`${missing.length} block(s) need a title and description.`);setStatus('Validation needs attention')}
  else{setError('');setStatus('Path validated successfully')}
 }
 function removeSelected() {
  if(!selected||selected.type==='start'||selected.type==='complete'){setError('Start and completion blocks cannot be deleted.');return}
  setBlocks(curr=>curr.filter(b=>b.id!==selectedId));setSelectedId(1);setStatus('Block deleted')
 }
 function reset(){setBlocks(initial);setSelectedId(4);setStatus('Sample adaptive path generated');setError('')}
 function nodeClass(b:Block){return `flow-node ${b.type}-node ${selectedId===b.id?'node-selected':''}`}
 return <main className="app-shell">
  <header className="topbar"><div className="brand"><div className="brand-mark">E</div><div><strong>Adaptive Learning Path Builder</strong><span>Create conditional quiz flows with adaptive sections</span></div></div>
   <nav className="top-nav"><button className={!preview?'active':''} onClick={()=>setPreview(false)}>▦　Builder</button><button className={preview?'active':''} onClick={()=>setPreview(true)}>◎　Preview</button><button
  type="button"
  onClick={(event) => {
    event.preventDefault();
    event.stopPropagation();
    saveLocal();
  }}
>
  Save Draft
</button><button className="publish" onClick={saveBackend} disabled={loading}>▷　Publish</button></nav>
  </header>
  <div className="workspace">
   <aside className="left-panel"><h3>Add Components</h3><p className="muted">Drag or click to add to canvas</p>
    <button className="component" onClick={()=>add('section')}><b className="blue-icon">□</b><span><strong>Section</strong><small>Add a quiz / assessment section</small></span></button>
    <button className="component" onClick={()=>add('group')}><b className="purple-icon">▱</b><span><strong>Group</strong><small>Group sections for conditional routing</small></span></button>
    <div className="how"><strong>ⓘ　How it works</strong><ul><li>Add sections and group related modules.</li><li>Use multiple paths where only one will be shown.</li><li>Set conditions based on previous scores.</li><li>Learners are routed based on performance.</li></ul></div>
    <div className="example"><strong>Example: SAT Adaptive Test</strong><div>Math Module 1<small>Regular section</small></div><section>Math Module 2 (Group)<article>Easy Version<small>If score &lt; 50%</small></article><article>Advanced<small>If score ≥ 50%</small></article></section></div>
    <div className="backend"><h3>Backend paths</h3><button onClick={loadPaths} disabled={loading}>{loading?'Loading…':'↻ Refresh saved paths'}</button><select value={pathId} onChange={e=>setPathId(e.target.value)}><option value="">Select saved path</option>{paths.map((p,i)=>{const id=idOf(p);return id==null?null:<option key={id} value={String(id)}>{p.name??`Learning path ${i+1}`} (ID: {id})</option>})}</select><button onClick={loadPath}>Load selected path</button><button onClick={loadLocal}>Load local draft</button></div>
   </aside>
   <section className="canvas-area"><div className="canvas-tools"><div className="zoom"><button onClick={()=>setZoom(z=>Math.max(40,z-10))}>−</button><span>{zoom}%</span><button onClick={()=>setZoom(z=>Math.min(110,z+10))}>＋</button></div><button onClick={()=>setShowConditions(v=>!v)}>⛶</button></div>
    {error&&<div className="error" role="alert">{error}</div>}
    {preview?<div className="preview"><small>LEARNER PREVIEW</small><h1>Adaptive Learning Path</h1><p>{prompt}</p>{blocks.map((b,i)=><article key={b.id}><small>STEP {i+1}</small><h3>{b.title}</h3><p>{b.description}</p><span>{b.questions} questions · {b.duration} minutes · {b.difficulty}</span></article>)}<button onClick={()=>setPreview(false)}>← Back to Builder</button></div>:
     <div className="flow-scroll"><div className="flow-canvas" style={{transform:`scale(${zoom/70})`}}>
      <svg viewBox="0 0 900 830" className="connectors" aria-hidden="true">{edges.map(([a,b],i)=>{const p=pos[a],q=pos[b];if(!p||!q||!blocks.some(n=>n.id===a)||!blocks.some(n=>n.id===b))return null;const x1=p.x+82,y1=p.y+35,x2=q.x+82,y2=q.y+7,mid=(y1+y2)/2;return <path key={i} className={Math.abs(x1-x2)>20?'branch':'connector'} d={Math.abs(x1-x2)>20?`M${x1} ${y1} C${x1} ${mid},${x2} ${mid},${x2} ${y2}`:`M${x1} ${y1} L${x2} ${y2}`}/>})}</svg>
      {blocks.map((b,i)=>{const p=pos[b.id]??{x:350,y:25+i*90};return <button key={b.id} className={nodeClass(b)} style={{left:p.x,top:p.y}} onClick={()=>setSelectedId(b.id)}><span className="node-icon">{b.type==='start'?'●':b.type==='group'?'▱':b.type==='complete'?'◉':'□'}</span><span className="node-copy"><strong>{b.title}</strong><small>{b.type==='group'?b.description:`${b.questions} questions • ${b.duration} minutes`}</small></span>{b.type==='group'&&<em>Group</em>}{showConditions&&b.condition&&<span className="node-condition">{b.condition}</span>}</button>})}
     </div></div>}
    <footer><span>●　{status}</span><div><button onClick={validate}>✓ Validate path</button><button onClick={reset}>Reset sample</button></div></footer>
   </section>
   <aside className="right-panel"><div className="properties-title"><h3>Properties</h3><button className="trash" onClick={removeSelected}>♜</button></div>
    {selected&&<><span className={`type-pill ${selected.type}`}>{selected.type==='group'?'GROUP':selected.type==='start'?'START ASSESSMENT':selected.type==='complete'?'COMPLETION':'SECTION'}</span>
     <label htmlFor="label">Label</label><input id="label" value={selected.title} onChange={e=>update('title',e.target.value)}/>
     <label htmlFor="description">Description</label><textarea id="description" value={selected.description} placeholder="Enter description" onChange={e=>update('description',e.target.value)}/>
     <hr/><h4>Section Details</h4><div className="two"><div><label htmlFor="questions">Questions</label><input id="questions" type="number" min="0" value={selected.questions} onChange={e=>update('questions',Number(e.target.value))}/></div><div><label htmlFor="duration">Duration (min)</label><input id="duration" type="number" min="0" value={selected.duration} onChange={e=>update('duration',Number(e.target.value))}/></div></div>
     <label htmlFor="difficulty">Difficulty</label><select id="difficulty" value={selected.difficulty} onChange={e=>update('difficulty',e.target.value)}><option>Select difficulty</option><option>Easy</option><option>Medium</option><option>Advanced</option><option>Adaptive</option></select>
     <hr/><div className="conditions-title"><h4>Assignment Conditions</h4><button onClick={()=>update('condition',selected.condition?selected.condition+'\nAdditional condition':'If score < 50%')}>＋ Add</button></div><p className="muted">Define when this section should be shown to learners.</p>
     {selected.condition&&<div className="condition-card"><div className="condition-head"><strong>Condition 1</strong><button onClick={()=>update('condition','')}>×</button></div><label htmlFor="condition">Condition rule</label><textarea id="condition" value={selected.condition} onChange={e=>update('condition',e.target.value)}/><div className="summary">{selected.condition}</div></div>}
     <hr/><h4>Parent Group</h4><p className="muted">{selected.type==='section'?'Math Module 2':'Root path'}</p>
    </>}
    <div className="tip"><strong>Quick tip</strong><p>Select any block on the canvas to edit its properties. Use groups to define adaptive branches based on learner performance.</p></div>
   </aside>
  </div>
 </main>
}
