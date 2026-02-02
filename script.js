const form = document.getElementById("permitForm");
const previewBody = document.getElementById("previewBody");
const statusBadge = document.getElementById("statusBadge");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const downloadDocxBtn = document.getElementById("downloadDocxBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const submitBtn = document.getElementById("submitBtn");
const packageStatus = document.getElementById("packageStatus");
const previewPanel = document.getElementById("requestPreview");
const locationInput = document.getElementById("location");
const coordinatesInput = document.getElementById("coordinates");
const mapStatus = document.getElementById("mapStatus");

let map;
let marker;
const defaultCoords = { lat: 40.7813, lon: -73.9735 };
let packageReady = false;

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

const buildPackageLines = (data) => [
  "UAS Permit Request Package",
  "",
  `Applicant: ${data.fullName || ""}`,
  `Email: ${data.email || ""}`,
  `Phone: ${data.phone || ""}`,
  `Organization: ${data.organization || "Not specified"}`,
  "",
  `Flight date: ${data.date || ""}`,
  `Time window: ${data.time || ""}`,
  `Location: ${data.location || ""}`,
  `Coordinates: ${data.coordinates || "Not provided"}`,
  `Purpose: ${data.purpose || ""}`,
  "",
  `Pilot: ${data.pilot || ""}`,
  `Insurance: ${data.insurance || ""}`,
  `Equipment: ${data.equipment || ""}`,
  `Risk mitigation: ${data.mitigation || ""}`,
  `Attachments: ${data.attachments || "None listed"}`,
];

const buildFileName = (data, extension) => {
  const name = (data.fullName || "applicant")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return `permit-request-${name || "applicant"}.${extension}`;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const updatePackageStatus = (hasRequired) => {
  if (!hasRequired) {
    packageStatus.textContent =
      "Complete all required fields to enable package downloads.";
    return;
  }
  packageStatus.textContent = packageReady
    ? "Package ready. Choose PDF or DOCX to download."
    : "Click Generate request package to enable downloads.";
};

const updateStatusBadge = (hasRequired) => {
  if (!hasRequired) {
    statusBadge.textContent = "Incomplete";
    statusBadge.classList.remove("ready", "prepared");
    return;
  }

  if (packageReady) {
    statusBadge.textContent = "Package ready";
    statusBadge.classList.add("prepared");
    statusBadge.classList.remove("ready");
    return;
  }

  statusBadge.textContent = "Draft";
  statusBadge.classList.remove("ready", "prepared");
};

const setDownloadState = (enabled) => {
  downloadPdfBtn.disabled = !enabled;
  downloadDocxBtn.disabled = !enabled;
  downloadJsonBtn.disabled = !enabled;
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
  submitBtn.disabled = !hasRequired;
  setDownloadState(hasRequired && packageReady);
  updateStatusBadge(hasRequired);
  updatePackageStatus(hasRequired);
};

form.addEventListener("input", () => {
  packageReady = false;
  updatePreview();
});

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

  if (!hasRequired) {
    updatePreview();
    return;
  }

  packageReady = true;
  updatePreview();
  if (previewPanel) {
    previewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

downloadJsonBtn.addEventListener("click", () => {
  const data = collectFormData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, buildFileName(data, "json"));
});

downloadPdfBtn.addEventListener("click", () => {
  const data = collectFormData();
  const lines = buildPackageLines(data);
  if (!window.jspdf || !window.jspdf.jsPDF) {
    packageStatus.textContent =
      "PDF generation is unavailable right now. Please refresh and try again.";
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const maxWidth = 520;
  let cursorY = 64;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(lines[0], margin, cursorY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  cursorY += 24;

  lines.slice(2).forEach((line) => {
    if (!line) {
      cursorY += 12;
      return;
    }
    const wrapped = doc.splitTextToSize(line, maxWidth);
    doc.text(wrapped, margin, cursorY);
    cursorY += wrapped.length * 14;
    if (cursorY > 720) {
      doc.addPage();
      cursorY = 64;
    }
  });

  doc.save(buildFileName(data, "pdf"));
});

downloadDocxBtn.addEventListener("click", async () => {
  const data = collectFormData();
  if (!window.docx) {
    packageStatus.textContent =
      "DOCX generation is unavailable right now. Please refresh and try again.";
    return;
  }

  const { Document, Packer, Paragraph, TextRun } = window.docx;
  const doc = new Document({
    sections: [
      {
        children: buildPackageLines(data).map((line, index) =>
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: index === 0,
              }),
            ],
          })
        ),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(
    blob,
    buildFileName(data, "docx")
  );
});

submitBtn.addEventListener("click", () => {
  statusBadge.textContent = "Ready to submit";
  statusBadge.classList.add("ready");
  statusBadge.classList.remove("prepared");
  submitBtn.textContent = "Ready for NYPD submission";
});

initMap();
setCoordinates(defaultCoords.lat, defaultCoords.lon);
updateMapFromAddress();
updatePreview();
