const form = document.getElementById("permitForm");
const previewBody = document.getElementById("previewBody");
const statusBadge = document.getElementById("statusBadge");
const downloadBtn = document.getElementById("downloadBtn");
const submitBtn = document.getElementById("submitBtn");

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

updatePreview();
