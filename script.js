const form = document.getElementById("permitForm");
const previewBody = document.getElementById("previewBody");
const statusBadge = document.getElementById("statusBadge");
const downloadBtn = document.getElementById("downloadBtn");
const submitBtn = document.getElementById("submitBtn");
const locationInput = document.getElementById("location");
const coordinatesInput = document.getElementById("coordinates");
const mapStatus = document.getElementById("mapStatus");

let map;
let marker;
const defaultCoords = { lat: 40.7813, lon: -73.9735 };

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

const initMap = () => {
  if (map || !window.L) {
    return;
  }

  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: false,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);

  marker = L.marker([defaultCoords.lat, defaultCoords.lon]).addTo(map);
  map.setView([defaultCoords.lat, defaultCoords.lon], 14);
};

const setCoordinates = (lat, lon) => {
  coordinatesInput.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  if (marker) {
    marker.setLatLng([lat, lon]);
  }
  if (map) {
    map.setView([lat, lon], 15);
  }
};

const geocodeAddress = async (address) => {
  const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    address
  )}`;
  const response = await fetch(endpoint, {
    headers: {
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error("Geocoding failed.");
  }

  const results = await response.json();
  if (!results.length) {
    throw new Error("No results.");
  }

  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
};

const updateMapFromAddress = async () => {
  const address = locationInput.value.trim();
  if (!address) {
    mapStatus.textContent = "Enter an address to update the map.";
    return;
  }

  mapStatus.textContent = "Looking up address…";

  try {
    const result = await geocodeAddress(address);
    setCoordinates(result.lat, result.lon);
    mapStatus.textContent = `Geocoded to: ${result.displayName}`;
    updatePreview();
  } catch (error) {
    mapStatus.textContent = "Unable to find that address. Please refine it.";
  }
};

const debounce = (callback, delay = 600) => {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delay);
  };
};

const debouncedMapUpdate = debounce(updateMapFromAddress, 700);

locationInput.addEventListener("input", debouncedMapUpdate);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updatePreview();
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

initMap();
setCoordinates(defaultCoords.lat, defaultCoords.lon);
updateMapFromAddress();
updatePreview();
