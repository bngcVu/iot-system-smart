window.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.copy-btn').forEach(btn=>{
    btn.onclick=async()=>{
      const id=btn.getAttribute('data-target');
      const input=document.getElementById(id);
      if(!input) return;
      input.select();
      input.setSelectionRange(0, 99999);
      try {
        await navigator.clipboard.writeText(input.value);
        btn.textContent='Copied!';
        setTimeout(()=>btn.textContent='Copy',1200);
      } catch(e){
        document.execCommand('copy');
        btn.textContent='Copied!';
        setTimeout(()=>btn.textContent='Copy',1200);
      }
    };
  });
});


