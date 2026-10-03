const fmt=(v,d=2)=>v==null?"—":Number(v).toFixed(d);

function eaqiLevel(pm25){
  if(pm25==null)return null;
  if(pm25<=10)return{level:"Bardzo dobra",color:"#22c55e"};
  if(pm25<=20)return{level:"Dobra",color:"#84cc16"};
  if(pm25<=25)return{level:"Umiarkowana",color:"#facc15"};
  if(pm25<=50)return{level:"Dostateczna",color:"#fb923c"};
  if(pm25<=100)return{level:"Zła",color:"#f87171"};
  return{level:"Bardzo zła",color:"#c084fc"};
}

function paqiLevel(pm25,pm10){
  if(pm25==null&&pm10==null)return null;
  const pm25Score=pm25!=null?(pm25<=20?1:pm25<=40?2:pm25<=60?3:pm25<=80?4:5):0;
  const pm10Score=pm10!=null?(pm10<=20?1:pm10<=40?2:pm10<=60?3:pm10<=80?4:5):0;
  const max=Math.max(pm25Score,pm10Score);
  const levels=["","Bardzo dobra","Dobra","Umiarkowana","Dostateczna","Zła"];
  const colors=["","#22c55e","#84cc16","#facc15","#fb923c","#f87171"];
  return{level:levels[max]||"Brak danych",color:colors[max]||"#94a3b8"};
}

function render(cache,history){
  if(!cache){
    document.getElementById("status").textContent="Brak zapisanych danych. Kliknij Odśwież.";
    document.getElementById("status").className="error";
    return;
  }
  const d=cache.data||{};
  const loc=cache.location||{};
  const locText = loc.description || [loc.street, loc.city, loc.zip].filter(Boolean).join(", ");
  document.getElementById("location").textContent=locText||"Brak adresu";
  document.getElementById("temperature").textContent=fmt(d.temperature);
  document.getElementById("pressure").textContent=fmt(d.pressure);
  document.getElementById("humidity").textContent=fmt(d.humidity);
  const pm25El=document.getElementById("pm25");
  const pm10El=document.getElementById("pm10");
  pm25El.textContent=fmt(d.pm25);
  pm10El.textContent=fmt(d.pm10);
  const eaqi=eaqiLevel(d.pm25);
  if(eaqi){
    pm25El.style.color=eaqi.color;
    pm10El.style.color=eaqi.color;
    document.getElementById("eaqi").textContent=`EAQI: ${eaqi.level}`;
    document.getElementById("eaqi").style.color=eaqi.color;
  }
  const paqi=paqiLevel(d.pm25,d.pm10);
  if(paqi){
    document.getElementById("paqi").textContent=`PAQI: ${paqi.level}`;
    document.getElementById("paqi").style.color=paqi.color;
  }
  document.getElementById("pm1").textContent=fmt(d.pm1);
  document.getElementById("pm4").textContent=fmt(d.pm4);
  document.getElementById("no2").textContent=fmt(d.no2);
  document.getElementById("o3").textContent=fmt(d.o3);
  document.getElementById("point").textContent=`${cache.code||"Paczkomat"} · dane z InPost`;
  document.getElementById("updated").textContent=`Ostatnia aktualizacja: ${new Date(cache.fetchedAt).toLocaleString()}`;
  document.getElementById("status").textContent="Dane są pobierane maksymalnie raz na godzinę.";
  document.getElementById("status").className="ok";
  renderChart(history);
}

function renderChart(history){
  const ctx=document.getElementById("chart").getContext("2d");
  if(!history||history.length===0){
    document.getElementById("chart").style.display="none";
    return;
  }
  document.getElementById("chart").style.display="block";
  const labels=history.map(h=>new Date(h.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
  const temp=history.map(h=>h.temperature);
  const hum=history.map(h=>h.humidity);
  const pres=history.map(h=>h.pressure);
  const pm25=history.map(h=>h.pm25);
  const pm10=history.map(h=>h.pm10);
  if(window.chartInstance)window.chartInstance.destroy();
  window.chartInstance=new Chart(ctx,{
    type:"line",
    data:{
      labels,
      datasets:[
        {label:"Temp (°C)",data:temp,borderColor:"#f97316",tension:0.3},
        {label:"Wilgotność (%)",data:hum,borderColor:"#22d3ee",tension:0.3},
        {label:"Ciśnienie (hPa)",data:pres,borderColor:"#a78bfa",tension:0.3},
        {label:"PM2.5",data:pm25,borderColor:"#fb923c",tension:0.3},
        {label:"PM10",data:pm10,borderColor:"#f87171",tension:0.3}
      ]
    },
    options:{
      responsive:true,
      plugins:{legend:{labels:{color:"#cbd5e1"}}},
      scales:{
        x:{ticks:{color:"#94a3b8"}},
        y:{ticks:{color:"#94a3b8"}}
      }
    }
  });
}

function load(){
  chrome.runtime.sendMessage({action:"getCache"},r=>{
    if(r&&r.cache){
      render(r.cache,r.history||[]);
    }else{
      render(null,[]);
    }
  });
}

document.getElementById("refresh").onclick=()=>{
  document.getElementById("status").textContent="Pobieranie…";
  chrome.runtime.sendMessage({action:"refresh"},r=>{
    if(r&&r.ok){
      load();
    }else{
      document.getElementById("status").textContent=r?.error||"Nie udało się pobrać danych.";
      document.getElementById("status").className="error";
    }
  });
};

load();
