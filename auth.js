const LINKSTORY_SUPABASE_URL='https://qwhpikyxilzwazeneddw.supabase.co';
const LINKSTORY_SUPABASE_KEY='sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q';
const LINKSTORY_SITE_URL='https://linkstorysite.vercel.app';
const linkstorySupabase=window.supabase.createClient(LINKSTORY_SUPABASE_URL,LINKSTORY_SUPABASE_KEY);
const KX_AUTH_URL=LINKSTORY_SUPABASE_URL+'/functions/v1/kx-auth';
function authRedirect(){return LINKSTORY_SITE_URL+'/index.html'}
async function callKxAuth(payload){
 const response=await fetch(KX_AUTH_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':LINKSTORY_SUPABASE_KEY},body:JSON.stringify(payload)});
 const result=await response.json().catch(()=>({error:'Resposta inválida do servidor de contas.'}));
 if(!response.ok) return {data:null,error:{message:result.error||'Não foi possível concluir a operação.'}};
 return {data:result,error:null};
}
async function signInWithGoogle(){return linkstorySupabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirect()}})}
async function signInWithEmail(email,password){return linkstorySupabase.auth.signInWithPassword({email,password})}
function makeKxMail(username){return username.toLowerCase().replace(/^@/,'').replace(/@kx\.mail$/i,'')+'@kx.mail'}
async function signInWithKxMail(kxMail,password){
 const username=String(kxMail||'').trim().toLowerCase().replace(/@kx\.mail$/i,'').replace(/^@/,'');
 const {data,error}=await callKxAuth({action:'login',username,password});
 if(error)return {data:null,error};
 const session=data.session;
 if(!session?.access_token||!session?.refresh_token)return {data:null,error:{message:'O servidor não retornou uma sessão válida.'}};
 const result=await linkstorySupabase.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
 return {data:result.data,error:result.error};
}
async function signUpWithEmail(email,password,fullName,username,accountRole='leitor'){return signUpWithKxMail(makeKxMail(username),password,fullName,username,accountRole)}
async function signUpWithKxMail(kxMail,password,fullName,username,accountRole='leitor'){
 const cleanUsername=String(username||kxMail||'').trim().toLowerCase().replace(/@kx\.mail$/i,'').replace(/^@/,'');
 const {data,error}=await callKxAuth({action:'signup',username:cleanUsername,password,name:fullName,role:accountRole});
 if(error)return {data:null,error};
 const login=await signInWithKxMail(kxMail,password);
 if(login.error)return {data:null,error:login.error};
 if(accountRole==='criador') await updateLinkStoryRole('criador');
 return {data:{user:login.data?.user,session:login.data?.session},error:null};
}
async function getLinkStoryProfile(){const{data:{user},error:authError}=await linkstorySupabase.auth.getUser();if(authError)return{data:null,error:authError};if(!user)return{data:null,error:null};const{data:profile,error:profileError}=await linkstorySupabase.from('profiles').select('id,username,display_name,role,bio,avatar_url,created_at,updated_at,kx_mail,kx_id,k_code').eq('id',user.id).maybeSingle();if(profileError)return{data:null,error:profileError};if(!profile)return{data:null,error:null};const{data:privateData,error:privateError}=await linkstorySupabase.rpc('get_my_linkstory_private_profile');if(privateError)return{data:null,error:privateError};return{data:{...profile,...(privateData||{})},error:null}}
async function updateLinkStoryRole(role){const allowed=['leitor','criador'];if(!allowed.includes(role))return{error:{message:'Tipo de conta inválido.'}};const{data:{user},error:authError}=await linkstorySupabase.auth.getUser();if(authError||!user)return{error:authError||{message:'Entre na sua conta para alterar o tipo.'}};const{data,error}=await linkstorySupabase.rpc('set_my_linkstory_account_role',{p_role:role});if(error)return{error};return{data:{role:data},error:null}}
async function signOutLinkStory(){return linkstorySupabase.auth.signOut()}
async function getLinkStorySession(){return linkstorySupabase.auth.getSession()}
