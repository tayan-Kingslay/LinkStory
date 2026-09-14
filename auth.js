const LINKSTORY_SUPABASE_URL='https://qwhpikyxilzwazeneddw.supabase.co';
const LINKSTORY_SUPABASE_KEY='sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q';
const LINKSTORY_SITE_URL='https://linkstorysite.vercel.app';
const linkstorySupabase=window.supabase.createClient(LINKSTORY_SUPABASE_URL,LINKSTORY_SUPABASE_KEY);
function authRedirect(){return LINKSTORY_SITE_URL+'/index.html'}
async function signInWithGoogle(){return linkstorySupabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirect()}})}
async function signInWithEmail(email,password){return linkstorySupabase.auth.signInWithPassword({email,password})}
async function signUpWithEmail(email,password,fullName){return linkstorySupabase.auth.signUp({email,password,options:{data:{full_name:fullName},emailRedirectTo:authRedirect()}})}
async function signOutLinkStory(){return linkstorySupabase.auth.signOut()}
async function getLinkStorySession(){return linkstorySupabase.auth.getSession()}
