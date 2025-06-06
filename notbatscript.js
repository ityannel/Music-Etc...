async function sendContext() {
  const input = document.getElementById("input").value;
  const resBox = document.getElementById("response");

  resBox.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>Sex ing...</span>
    </div>`;
  resBox.style.borderColor = "var(--info-color)";

  try {
    const res = await fetch("http://localhost:3000/parse-music-context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description: input }),
    });

    if (!res.ok) {
      let errorMsg = `Server error: ${res.status} ${res.statusText}`;
      try {
        const errorData = await res.json();
        errorMsg += errorData.message ? ` - ${errorData.message}` : (errorData.error ? ` - ${errorData.error}` : '');
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const json = await res.json();
    const musicTracks = json.tracks;

    resBox.innerHTML = "";
    resBox.style.borderColor = "var(--primary-color)";

    if (musicTracks && Array.isArray(musicTracks) && musicTracks.length > 0) {
      if (musicTracks.length === 1 && musicTracks[0] === "???") {
        resBox.innerHTML = `
          <div class="empty-state">
            <span>Could not retrieve specific tracks. The default suggestion is often a 'lo-fi chill' vibe.</span>
          </div>`;
        resBox.style.borderColor = "var(--muted-text)";
      } else {
        musicTracks.forEach((track, i) => {
          const itemDiv = document.createElement("div");
          itemDiv.classList.add("response-item");

          const trackNumberSpan = document.createElement("span");
          trackNumberSpan.classList.add("track-number");
          trackNumberSpan.textContent = `${i + 1}.`;

          const trackInfoSpan = document.createElement("span");
          trackInfoSpan.classList.add("track-info");
          trackInfoSpan.textContent = ` ${track.artist || 'Unknown Artist'} - ${track.title || 'Unknown Title'}`;

          itemDiv.appendChild(trackNumberSpan);
          itemDiv.appendChild(trackInfoSpan);

          setTimeout(() => {
            resBox.appendChild(itemDiv);
            requestAnimationFrame(() => {
              itemDiv.classList.add("visible");
            });
          }, 120 * i + Math.random() * 30);
        });
      }
    } else {
      resBox.innerHTML = `
        <div class="empty-state">
          <span>No music tracks were found for your request. Try describing something different!</span>
        </div>`;
      resBox.style.borderColor = "var(--muted-text)";
    }

  } catch (err) {
    resBox.innerHTML = `
      <div class="error-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" style="min-width:20px;">
          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
        </svg>
        <span>ERROR: ${err.message}</span>
      </div>`;
    resBox.style.borderColor = "var(--error-color)";
  }
}