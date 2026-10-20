"use client";
import {useEffect,useRef,useState} from "react";
export default function SignaturePad({onChange}:{onChange:(v:string)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null);const drawing=useRef(false);const [hasInk,setHasInk]=useState(false);
 useEffect(()=>{const c=canvas.current;if(!c)return;const rect=c.getBoundingClientRect();c.width=Math.max(320,Math.round(rect.width*1.5));c.height=180;const ctx=c.getContext("2d");if(ctx){ctx.lineWidth=3;ctx.lineJoin="round";ctx.lineCap="round";ctx.strokeStyle="#123f37"}},[]);
 function at(e:React.PointerEvent<HTMLCanvasElement>){const c=canvas.current!;const b=c.getBoundingClientRect();return {x:(e.clientX-b.left)*c.width/b.width,y:(e.clientY-b.top)*c.height/b.height}}
 function start(e:React.PointerEvent<HTMLCanvasElement>){const c=canvas.current!;const ctx=c.getContext("2d")!;drawing.current=true;c.setPointerCapture(e.pointerId);const p=at(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);ctx.stroke();setHasInk(true)}
 function move(e:React.PointerEvent<HTMLCanvasElement>){if(!drawing.current)return;const c=canvas.current!;const ctx=c.getContext("2d")!;const p=at(e);ctx.lineTo(p.x,p.y);ctx.stroke()}
 function end(){if(!drawing.current)return;drawing.current=false;onChange(canvas.current!.toDataURL("image/png"))}
 function clear(){const c=canvas.current!;c.getContext("2d")?.clearRect(0,0,c.width,c.height);setHasInk(false);onChange("")}
 return <div className="office-sign"><canvas ref={canvas} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-label="Area gambar tanda tangan pemohon"/><div><small>Gambar tanda tangan dengan mouse atau jari. Ini merupakan tanda tangan sederhana, bukan TTE tersertifikasi.</small><button type="button" className="office-link" onClick={clear} disabled={!hasInk}>Hapus TTD</button></div></div>
}
