const LINKSTORY_SUPABASE_URL='https://qwhpikyxilzwazeneddw.supabase.co';
const LINKSTORY_SUPABASE_KEY='sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q';
const LINKSTORY_SITE_URL='https://linkstorysite.vercel.app';
const linkstorySupabase=window.supabase.createClient(LINKSTORY_SUPABASE_URL,LINKSTORY_SUPABASE_KEY);
function authRedirect(){return LINKSTORY_SITE_URL+'/index.html'}
async function signInWithGoogle(){return linkstorySupabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirect()}})}
async function signInWithEmail(email,password){return linkstorySupabase.auth.signInWithPassword({email,password})}
function makeKxMail(username){return username.toLowerCase()+'@kx.mail'}
async function signInWithKxMail(kxMail,password){return signInWithEmail(kxMail,password)}
async function signUpWithEmail(email,password,fullName,username,accountRole='leitor'){return linkstorySupabase.auth.signUp({email,password,options:{data:{full_name:fullName,username,account_role:accountRole},emailRedirectTo:authRedirect()}})}
async function signUpWithKxMail(kxMail,password,fullName,username,accountRole='leitor'){return linkstorySupabase.auth.signUp({email:kxMail,password,options:{data:{full_name:fullName,username,account_role:accountRole,kx_mail:kxMail},emailRedirectTo:authRedirect()}})}
async function getLinkStoryProfile(){const{data:{user}}=await linkstorySupabase.auth.getUser();if(!user)return{data:null,error:null};return linkstorySupabase.from('profiles').select('id,kx_id,kx_mail,username,display_name,role,bio,avatar_url,recovery_email,preferences,created_at').eq('id',user.id).maybeSingle()}
async function updateLinkStoryRole(role){const allowed=['leitor','criador'];if(!allowed.includes(role))return{error:{message:'Tipo de conta inválido.'}};return linkstorySupabase.from('profiles').update({role,updated_at:new Date().toISOString()}).eq('id',(await linkstorySupabase.auth.getUser()).data.user.id).select('role').single()}
async function signOutLinkStory(){return linkstorySupabase.auth.signOut()}
async function getLinkStorySession(){return linkstorySupabase.auth.getSession()}
