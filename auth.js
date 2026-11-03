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
async function getLinkStoryProfile(){const{data:{user},error:authError}=await linkstorySupabase.auth.getUser();if(authError)return{data:null,error:authError};if(!user)return{data:null,error:null};const{data:profile,error:profileError}=await linkstorySupabase.from('profiles').select('id,username,display_name,role,bio,avatar_url,created_at,updated_at').eq('id',user.id).maybeSingle();if(profileError)return{data:null,error:profileError};if(!profile)return{data:null,error:null};const{data:privateData,error:privateError}=await linkstorySupabase.rpc('get_my_linkstory_private_profile');if(privateError)return{data:null,error:privateError};return{data:{...profile,...(privateData||{})},error:null}}
async function updateLinkStoryRole(role){const allowed=['leitor','criador'];if(!allowed.includes(role))return{error:{message:'Tipo de conta inválido.'}};const{data:{user},error:authError}=await linkstorySupabase.auth.getUser();if(authError||!user)return{error:authError||{message:'Entre na sua conta para alterar o tipo.'}};const{data,error}=await linkstorySupabase.rpc('set_my_linkstory_account_role',{p_role:role});if(error)return{error};return{data:{role:data},error:null}}
async function signOutLinkStory(){return linkstorySupabase.auth.signOut()}
async function getLinkStorySession(){return linkstorySupabase.auth.getSession()}
