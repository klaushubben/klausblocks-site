const grid = document.querySelector("[data-token-grid]");
const count = document.querySelector("[data-token-count]");
const viewer = document.querySelector("[data-viewer]");
const viewerMedia = document.querySelector("[data-viewer-media]");
const viewerImage = document.querySelector("[data-viewer-image]");
const viewerFrame = document.querySelector("[data-viewer-frame]");
const viewerTitle = document.querySelector("[data-viewer-title]");
const detailList = document.querySelector("[data-detail-list]");
const closeButton = document.querySelector("[data-viewer-close]");
const page = document.querySelector("[data-project-page]");

const tokenDataUrl = page.dataset.tokens;
const thumbnailsUrl = page.dataset.thumbnails;
const rendererBase = page.dataset.rendererBase;

let activeToken = null;

init();

async function init() {
  const [tokensPayload, thumbnailsPayload] = window.KLAUSBLOCKS_PROJECT
    ? [window.KLAUSBLOCKS_PROJECT.tokens, window.KLAUSBLOCKS_PROJECT.thumbnails]
    : await Promise.all([loadJson(tokenDataUrl), loadJson(thumbnailsUrl)]);
  const thumbnailById = new Map(thumbnailsPayload.thumbnails.map((thumbnail) => [thumbnail.id, thumbnail]));

  count.textContent = `${tokensPayload.tokens.length} iterations`;
  renderGrid(tokensPayload.tokens, thumbnailById);
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return response.json();
}

function renderGrid(tokens, thumbnailById) {
  const fragment = document.createDocumentFragment();

  tokens.forEach((token) => {
    const thumbnail = thumbnailById.get(token.id);
    const button = document.createElement("button");
    const image = document.createElement("img");

    button.className = "token-button";
    button.type = "button";
    button.dataset.iteration = `#${token.iteration}`;
    button.setAttribute("aria-label", `Open ${token.name}`);

    image.src = thumbnail?.localPath ?? token.thumbnailUri;
    image.alt = token.name;
    image.loading = "lazy";
    image.decoding = "async";

    button.append(image);
    button.addEventListener("click", () => {
      openViewer(token, thumbnail);
    });
    fragment.append(button);
  });

  grid.replaceChildren(fragment);
}

function openViewer(token, thumbnail) {
  activeToken = token;
  const rendererUrl = getRendererUrl(token);

  viewerImage.src = thumbnail?.localPath ?? token.thumbnailUri;
  viewerImage.alt = token.name;
  if (viewerFrame) {
    viewerFrame.src = rendererUrl || "about:blank";
  }
  viewerMedia.classList.toggle("is-rendering", Boolean(rendererUrl));
  viewerTitle.textContent = token.name;
  detailList.replaceChildren(
    createDetail("Iteration", String(token.iteration)),
    createDetail("Hash", token.hash),
    createDetail("Features", formatFeatures(token.features)),
    createDetail("Owner", formatUser(token.owner)),
    createDetail("Minter", formatUser(token.minter)),
    createLinks(token),
  );
  viewer.classList.add("is-open");
  document.body.style.overflow = "hidden";
  closeButton.focus();
}

function closeViewer() {
  activeToken = null;
  viewer.classList.remove("is-open");
  if (viewerFrame) {
    viewerFrame.src = "about:blank";
  }
  viewerMedia.classList.remove("is-rendering");
  document.body.style.overflow = "";
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
  const rendererUrl = getRendererUrl(token);

  row.className = "detail-row";
  links.className = "detail-links";
  links.append(createLink("fxhash", token.fxhashUrl), createLink("objkt", token.objktUrl), createLink("artifact", resolveIpfs(token.artifactUri)));
  if (rendererUrl) {
    links.prepend(createLink("live", rendererUrl));
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

function formatFeatures(features = []) {
  if (!features.length) {
    return "n/a";
  }

  return features.map((feature) => `${feature.name}: ${feature.value}`).join(" / ");
}

function formatUser(user) {
  if (!user) {
    return "n/a";
  }

  return user.name ? `${user.name} (${user.address})` : user.address;
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

function getRendererUrl(token) {
  if (!rendererBase) {
    return "";
  }

  return `${rendererBase}${String(token.iteration).padStart(3, "0")}.html`;
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
