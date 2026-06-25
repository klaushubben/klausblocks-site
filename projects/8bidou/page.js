const works = document.querySelector("[data-works]");
const viewer = document.querySelector("[data-viewer]");
const viewerArt = document.querySelector("[data-viewer-art]");
const viewerLabel = document.querySelector("[data-viewer-label]");
const viewerTitle = document.querySelector("[data-viewer-title]");
const viewerDescription = document.querySelector("[data-viewer-description]");
const viewerDetails = document.querySelector("[data-viewer-details]");
const closeButton = document.querySelector("[data-viewer-close]");

const dataset = window.KLAUSBLOCKS_8BIDOU;
let activeToken = null;

renderWorks(dataset.tokens);

function renderWorks(tokens) {
  const fragment = document.createDocumentFragment();

  tokens.forEach((token) => {
    const button = document.createElement("button");
    const artWrap = document.createElement("div");
    const title = document.createElement("h2");
    const label = document.createElement("p");
    const meta = document.createElement("p");

    button.className = "piece-button";
    button.type = "button";
    button.setAttribute("aria-label", `Open ${token.name}`);
    label.className = "piece-label";
    artWrap.className = "piece-art-wrap";
    title.className = "piece-title";
    meta.className = "piece-meta";

    label.textContent = token.shikakuLabel;
    title.textContent = token.name;
    meta.textContent = token.platformLabel;
    artWrap.append(createPixelArt(token));
    button.append(label, artWrap, title, meta);
    button.addEventListener("click", () => openViewer(token));
    fragment.append(button);
  });

  works.replaceChildren(fragment);
}

function openViewer(token) {
  activeToken = token;
  viewerArt.replaceChildren(createPixelArt(token));
  viewerLabel.textContent = `${token.shikakuLabel} / ${token.platformLabel}`;
  viewerTitle.textContent = token.name;
  viewerDescription.textContent = token.description;
  viewerDetails.replaceChildren(
    createDetail("Minted", formatDate(token.mintedAt)),
    createDetail("Dimensions", `${token.dimensions.width} x ${token.dimensions.height}`),
    createDetail("Supply", String(token.supply)),
    createDetail("Encoding", token.pixelEncoding),
    createDetail("Payload", `${token.pixels.length} pixels / ${token.rgb.length} hex chars`),
    createDetail("Contract", token.contract),
    createLinks(token),
  );
  viewer.classList.add("is-open");
  document.body.style.overflow = "hidden";
  closeButton.focus();
}

function closeViewer() {
  activeToken = null;
  viewer.classList.remove("is-open");
  viewerArt.replaceChildren();
  document.body.style.overflow = "";
}

function createPixelArt(token) {
  const art = document.createElement("div");
  art.className = "pixel-art";
  art.style.setProperty("--pixel-columns", token.dimensions.width);
  art.style.setProperty("--pixel-rows", token.dimensions.height);
  art.setAttribute("role", "img");
  art.setAttribute("aria-label", `${token.name}, ${token.dimensions.width} by ${token.dimensions.height} pixel artwork`);

  token.pixels.forEach((color) => {
    const pixel = document.createElement("span");
    pixel.className = "pixel";
    pixel.style.setProperty("--pixel-color", color);
    art.append(pixel);
  });

  return art;
}

function createDetail(label, value) {
  const row = document.createElement("div");
  const labelElement = document.createElement("p");
  const valueElement = document.createElement("p");

  row.className = "detail-row";
  labelElement.className = "detail-label";
  valueElement.className = "detail-value";
  labelElement.textContent = label;
  valueElement.textContent = value || "n/a";

  row.append(labelElement, valueElement);
  return row;
}

function createLinks(token) {
  const row = document.createElement("div");
  const links = document.createElement("div");

  row.className = "detail-row";
  links.className = "detail-links";
  links.append(createLink("tzkt", token.tzktUrl));
  if (token.objktUrl) {
    links.append(createLink("objkt", token.objktUrl));
  }
  row.append(links);
  return row;
}

function createLink(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  return link;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

closeButton.addEventListener("click", closeViewer);

viewer.addEventListener("click", (event) => {
  if (event.target === viewer) {
    closeViewer();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeToken) {
    closeViewer();
  }
});
