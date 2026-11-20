const SUPABASE_URL = "https://qwhpikyxilzwazeneddw.supabase.co";
const SUPABASE_KEY = "sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q";
function reply(res,status,data){res.status(status);res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");return res.end(JSON.stringify(data));}
module.exports = async function handler(req,res){
  if(req.method!=="POST")return reply(res,405,{error:"Método não permitido."});
  try{
    const auth=String(req.headers.authorization||"");
    const token=auth.startsWith("Bearer ")?auth.slice(7):"";
    if(!token)throw new Error("Entre na sua conta para usar a assistente.");
    const headers={apikey:SUPABASE_KEY,Authorization:"Bearer "+token};
    const userResponse=await fetch(SUPABASE_URL+"/auth/v1/user",{headers});
    if(!userResponse.ok)throw new Error("Sua sessão expirou. Entre novamente.");
    const user=await userResponse.json();
    const profileResponse=await fetch(SUPABASE_URL+"/rest/v1/profiles?id=eq."+encodeURIComponent(user.id)+"&select=role",{headers});
    if(!profileResponse.ok)throw new Error("Não foi possível validar seu perfil.");
    const profiles=await profileResponse.json();
    if(!profiles[0]||profiles[0].role!=="criador")throw new Error("A assistente é exclusiva para contas de criador.");
    const body=req.body||{};
    const allowed=["title","genre","description","chapterTitle"];
    const field=String(body.field||"");
    if(!allowed.includes(field))throw new Error("Campo de publicação inválido.");
    const value=String(body.value||"").trim().slice(0,3000);
    const context={
      title:String(body.title||"").slice(0,120),
      genre:String(body.genre||"").slice(0,120),
      description:String(body.description||"").slice(0,1800),
      chapterTitle:String(body.chapterTitle||"").slice(0,160)
    };
    const apiKey=process.env.GOOGLE_GEMINI_API_KEY;
    if(!apiKey)throw new Error("A assistente ainda não está configurada no servidor.");
    const labels={title:"título do mangá",genre:"gênero",description:"sinopse/descrição do mangá",chapterTitle:"título do capítulo"};
    const prompt="Você é a assistente editorial do LinkStory. Ajude autores de mangá a melhorar textos de publicação em português brasileiro. Preserve a intenção, o universo, os nomes próprios e os fatos fornecidos; não invente acontecimentos, poderes ou personagens. Seja claro, atraente e natural, sem clichês promocionais. Retorne somente o texto final, sem aspas, explicações ou Markdown. Campo: "+labels[field]+". Texto atual: "+(value||"(vazio; crie uma sugestão com base no contexto)")+". Contexto da obra: "+JSON.stringify(context)+". Se faltarem informações para criar conteúdo factual, produza uma versão neutra e não invente detalhes.";
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent,{
      method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
      body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.7,maxOutputTokens:700}})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error&&data.error.message?data.error.message:"A assistente não conseguiu responder agora.");
    const suggestion=(data.candidates||[]).flatMap(c=>c.content&&c.content.parts||[]).map(p=>p.text||"").join("\n").trim();
    if(!suggestion)throw new Error("A assistente não retornou uma sugestão. Tente novamente.");
    return reply(res,200,{ok:true,suggestion:suggestion.slice(0,4000)});
  }catch(error){return reply(res,400,{error:String(error&&error.message||"Não foi possível usar a assistente.").slice(0,300)});}
};
module.exports.config={maxDuration:30,bodyParser:{sizeLimit:"32kb"}};
