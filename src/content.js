(() => {
  // === CODE FOR IFRAME ===
  if (window !== window.top) {
    
    // 1. Search for JSON-LD
    function lookForJsonLd() {
      const scriptElement = document.querySelector('script[type="application/ld+json"]');
      if (scriptElement) {
        try {
          const data = JSON.parse(scriptElement.innerText);
          if (data && data["@type"] === "VideoObject") {
            chrome.runtime.sendMessage({ type: "KINESCOPE_FOUND", payload: data });
            clearInterval(searchInterval);
          }
        } catch (e) {}
      }
    }
    const searchInterval = setInterval(lookForJsonLd, 500);
    setTimeout(() => clearInterval(searchInterval), 10000);
	
	  // 2. Continuously scan the DOM for m3u8 bridges
    function checkM3u8Bridge() {
      const bridgeElement = document.querySelector('.kinescope-m3u8-bridge');
      if (bridgeElement) {
        const url = bridgeElement.getAttribute('data-url');
        const mediaType = bridgeElement.getAttribute('data-media-type');
		
		    console.log(`kinescope-m3u8-bridge (${mediaType}) found: ${url}`);
		
        if (url && mediaType) {
          chrome.runtime.sendMessage({ 
            type: "M3U8_LINK_FOUND", 
            payload: { url: url, mediaType: mediaType } 
          });
        }
		
        bridgeElement.remove(); // Remove it to avoid processing it again
      }
    }
    
	  // 3. Continuously scan the DOM for mp4 bridges
    function checkMp4Bridge() {
      const bridgeElement = document.querySelector('.kinescope-mp4-bridge');
      if (bridgeElement) {
        const url = bridgeElement.getAttribute('data-url');
        const mediaType = bridgeElement.getAttribute('data-media-type');
		
		    console.log(`kinescope-mp4-bridge (${mediaType}) found: ${url}`);
		
        if (url && mediaType) {
          chrome.runtime.sendMessage({ 
            type: "MP4_LINK_FOUND", 
            payload: { url: url, mediaType: mediaType } 
          });
        }
		
        bridgeElement.remove(); // Remove it to avoid processing it again
      }
    }
    
    // Check the DOM every 300ms for links
	  setInterval(checkM3u8Bridge, 300);
    setInterval(checkMp4Bridge, 300);
  } 
  
  // === CODE FOR THE MAIN PAGE ===
  else {
	  const videoCollection = {
      meta: null,
      m3u8VideoLinks: new Set(),
      m3u8AudioLinks: new Set(),
      mp4VideoLinks: new Set(),
      mp4AudioLinks: new Set()
    };
	
	  let logTimeout = null;
	
    function buildLogText() {
      let text = `=== VIDEO REPORT ===\n`;
      if (videoCollection.meta) {
        text += `Name: ${videoCollection.meta.name || "Not specified"}\n`;
        text += `M3U8 Manifest: ${videoCollection.meta.contentUrl || "Not available"}\n`;
        text += `Duration: ${videoCollection.meta.duration || "No data"}\n`;
      }

      text += `\n--- Video m3u8 ---\n`;
      if (videoCollection.m3u8VideoLinks.size > 0) {
        videoCollection.m3u8VideoLinks.forEach(link => text += `${link}\n`);
      } else { text += `Not found\n`; }

      text += `\n--- Audio m3u8 ---\n`;
      if (videoCollection.m3u8AudioLinks.size > 0) {
        videoCollection.m3u8AudioLinks.forEach(link => text += `${link}\n`);
      } else { text += `Not found\n`; }

      text += `\n--- Video streams (.mp4) ---\n`;
      if (videoCollection.mp4VideoLinks.size > 0) {
        videoCollection.mp4VideoLinks.forEach(link => text += `${link}\n`);
      } else { text += `Not found\n`; }

      text += `\n--- Audio streams (.mp4 / audio) ---\n`;
      if (videoCollection.mp4AudioLinks.size > 0) {
        videoCollection.mp4AudioLinks.forEach(link => text += `${link}\n`);
      } else { text += `Not found\n`; }

      return text;
    }

    // Function to generate and update the counters on the button
    function updateSaveButton() {
      let btn = document.getElementById('kinescope-save-btn');
      
      // If the button does not exist on the page yet, create it
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'kinescope-save-btn';
        btn.style.cssText = 'position:fixed; top:20px; left:20px; z-index:999999; padding:10px 15px; background:#ff007f; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.2); font-family: sans-serif; transition: background 0.2s;';
        
        btn.addEventListener('click', () => {
          if (!videoCollection.meta) {
            alert('Metadata has not loaded yet!');
            return;
          }
          
          chrome.runtime.sendMessage({
            type: "SAVE_MEDIA_FILES",
            payload: {
              folderName: videoCollection.meta.name || "Kinescope_Video",
              logContent: buildLogText(),
              jsonContent: videoCollection.meta
            }
          });
          
          const oldText = btn.innerText;
          btn.innerText = '✅ Saved!';
          btn.style.background = '#4caf50';
          
          setTimeout(() => {
            btn.style.background = '#ff007f';
            updateSaveButton(); // Return the current text with counters
          }, 2000);
        });

        document.body.appendChild(btn);
      }

      // If the button is not currently showing the successful save status, update the text
      if (btn.innerText !== '✅ Saved!') {
        const vm3u8Count = videoCollection.m3u8VideoLinks.size;
        const am3u8Count = videoCollection.m3u8AudioLinks.size;
        const vmp4Count = videoCollection.mp4VideoLinks.size;
        const amp4Count = videoCollection.mp4AudioLinks.size;
        btn.innerText = `💾 Save (m3u8 V: ${vm3u8Count}, m3u8 A: ${am3u8Count}, mp4 V: ${vmp4Count}, mp4 A: ${amp4Count})`;
      }
    }
	
	  function removeSaveButton() {
		  let btn = document.getElementById('kinescope-save-btn');
		  if (btn) {
			  btn.remove(); // Completely remove the button element from the page's DOM tree
		  }
	  }
	
	  // Function for nicely formatting the collected data in the console
    function printMediaReport() {
      console.group("%c📊 [Kinescope Media Collector] ОТЧЕТ ПО ВИДЕО", "color: #fff; background: #222; padding: 5px 10px; font-weight: bold; font-size: 14px; border-radius: 4px;");
      
      if (videoCollection.meta) {
        console.log(`%c🎬 Name: %c ${videoCollection.meta.name || "Not specified"}`, "font-weight: bold; color: #4caf50;", "color: inherit;");
        console.log(`%c📄 M3U8 Manifest: %c ${videoCollection.meta.contentUrl || "Not available"}`, "font-weight: bold; color: #00bcd4;", "color: inherit;");
        console.log(`%c⏳ Duration: %c ${videoCollection.meta.duration || "No data"}`, "font-weight: bold;", "color: inherit;");
		    updateSaveButton(); // Create or update the button whenever the data changes
      } else {
        console.log("%c⏳ Metadata JSON-LD is still loading...", "color: #777; italic: true;");
      }

      console.group("%c🎥 Video m3u8", "color: #ff007f; font-weight: bold;");
      if (videoCollection.m3u8VideoLinks.size > 0) {
        videoCollection.m3u8VideoLinks.forEach(link => console.log(link));
      } else {
        console.log("Not found yet (play the video or change the quality)");
      }
      console.groupEnd();

      console.group("%c🎵 Audio m3u8", "color: #ff9800; font-weight: bold;");
      if (videoCollection.m3u8AudioLinks.size > 0) {
        videoCollection.m3u8AudioLinks.forEach(link => console.log(link));
      } else {
        console.log("Not found yet");
      }
      console.groupEnd();

      console.group("%c🎥 Video streams (.mp4)", "color: #ff007f; font-weight: bold;");
      if (videoCollection.mp4VideoLinks.size > 0) {
        videoCollection.mp4VideoLinks.forEach(link => console.log(link));
      } else {
        console.log("Not found yet (play the video or change the quality)");
      }
      console.groupEnd();

      console.group("%c🎵 Audio streams (.mp4 / audio)", "color: #ff9800; font-weight: bold;");
      if (videoCollection.mp4AudioLinks.size > 0) {
        videoCollection.mp4AudioLinks.forEach(link => console.log(link));
      } else {
        console.log("Not found yet");
      }
      console.groupEnd();

      if (videoCollection.meta) {
        console.groupCollapsed("%c⚙️ Full JSON-LD object", "color: #9e9e9e;");
        console.log(videoCollection.meta);
        console.groupEnd();
      }

      console.groupEnd();
    }
	
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "LOG_TO_MAIN_CONSOLE") {
        
        if (message.subType === "KINESCOPE_FOUND") {
          if (videoCollection.meta && videoCollection.meta.name !== message.payload) {
            videoCollection.m3u8VideoLinks = new Set();
            videoCollection.m3u8AudioLinks = new Set();
            videoCollection.mp4VideoLinks = new Set();
            videoCollection.mp4AudioLinks = new Set();
            removeSaveButton(); // Remove the old button with incorrect counters
          }			  
          videoCollection.meta = message.payload;
        }
          
        if (message.subType === "M3U8_LINK_FOUND") {
          const { url, mediaType } = message.payload;
          console.log(`M3U8_LINK_FOUND: ${url}, ${mediaType}`);
          if (mediaType === 'video') {
            videoCollection.m3u8VideoLinks.add(url);
          } else if (mediaType === 'audio') {
            videoCollection.m3u8AudioLinks.add(url);
          }
        }

        if (message.subType === "MP4_LINK_FOUND") {
          const { url, mediaType } = message.payload;
          console.log(`MP4_LINK_FOUND: ${url}, ${mediaType}`);
          if (mediaType === 'video') {
            videoCollection.mp4VideoLinks.add(url);
          } else if (mediaType === 'audio') {
            videoCollection.mp4AudioLinks.add(url);
          }
        }

        // Log debounce: wait for 200ms of inactivity in requests before outputting the report,
        // to avoid spamming when audio and video are loaded simultaneously
        clearTimeout(logTimeout);
        logTimeout = setTimeout(printMediaReport, 200);

      }
    });
  }
})();