const works = document.querySelector("[data-works]");
const viewer = document.querySelector("[data-viewer]");
const viewerArt = document.querySelector("[data-viewer-art]");
const viewerLabel = document.querySelector("[data-viewer-label]");
const viewerTitle = document.querySelector("[data-viewer-title]");
const viewerDescription = document.querySelector("[data-viewer-description]");
const viewerDetails = document.querySelector("[data-viewer-details]");
const closeButton = document.querySelector("[data-viewer-close]");

const dataset = window.KLAUSBLOCKS_HEN;
let activeToken = null;

renderWorks(dataset.tokens);

function renderWorks(tokens) {
  const fragment = document.createDocumentFragment();

  tokens.forEach((token) => {
    const button = document.createElement("button");
    const artWrap = document.createElement("div");
    const image = createImage(token);
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

    label.textContent = `OBJKT #${token.henObjktId}`;
    title.textContent = token.name;
    meta.textContent = formatSupply(token);
    artWrap.append(image);
    button.append(label, artWrap, title, meta);
    button.addEventListener("click", () => openViewer(token));
    fragment.append(button);
  });

  works.replaceChildren(fragment);
}

function openViewer(token) {
  activeToken = token;
  viewerArt.replaceChildren(createImage(token));
  viewerLabel.textContent = `OBJKT #${token.henObjktId} / hic et nunc`;
  viewerTitle.textContent = token.name;
  viewerDescription.textContent = token.description;
  viewerDetails.replaceChildren(
    createDetail("Minted", formatDate(token.mintedAt)),
    createDetail("Supply", formatSupply(token)),
    createDetail("Burned", String(token.burnedSupply ?? 0)),
    createDetail("Mime", token.formats?.[0]?.mimeType ?? "image/png"),
    createDetail("Token contract", token.tokenContract),
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

function createImage(token) {
  const image = document.createElement("img");
  image.className = "piece-art";
  image.src = token.localArtifact;
  image.alt = token.name;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
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
  links.append(
    createLink("tzkt", token.tzktUrl),
    createLink("metadata", resolveIpfs(token.metadataUri)),
    createLink("artifact", resolveIpfs(token.artifactUri)),
  );
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

function formatSupply(token) {
  return `${token.currentSupply} of ${token.mintedSupply}`;
}

function resolveIpfs(uri) {
  if (!uri) {
    return "#";
  }

  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
  }

  return uri;
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
