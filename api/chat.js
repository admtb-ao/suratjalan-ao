// Vercel Serverless Function — Gemini-powered assistant for Admin AO Portal.
const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const SOURCES = {
  ao: "https://script.google.com/macros/s/AKfycbyPhh5vp1usJ8PUl4YG0JfVmTnVvqYI50mXSbIwvV5j_H9Cts_fF5ngjhFUlN0AQ7A0yA/exec",
  gme: "https://script.google.com/macros/s/AKfycbzABIiq9cFNFd0DXvsRp4vVAsKxj6CA0PZdkDmILsJ_Ly-W4_Ngp7dMM2GQo2gCDqdK/exec",
  memo: "https://script.google.com/macros/s/AKfycbxUo0_Y9zjqqDL-tJJjQRv-CaYHTK48c5PWAlXKXer9-qJEbFMN4y3HfHTjqVEckvoL/exec?action=getMemo",
  alamat: "https://script.google.com/macros/s/AKfycbyhQAEgCO47nsnXLsRLxgZj73weKMMqHFTATKlBjtBiKFZ3GXqpXzvZ5DL8iDx8A2KV/exec"
};
const SITE_CONTEXT = `Kamu adalah asisten internal Admin AO Portal. Jawab dalam bahasa Indonesia, ramah, ringkas, praktis.
Fitur web: Surat Jalan AO; Surat Pengantar GME; Address Label (cari alamat, input manual, upload Excel, simpan ke Google Sheets, preview, cetak label/PDF); Memo (daftar dokumen Google Drive); Menu Makan Siang; TwidyTools; KopiWheel; tema terang/gelap; panel menu; buat/cetak/simpan surat jalan dan PDF.
Riwayat Surat Jalan AO/GME, nomor SO, pelanggan, keterangan, barang dan jumlah bersumber dari Google Apps Script. Alamat dari Google Sheets via Apps Script. Memo dari Google Drive.
Repo berisi berkas PDF menu makan siang Agustus, September, Oktober 2026 serta menu gabungan/revisi; jangan mengaku sudah membaca isi PDF jika isinya tidak tersedia di konteks.
Gunakan hanya data yang disediakan, jangan mengarang hasil database. Jika tidak ketemu atau sumber gagal, katakan terus terang. Jangan meminta/menampilkan API key, password, token, atau rahasia. Hanya tanya jawab dan pencarian; jangan menulis/mengubah/menghapus data.`;
const allowedOrigins = new Set(["https://suratjalanao.vercel.app","https://suratjalan-ao.vercel.app"]);
function flatten(value, out=[], depth=0) {
  if (depth>5 || value==null) return out;
  if (Array.isArray(value)) { for (const item of value.slice(0,10000)) flatten(item,out,depth+1); return out; }
  if (typeof value==="object") {
    const row={};
    for (const [k,v] of Object.entries(value)) {
      if (/password|token|secret|api.?key|credential/i.test(k)) continue;
      if (v==null || typeof v==="object") continue;
      if (["string","number","boolean"].includes(typeof v)) row[k]=String(v).slice(0,400);
    }
    if (Object.keys(row).length) out.push(row);
    for (const v of Object.values(value)) if (v && typeof v==="object") flatten(v,out,depth+1);
  }
  return out;
}
function searchRows(rows, query) {
  const terms=query.toLowerCase().split(/[^a-z0-9\u00c0-\u024f]+/i).filter(x=>x.length>1);
  return rows.map(row=>({row,score:terms.reduce((n,t)=>n+(Object.values(row).join(" ").toLowerCase().includes(t)?1:0),0)}))
    .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8).map(x=>x.row);
}
async function fetchSource(url) {
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),6500);
  try { const r=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}}); if(!r.ok) throw Error("source unavailable"); return await r.json(); }
  finally { clearTimeout(timer); }
}
module.exports=async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS") { res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS"); res.setHeader("Access-Control-Allow-Headers","Content-Type"); return res.status(204).end(); }
  if(req.method!=="POST") return res.status(405).json({error:"Gunakan POST."});
  if(req.headers.origin && !allowedOrigins.has(req.headers.origin)) return res.status(403).json({error:"Origin tidak diizinkan."});
  if(!process.env.GEMINI_API_KEY) return res.status(503).json({error:"Chatbot belum dikonfigurasi. Tambahkan GEMINI_API_KEY di Vercel."});
  try {
    let body=req.body;
    if(typeof body==="string") { try { body=JSON.parse(body); } catch { body={}; } }
    const message=typeof body?.message==="string"?body.message.trim().slice(0,1200):"";
    if(!message) return res.status(400).json({error:"Tulis pertanyaan terlebih dahulu."});
    const history=Array.isArray(body?.history)?body.history.slice(-8).filter(m=>["user","model"].includes(m?.role)&&typeof m?.text==="string").map(m=>({role:m.role,parts:[{text:m.text.slice(0,1000)}]})):[];
    let liveContext="";
    const q=message.toLowerCase();
    if(/surat jalan|surat pengantar|nomor so|no.?so|pelanggan|riwayat|database ao|database gme|barang|memo|dokumen|alamat|instansi|customer|telepon|telp/.test(q)) {
      const tasks=[];
      if(/alamat|instansi|customer|telepon|telp|penerima/.test(q)) tasks.push(["Database alamat",SOURCES.alamat]);
      if(/gme|surat pengantar/.test(q)) tasks.push(["Riwayat GME",SOURCES.gme]);
      if(/surat jalan|nomor so|no.?so|pelanggan|riwayat|database ao|barang/.test(q)) tasks.push(["Riwayat Surat Jalan AO",SOURCES.ao]);
      if(/memo|dokumen|file pdf|drive/.test(q)) tasks.push(["Daftar memo Google Drive",SOURCES.memo]);
      const result=await Promise.all(tasks.map(async ([name,url])=>{try{const raw=await fetchSource(url),rows=flatten(raw),matches=searchRows(rows,message);return{name,status:"ok",matches:matches.length?matches:rows.slice(0,2)}}catch{return{name,status:"unavailable",matches:[]}}}));
      liveContext="\nSumber data live (hanya bukti ini, jangan mengarang):\n"+JSON.stringify(result).slice(0,12000);
    }
    const contents=[...history,{role:"user",parts:[{text:"Pertanyaan: "+message+"\nKonteks situs:\n"+SITE_CONTEXT+liveContext}]}];
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+GEMINI_MODEL+":generateContent?key="+encodeURIComponent(process.env.GEMINI_API_KEY),{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({systemInstruction:{parts:[{text:SITE_CONTEXT}]},contents,generationConfig:{temperature:0.25,maxOutputTokens:900}})
    });
    const data=await response.json();
    if(!response.ok){console.error("Gemini API error",response.status,data?.error?.status||"");return res.status(response.status===429?429:502).json({error:response.status===429?"Batas permintaan AI tercapai. Coba lagi sebentar.":"Gemini gagal memproses pertanyaan. Periksa model/API di Vercel."});}
    const answer=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("").trim();
    if(!answer) return res.status(502).json({error:"AI belum menghasilkan jawaban. Coba pertanyaan lain."});
    return res.status(200).json({answer});
  } catch(e) { console.error("Chat handler error",e?.message||"unknown"); return res.status(500).json({error:"Terjadi kendala saat memproses chatbot. Coba lagi."}); }
};