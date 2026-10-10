import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.CAPSULE_PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.CAPSULE_EDITOR_BASE_URL || "http://localhost:3112";
const key = process.env.CAPSULE_EDITOR_STORAGE_KEY || "sb-scroll-test-auth-token";
const userId = "10000000-0000-4000-8000-000000000001";
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "lifecycle@example.invalid" };
const expiresAt = Math.floor(Date.now()/1000)+3600;
const token = [Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url"), Buffer.from(JSON.stringify({sub:userId,exp:expiresAt,aud:"authenticated"})).toString("base64url"),"synthetic-signature"].join(".");
const session = { access_token: token, refresh_token: "synthetic", user, token_type: "bearer", expires_in: 3600, expires_at: expiresAt };
const results = [];
for (const [engineName, engine] of [["chromium",chromium],["webkit",webkit]]) {
  const browser = await engine.launch({headless:true});
  try {
    for (const viewport of [{width:320,height:568},{width:390,height:844},{width:667,height:375},{width:1416,height:900}]) {
      const mobile = viewport.width < 768;
      const context = await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,serviceWorkers:"block",reducedMotion:"reduce"});
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      let notes = Array.from({length:60},(_,i)=>({id:"20000000-0000-4000-8000-"+String(i+1000).padStart(12,"0"),user_id:userId,titre:"Note de recette "+i,contenu:"Texte fictif. ".repeat(50),created_at:new Date(Date.UTC(2026,0,1,0,i)).toISOString(),kanban_colonne:"todo",kanban_ordre:i,epinglee:false,share_token:null,archived_at:null,deleted_at:null,purge_started_at:null,lifecycle_version:0}));
      const targetId = notes[59].id;
      notes[59].share_token = "40000000-0000-4000-8000-000000000001";
      const oldArchive = {...notes[0],id:"20000000-0000-4000-8000-000000002001",titre:"Archive montagne",archived_at:"2026-10-10T20:00:00Z"};
      const oldTrash = {...notes[0],id:"20000000-0000-4000-8000-000000002002",titre:"Corbeille lac",deleted_at:"2026-10-10T20:00:00Z"};
      notes.push(oldArchive,oldTrash);
      let purgeAttempts = 0;
      const errors = [];
      page.on("pageerror", error=>errors.push(error.message));
      await context.route("**/*.supabase.co/**",async route=>{
        const request=route.request(), url=new URL(request.url());
        const headers={"access-control-allow-origin":"*","access-control-allow-headers":request.headers()["access-control-request-headers"]||"*","access-control-allow-methods":"GET,POST,OPTIONS"};
        if(request.method()==="OPTIONS")return route.fulfill({status:204,headers});
        if(url.pathname==="/rest/v1/rpc/transition_note_lifecycle"){
          const args=request.postDataJSON(),note=notes.find(n=>n.id===args.p_note_id);
          if(note.lifecycle_version!==args.p_expected_version)return route.fulfill({status:400,headers,json:{message:"NOTE_VERSION_CONFLICT"}});
          note.lifecycle_version++;
          if(args.p_action==="archive")note.archived_at="2026-10-10T20:00:00Z";
          if(args.p_action==="unarchive")note.archived_at=null;
          if(args.p_action==="trash"){note.deleted_at="2026-10-10T20:00:00Z";note.share_token=null;}
          if(args.p_action==="restore"){note.deleted_at=null;note.share_token=null;}
          return route.fulfill({status:200,headers,json:{id:note.id,archived_at:note.archived_at,deleted_at:note.deleted_at,purge_started_at:note.purge_started_at,lifecycle_version:note.lifecycle_version,share_token:note.share_token}});
        }
        assert.equal(request.method(),"GET","Mutation inattendue : "+url.pathname);
        const data={"/auth/v1/user":user,"/rest/v1/notes":notes,"/rest/v1/tags":[],"/rest/v1/notes_tags":[],"/rest/v1/note_images":[]}[url.pathname];
        assert.notEqual(data,undefined);
        const range=request.headers().range?.split("-").map(Number);
        return route.fulfill({status:200,headers,json:range&&Array.isArray(data)?data.slice(range[0],range[1]+1):data});
      });
      await context.route("**/api/notes/*/purge",async route=>{
        purgeAttempts++;
        const note=notes.find(n=>n.id===targetId);
        if(purgeAttempts===1){note.purge_started_at="2026-10-10T20:00:00Z";note.lifecycle_version++;return route.fulfill({status:503,json:{error:"Nettoyage simulé interrompu",code:"IMAGE_CLEANUP_INCOMPLETE"}});}
        notes=notes.filter(n=>n.id!==targetId);
        return route.fulfill({status:200,json:{deleted:true}});
      });
      await context.addInitScript(({key,session})=>{localStorage.setItem(key,JSON.stringify(session));localStorage.setItem("capsule-help-progress-v1",JSON.stringify({completed:[],checklistHidden:true}));},{key,session});
      try {
        console.log(JSON.stringify({engineName,viewport,stage:"start"}));
        await page.goto(baseURL);
        const openScope=()=>page.locator(".scope-trigger").click();
        const chooseScope=async label=>{await openScope();await page.getByRole("dialog",{name:"Mes notes",exact:true}).getByRole("button").filter({hasText:label}).click();};
        await page.locator(".scope-trigger").filter({hasText:"60"}).waitFor();
        await page.locator(mobile?".mobile-navigation":".view-switcher").getByRole("button",{name:"Liste",exact:true}).click();
        const list=page.locator(".panel-left-scroll");
        await list.evaluate(node=>node.scrollTop=node.scrollHeight);
        const top=await list.evaluate(node=>node.scrollTop);
        console.log("scope restore");
        await chooseScope("Archives");
        await page.locator(".note-item").filter({hasText:"Archive montagne"}).waitFor();
        await chooseScope("Notes");
        await page.waitForFunction(top=>Math.abs(document.querySelector(".panel-left-scroll").scrollTop-top)<3,top);
        await page.locator(".note-item").filter({hasText:"Note de recette 59"}).click();
        const plus=()=>page.locator(".detail-footer").getByRole("button",{name:/^Plus/}).click();
        await plus();
        await page.getByRole("dialog",{name:"Actions de la note"}).getByRole("button",{name:/^Archiver/}).click();
        await page.locator(".scope-trigger").filter({hasText:"59"}).waitFor();
        assert.ok(notes.find(n=>n.id===targetId).share_token,"Archive doit conserver le partage");
        console.log("archive and undo");
        await page.getByRole("button",{name:"Annuler",exact:true}).click();
        await page.locator(".scope-trigger").filter({hasText:"60"}).waitFor();
        await chooseScope("Archives");
        assert.equal(await page.locator(".note-item").count(),1);
        await chooseScope("Notes");
        await page.locator(".note-item").filter({hasText:"Note de recette 59"}).click();
        await plus();
        await page.getByRole("button",{name:"Mettre à la corbeille…",exact:true}).click();
        await page.getByRole("dialog",{name:"Mettre à la corbeille ?",exact:true}).getByRole("button",{name:"Mettre à la corbeille",exact:true}).click();
        await page.locator(".scope-trigger").filter({hasText:"59"}).waitFor();
        assert.equal(notes.find(n=>n.id===targetId).share_token,null);
        console.log("trash and restore");
        await chooseScope("Corbeille");
        await page.locator(".note-item").filter({hasText:"Note de recette 59"}).click();
        assert.equal(await page.locator(".detail-footer").getByRole("button",{name:"Modifier",exact:true}).count(),0);
        await page.locator(".detail-footer").getByRole("button",{name:"Restaurer",exact:true}).click();
        await page.locator(".scope-trigger").filter({hasText:"1"}).waitFor();
        assert.equal(notes.find(n=>n.id===targetId).share_token,null);
        await chooseScope("Notes");
        console.log("search scopes");
        const openSearch=()=>mobile?page.locator(".mobile-navigation").getByRole("button",{name:"Chercher",exact:true}).click():page.getByRole("button",{name:"Ouvrir la palette de commandes",exact:true}).click();
        await openSearch();
        const query=page.getByRole("combobox",{name:"Rechercher dans toutes les notes",exact:true});
        await query.fill("montagne");
        assert.equal(await page.getByRole("option").filter({hasText:"Archive montagne"}).count(),0);
        await page.getByRole("button",{name:"Notes + archives",exact:true}).click();
        await page.getByRole("option").filter({hasText:"Archive montagne"}).click();
        await page.locator(".detail-footer").getByText("Archive",{exact:true}).waitFor();
        await page.getByRole("button",{name:"Retour aux notes",exact:true}).click();
        await openSearch();
        await query.fill("lac");
        assert.equal(await page.getByRole("option").filter({hasText:"Corbeille lac"}).count(),0);
        await page.getByRole("button",{name:"Corbeille",exact:true}).click();
        await page.getByRole("option").filter({hasText:"Corbeille lac"}).waitFor();
        await page.getByRole("button",{name:"Fermer la recherche",exact:true}).click();
        await chooseScope("Notes");
        await page.locator(".note-item").filter({hasText:"Note de recette 59"}).click();await plus();
        await page.getByRole("button",{name:"Mettre à la corbeille…",exact:true}).click();
        await page.locator(".scope-trigger").filter({hasText:"59"}).waitFor();
        await chooseScope("Corbeille");
        await page.locator(".note-item").filter({hasText:"Note de recette 59"}).click();await plus();
        await page.getByRole("button",{name:"Supprimer définitivement…",exact:true}).click();
        const confirm=page.getByRole("dialog",{name:"Supprimer définitivement ?",exact:true});
        await confirm.getByText("Note de recette 59",{exact:true}).waitFor();
        console.log("purge request");
        await confirm.getByRole("button",{name:"Supprimer définitivement",exact:true}).click();
        await confirm.getByText(/Un nettoyage a déjà commencé/).waitFor();
        console.log("purge request");
        await confirm.getByRole("button",{name:"Supprimer définitivement",exact:true}).click();
        await confirm.waitFor({state:"hidden"});
        assert.equal(purgeAttempts,2);assert.equal(notes.some(n=>n.id===targetId),false);
        assert.deepEqual(errors,[]);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Débordement horizontal");
        if(process.env.CAPSULE_QA_SCREENSHOTS){await page.screenshot({path:process.env.CAPSULE_QA_SCREENSHOTS+`/lifecycle-${engineName}-${viewport.width}.png`});}
        results.push({engine:engineName,viewport,passed:true});
        console.log(JSON.stringify({engineName,viewport,stage:"passed"}));
      } finally {await context.close();}
    }
  } finally {await browser.close();}
}
console.log(JSON.stringify({passed:results.length,total:8,results},null,2));
