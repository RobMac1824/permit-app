const form = document.getElementById("permitForm");
const previewBody = document.getElementById("previewBody");
const statusBadge = document.getElementById("statusBadge");
const downloadBtn = document.getElementById("downloadBtn");
const submitBtn = document.getElementById("submitBtn");
const locationInput = document.getElementById("location");
const coordinatesInput = document.getElementById("coordinates");
const mapFrame = document.getElementById("mapFrame");
const mapStatus = document.getElementById("mapStatus");

const DEFAULT_LAT = 40.7128;
const DEFAULT_LON = -74.006;
let geocodeTimer;

const buildPreview = (data) => {
  return `
    <h3>${data.fullName || "Applicant"} — UAS Permit Request</h3>
    <p><strong>Contact</strong>: ${data.email || ""} | ${data.phone || ""}</p>
    <p><strong>Organization</strong>: ${data.organization || "Not specified"}</p>
    <hr />
    <p><strong>Flight date</strong>: ${data.date || ""}</p>
    <p><strong>Time window</strong>: ${data.time || ""}</p>
    <p><strong>Location</strong>: ${data.location || ""}</p>
    <p><strong>Coordinates</strong>: ${data.coordinates || "Not provided"}</p>
    <p><strong>Purpose</strong>: ${data.purpose || ""}</p>
    <hr />
    <p><strong>Pilot</strong>: ${data.pilot || ""}</p>
    <p><strong>Insurance</strong>: ${data.insurance || ""}</p>
    <p><strong>Equipment</strong>: ${data.equipment || ""}</p>
    <p><strong>Risk mitigation</strong>: ${data.mitigation || ""}</p>
    <p><strong>Attachments</strong>: ${data.attachments || "None listed"}</p>
  `;
};

const collectFormData = () => {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
};

const updateMap = (lat, lon, statusText = "Updated") => {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return;
  }

  const delta = 0.01;
  const left = lonNum - delta;
  const right = lonNum + delta;
  const top = latNum + delta;
  const bottom = latNum - delta;
  mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latNum}%2C${lonNum}`;
  mapStatus.textContent = statusText;
};

const fetchCoordinates = async (address) => {
  if (!address) {
    mapStatus.textContent = "Waiting for address";
    return;
  }

  mapStatus.textContent = "Looking up coordinates...";
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );
    if (!response.ok) {
      throw new Error("Geocoding failed");
    }
    const results = await response.json();
    if (!results.length) {
      mapStatus.textContent = "No match found";
      return;
    }
    const { lat, lon } = results[0];
    coordinatesInput.value = `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
    updateMap(lat, lon, "Location found");
    updatePreview();
  } catch (error) {
    mapStatus.textContent = "Lookup unavailable";
  }
};

const updatePreview = () => {
  const data = collectFormData();
  const hasRequired =
    data.fullName &&
    data.email &&
    data.phone &&
    data.date &&
    data.time &&
    data.location &&
    data.purpose &&
    data.pilot &&
    data.insurance &&
    data.equipment &&
    data.mitigation;

  previewBody.innerHTML = buildPreview(data);
  downloadBtn.disabled = !hasRequired;
  submitBtn.disabled = !hasRequired;
  statusBadge.textContent = hasRequired ? "Draft" : "Incomplete";
  statusBadge.classList.toggle("ready", false);
};

form.addEventListener("input", updatePreview);
locationInput.addEventListener("input", () => {
  clearTimeout(geocodeTimer);
  geocodeTimer = setTimeout(() => {
    fetchCoordinates(locationInput.value.trim());
  }, 700);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updatePreview();
  statusBadge.textContent = "Draft updated";
});

downloadBtn.addEventListener("click", () => {
  const data = collectFormData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `permit-request-${data.fullName || "applicant"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
});

submitBtn.addEventListener("click", () => {
  statusBadge.textContent = "Ready to submit";
  statusBadge.classList.add("ready");
  submitBtn.textContent = "Ready for NYPD submission";
});

const trimTextareas = () => {
  form.querySelectorAll("textarea").forEach((textarea) => {
    textarea.value = textarea.value.trim();
  });
};

trimTextareas();
updatePreview();
updateMap(DEFAULT_LAT, DEFAULT_LON, "Ready");
fetchCoordinates(locationInput.value.trim());
