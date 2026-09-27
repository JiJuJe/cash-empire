"use strict";
(() => {
  const panel=document.getElementById("tab-chat");
  const list=document.getElementById("chatMessages");
  const form=document.getElementById("chatForm");
  const input=document.getElementById("chatInput");
  const send=document.getElementById("chatSend");
  const status=document.getElementById("chatStatus");
  if(!panel||!list||!form||!input||!send||!status)return;
  let busy=false,lastSent=0,lastSignature="",loading=false;
  const visible=()=>!panel.hidden&&!document.hidden;
  const signedIn=()=>!document.getElementById("accountButton").hidden;
  function updateControls(){
    const wait=Math.max(0,3000-(Date.now()-lastSent));
    input.disabled=!signedIn();
    send.disabled=!signedIn()||busy||wait>0;
    send.textContent=busy?"Sending...":wait>0?`${Math.ceil(wait/1000)}s`:"Send";
    if(!signedIn())status.textContent="Sign in with Google to send a message.";
    else if(status.textContent==="Sign in with Google to send a message.")status.textContent="";
  }
  async function refresh(){
    if(!visible()||loading||!navigator.onLine)return;
    loading=true;
    try{
      const response=await fetch("/api/chat",{credentials:"same-origin",cache:"no-store"});
      if(!response.ok)throw Error("Chat is temporarily unavailable.");
      const {messages}=await response.json();
      const signature=messages.map(m=>m.id).join(",");
      if(signature!==lastSignature){
        const atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<70;
        const nodes=messages.map(message=>{
          const row=document.createElement("p");row.className="chat-message";
          const name=document.createElement("strong");name.textContent=message.username+": ";
          const body=document.createElement("span");body.textContent=message.body;
          row.append(name,body);return row;
        });
        list.replaceChildren(...nodes);
        if(!nodes.length)list.textContent="No messages yet. Start the conversation!";
        if(atBottom||!lastSignature)list.scrollTop=list.scrollHeight;
        lastSignature=signature;
      }
      if(status.textContent==="Chat is temporarily unavailable.")status.textContent="";
    }catch(_){status.textContent="Chat is temporarily unavailable.";}
    finally{loading=false;updateControls();}
  }
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const message=input.value.trim();
    if(!message||busy||Date.now()-lastSent<3000)return;
    if(!signedIn()){updateControls();return;}
    busy=true;status.textContent="";updateControls();
    try{
      const response=await fetch("/api/chat",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({message})});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||"Could not send message.");
      input.value="";lastSent=Date.now();await refresh();
    }catch(error){status.textContent=error.message||"Could not send message.";}
    finally{busy=false;updateControls();}
  });
  document.querySelector('[data-tab="chat"]')?.addEventListener("click",()=>{updateControls();refresh();});
  document.addEventListener("visibilitychange",()=>{if(visible())refresh();});
  setInterval(()=>{updateControls();refresh();},8000);
  setInterval(updateControls,250);
  updateControls();
})();
