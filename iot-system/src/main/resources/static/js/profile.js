window.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.thread-opener').forEach(input=>{
    input.addEventListener('click', ()=>{
      const url = input.value?.trim();
      if(!url) return;
      const w = 980, h = 700;
      const left = (window.screen.width - w) / 2;
      const top = (window.screen.height - h) / 2;
      window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},noopener`);
    });
  });

  document.querySelectorAll('.thread-open-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const url = input?.value?.trim();
      if(!url) return;
      const w = 980, h = 700;
      const left = (window.screen.width - w) / 2;
      const top = (window.screen.height - h) / 2;
      window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},noopener`);
    });
  });

  

  
});


