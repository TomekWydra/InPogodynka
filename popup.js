const url=document.getElementById("url"),code=document.getElementById("code"),pointId=document.getElementById("pointId");
chrome.storage.local.get(["paczkomat_url","paczkomat_code","paczkomat_point_id"],x=>{
  url.value=x.paczkomat_url||"https://inpost.pl/paczkomat-radziwillow-rwl01bapp-warszawska-paczkomaty-mazowieckie";
  code.value=x.paczkomat_code||"RWL01BAPP";
  pointId.value=x.paczkomat_point_id||"";
});
url.oninput=()=>{
  const m=url.value.match(/([a-z]{3}\d{2,}[a-z0-9]*)/i);
  if(m)code.value=m[1].toUpperCase();
};
document.getElementById("save").onclick=()=>{
  const pid=pointId.value.trim();
  if(!pid){alert("Point ID jest wymagane. Znajdź je w DevTools (F12) → Network → air_index_level.");return;}
  chrome.storage.local.set({
    paczkomat_url:url.value.trim(),
    paczkomat_code:code.value.trim().toUpperCase(),
    paczkomat_point_id:Number(pid)
  },()=>{
    chrome.runtime.sendMessage({action:"refresh"},()=>{
      document.body.insertAdjacentHTML("beforeend","<p style='color:#86efac'>Zapisano. Otwórz nową kartę.</p>");
    });
  });
};