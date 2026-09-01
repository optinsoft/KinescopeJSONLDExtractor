(() => {
  const checkAndSend = (url) => {
    //console.log(`checkAndSend: ${url}`);
    
    if (typeof url !== 'string') return;
    
      // Check for .mp4 before stripping parameters, as .mp4 may be part of the path
      if (url.includes('.mp4')) {
        try {
          // Use the built-in URL parser to reliably strip player parameters (?expires=...&sign=...)
          const urlObj = new URL(url, window.location.origin);
          // Reconstruct the URL using only the protocol, host, and clean file path
          const cleanUrl = urlObj.origin + urlObj.pathname;

          let mediaType = null;

          // Determine the stream type based on the cleaned URL
          if (cleanUrl.includes('audio_') || cleanUrl.includes('/audio')) {
            mediaType = 'audio';
          } else {
            mediaType = 'video';
          }

          //console.log(`!!! Found Kinescope ${mediaType} (Cleaned): ${cleanUrl} !!!`);
          
          // Pass the cleaned URL to the DOM bridge
          const bridge = document.createElement('div');
          bridge.className = 'kinescope-mp4-bridge';
          bridge.style.display = 'none';
          bridge.setAttribute('data-url', cleanUrl);
          bridge.setAttribute('data-media-type', mediaType);
          document.documentElement.appendChild(bridge);
          
        } catch (e) {
          console.error("Error processing URL:", e);
        }
      }
    
    else if(url.includes('media.m3u8')) {
      try {
        // Create a URL object
        const urlObj = new URL(url, window.location.origin);
        // Get the value of the "type" parameter
        const mediaType = urlObj.searchParams.get('type');
      
        //console.log(`!!! Found Kinescope m3u8 ${mediaType}: ${url} !!!`);
      
        // Pass the cleaned URL to the DOM bridge
        const bridge = document.createElement('div');
        bridge.className = 'kinescope-m3u8-bridge';
        bridge.style.display = 'none';
        bridge.setAttribute('data-url', url);
        bridge.setAttribute('data-media-type', mediaType);
        document.documentElement.appendChild(bridge);
      
      } catch (e) {
        console.error("Ошибка при обработке URL:", e);
      }
    }
  };

  // --- FETCH interception ---
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    if (args && args[0]) {
      const url = (typeof args[0] === 'object' && args[0].url) ? args[0].url : args[0];
      checkAndSend(url);
    }
    return originalFetch.apply(this, args);
  };

  // --- XHR interception ---
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    checkAndSend(url);
    return originalOpen.apply(this, [method, url, ...args]);
  };
})();