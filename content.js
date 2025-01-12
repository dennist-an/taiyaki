chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "warn_user") {
    // Add a warning banner
    const warningBanner = document.createElement("div");
    warningBanner.style = `
      position: fixed; 
      top: 0; 
      left: 0; 
      width: 100%; 
      background: white; 
      color: black; 
      text-align: center; 
      z-index: 9999;  
      padding: 10px; 
      font-size: 16px;
      border-bottom: 2px solid black; /* Border only at the bottom */
      display: flex; 
      align-items: center; 
      justify-content: center; /* Centers content horizontally */
      gap: 10px; /* Adds spacing between image and text */
    `;
    
    // Create Image Element
    const bannerImage = document.createElement("img");
    bannerImage.src = chrome.runtime.getURL("img/dead48.png"); // Replace with your image URL
    bannerImage.alt = "Warning Icon"; 
    bannerImage.style = "width: 48px; height: 48px;"; // Set image size
    
    // Create Text Element
    const bannerText = document.createElement("span");
    bannerText.textContent = message.message;
    
    // Append Image & Text to Banner
    warningBanner.appendChild(bannerImage);
    warningBanner.appendChild(bannerText);
    
    // Add Banner to Page
    document.body.prepend(warningBanner);
    

    document.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }, true);
    
    document.addEventListener("keydown", function(event) {
      if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          return false;
      }
    }, true);

    document.addEventListener("contextmenu", function(event) {
      event.preventDefault();  // Prevents the default right-click menu
      event.stopPropagation(); // Stops the event from bubbling up
      console.log("Right-click intercepted!");
      return false;
    }, true); // Capture phase ensures early interception
  }
});
