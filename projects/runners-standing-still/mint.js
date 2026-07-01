const config = window.RUNNER_MINT_CONFIG || {};

const state = {
  rendererScript: "",
  sortMode: "recent",
  samples: [],
  sampleScanKey: "",
  samplesScanning: false,
  totalSupply: Number(config.initialMintedCount || 0),
  saleActive: false,
  mintPriceWei: config.mintPriceWei || "0",
  account: "",
  minting: false,
  activeOwner: "",
  activeTokenId: "",
  collectorTokens: [],
  collectorScanKey: "",
  collectorScanning: false,
};

const runnerContract = {
  reads: {
    totalSupply: { selector: "0x18160ddd", returns: "uint256" },
    saleActive: { selector: "0x68428a1b", returns: "bool" },
    mintPrice: { selector: "0x6817c76c", returns: "uint256" },
    ownerOf: { selector: "0x6352211e", returns: "address", args: ["uint256"] },
    tokenSeed: { selector: "0x5f516836", returns: "bytes32", args: ["uint256"] },
    tokenMinter: { selector: "0x7c57d947", returns: "address", args: ["uint256"] },
    tokenURI: { selector: "0xc87b56dd", returns: "string", args: ["uint256"] },
  },
  writes: {
    mint: { selector: "0x1249c58b" },
  },
  events: {
    transfer: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  },
};

const els = {
  randomPreview: document.querySelector("[data-random-preview]"),
  previewHash: document.querySelector("[data-preview-hash]"),
  previewShell: document.querySelector("[data-preview-shell]"),
  previewFrame: document.querySelector("[data-preview-frame]"),
  fullscreenOpen: document.querySelector("[data-fullscreen-open]"),
  fullscreenClose: document.querySelector("[data-fullscreen-close]"),
  previewOverlay: document.querySelector("[data-preview-overlay]"),
  walletToggle: document.querySelector("[data-wallet-toggle]"),
  mintRandom: document.querySelector("[data-mint-random]"),
  mintedCount: document.querySelector("[data-minted-count]"),
  mintedGrid: document.querySelector("[data-minted-grid]"),
  sortButtons: document.querySelectorAll("[data-sort]"),
  traits: document.querySelectorAll("[data-trait]"),
  liveSource: document.querySelector("[data-live-source]"),
  liveBlock: document.querySelector("[data-live-block]"),
  liveEpoch: document.querySelector("[data-live-epoch]"),
  tokenOwner: document.querySelector("[data-token-owner]"),
  tokenOwnerValue: document.querySelector("[data-token-owner-value]"),
  mintModal: document.querySelector("[data-mint-modal]"),
  mintModalClose: document.querySelector("[data-mint-modal-close]"),
  mintModalKicker: document.querySelector("[data-mint-modal-kicker]"),
  mintModalTitle: document.querySelector("[data-mint-modal-title]"),
  mintModalStatus: document.querySelector("[data-mint-modal-status]"),
  mintModalTx: document.querySelector("[data-mint-modal-tx]"),
  mintModalToken: document.querySelector("[data-mint-modal-token]"),
  mintModalOwner: document.querySelector("[data-mint-modal-owner]"),
  mintModalHash: document.querySelector("[data-mint-modal-hash]"),
  mintModalPreviewWrap: document.querySelector("[data-mint-modal-preview-wrap]"),
  mintModalPreview: document.querySelector("[data-mint-modal-preview]"),
};

const featureKeys = {
  "Source Texture": "src",
  "Palette Mode": "pm",
  Decompose: "dec",
  "Dither Pattern": "dit",
  "Decompose Block Size": "dbs",
  "Composite Levels": "cl",
  "B/W Temperature": "bwt",
};

const featureLabels = {
  pm: {
    div: "diverging",
    split: "split complement",
  },
  bg: {
    black: "black",
    dark: "palette dark",
    light: "palette light",
  },
  src: {
    g4: "gradient-4pt",
    rs: "rich stripes",
    gs: "grayscale",
  },
  dec: {
    mask: "mask",
    "mask-dither": "mask dither",
    "mask-levels": "mask levels",
    "ordered-levels": "ordered levels",
  },
  dit: {
    b4: "bayer-4",
    b8: "bayer-8",
    line: "line",
  },
};

init();

async function init() {
  wireEvents();
  updateWalletUi();
  await loadRendererScript();
  renderMintedCount();
  await refreshContractState();
  renderRandomPreview();
  await ensureMintedTokens();
  renderSampleGrid();
}

function wireEvents() {
  els.randomPreview.addEventListener("click", renderRandomPreview);
  els.walletToggle.addEventListener("click", toggleWallet);
  els.walletToggle.addEventListener("mouseenter", showDisconnectLabel);
  els.walletToggle.addEventListener("mouseleave", updateWalletUi);
  els.walletToggle.addEventListener("focus", showDisconnectLabel);
  els.walletToggle.addEventListener("blur", updateWalletUi);
  els.mintRandom.addEventListener("click", mintRandomIteration);
  els.mintModalClose.addEventListener("click", closeMintModal);
  els.mintModal.addEventListener("click", (event) => {
    if (event.target === els.mintModal) closeMintModal();
  });
  els.fullscreenOpen.addEventListener("click", openFullscreenPreview);
  els.fullscreenClose.addEventListener("click", closeFullscreenPreview);
  els.previewOverlay.addEventListener("click", (event) => {
    if (event.target === els.previewOverlay) closeFullscreenPreview();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.previewOverlay.hidden) closeFullscreenPreview();
  });
  window.addEventListener("message", handleRendererMessage);

  els.sortButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      state.sortMode = button.dataset.sort;
      renderSampleGrid();
      if (state.sortMode === "collector") {
        await ensureCollectorTokens();
      } else {
        await ensureMintedTokens();
      }
    });
  });

  window.ethereum?.on?.("accountsChanged", handleAccountsChanged);
  window.ethereum?.on?.("chainChanged", () => {
    updateWalletUi();
  });
}

function openFullscreenPreview() {
  if (!els.previewOverlay.hidden) return;
  els.previewOverlay.hidden = false;
  document.body.classList.add("has-preview-overlay");
  els.previewShell.classList.add("is-fullscreen");
  requestAnimationFrame(() => {
    els.previewOverlay.classList.add("is-open");
  });
  els.fullscreenClose.focus({ preventScroll: true });
}

function closeFullscreenPreview() {
  if (els.previewOverlay.hidden) return;
  els.previewOverlay.classList.remove("is-open");
  document.body.classList.remove("has-preview-overlay");
  els.previewShell.classList.remove("is-fullscreen");
  els.previewOverlay.hidden = true;
  els.fullscreenOpen.focus({ preventScroll: true });
}

async function loadRendererScript() {
  const response = await fetch("./sketch.runners-standing-still.min.js", { cache: "no-store" });
  if (!response.ok) {
    console.warn("Preview renderer not found.");
    return;
  }
  state.rendererScript = await response.text();
}

function renderRandomPreview() {
  renderHash(randomHash(), "preview");
}

async function toggleWallet() {
  if (state.account) {
    state.account = "";
    resetCollectorScan();
    updateWalletUi();
    renderSampleGrid();
    return;
  }

  if (!window.ethereum) {
    alert("No wallet detected.");
    return;
  }

  try {
    await ensureConfiguredChain();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    state.account = accounts[0] || "";
    resetCollectorScan();
    updateWalletUi();
    renderSampleGrid();
    if (state.sortMode === "collector") {
      await ensureCollectorTokens();
    }
  } catch (error) {
    console.warn("Wallet connection failed", error);
  }
}

function handleAccountsChanged(accounts) {
  state.account = accounts[0] || "";
  resetCollectorScan();
  updateWalletUi();
  renderSampleGrid();
  if (state.sortMode === "collector") {
    ensureCollectorTokens();
  }
}

function updateWalletUi() {
  const connected = Boolean(state.account);
  els.walletToggle.textContent = connected ? shortAddress(state.account) : "CONNECT";
  els.mintRandom.disabled = !connected || state.minting || !config.tokenAddress || !state.saleActive;
  els.mintRandom.textContent = state.minting ? "MINTING" : "MINT RANDOM";
}

function renderMintedCount() {
  const maxSupply = Number(config.maxSupply || 222);
  els.mintedCount.textContent = `${state.totalSupply} / ${maxSupply} minted`;
}

async function refreshTotalSupply() {
  try {
    state.totalSupply = Number(await readRunner("totalSupply"));
    renderMintedCount();
    invalidateTokenScans();
  } catch (error) {
    console.warn("Unable to refresh total supply", error);
  }
}

async function refreshContractState() {
  if (!config.rpcUrl || !config.tokenAddress) return;

  try {
    const [totalSupply, saleActive, mintPriceWei] = await Promise.all([
      readRunner("totalSupply"),
      readRunner("saleActive"),
      readRunner("mintPrice"),
    ]);
    state.totalSupply = Number(totalSupply);
    state.saleActive = Boolean(saleActive);
    state.mintPriceWei = String(mintPriceWei);
    renderMintedCount();
    updateWalletUi();
    invalidateTokenScans();
  } catch (error) {
    console.warn("Unable to refresh contract state", error);
  }
}

function showDisconnectLabel() {
  if (state.account) {
    els.walletToggle.textContent = "DISCONNECT";
  }
}

async function ensureConfiguredChain() {
  if (!config.chainId || !window.ethereum) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: config.chainId }],
    });
  } catch (error) {
    if (error.code !== 4902 || !config.rpcUrl) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: config.chainId,
        chainName: config.chainName || "Runners Standing Still",
        rpcUrls: [config.rpcUrl],
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      }],
    });
  }
}

async function mintRandomIteration() {
  if (!state.account || !window.ethereum || !config.tokenAddress) return;

  state.minting = true;
  updateWalletUi();
  openMintModal({
    title: "Minting",
    status: "Waiting for wallet confirmation.",
    owner: state.account,
  });

  try {
    await ensureConfiguredChain();
    const txHash = await sendRunnerTransaction("mint", [], {
      value: `0x${BigInt(state.mintPriceWei || config.mintPriceWei || "0").toString(16)}`,
    });
    updateMintModal({
      status: "Transaction submitted. Waiting for confirmation.",
      txHash,
    });

    const receipt = await waitForTransactionReceipt(txHash);
    const tokenId = tokenIdFromTransferReceipt(receipt);
    updateMintModal({
      title: tokenId ? "Mint confirmed" : "Complete",
      status: tokenId ? "Mint confirmed. Loading iteration." : "Transaction confirmed.",
      tokenId,
    });

    await refreshTotalSupply();

    if (tokenId) {
      await completeMintIntoModal(tokenId, {
        id: tokenId,
        name: `Runners Standing Still #${tokenId}`,
        owner: state.account,
        minter: state.account,
        addedAt: Date.now(),
      });
    }
  } catch (error) {
    console.warn("Mint failed", error);
    updateMintModal({
      title: "Cancelled",
      status: readableWalletError(error),
    });
  } finally {
    state.minting = false;
    updateWalletUi();
  }
}

async function renderHash(hash, tokenId, tokenMeta = {}) {
  els.previewHash.textContent = hash;
  state.activeTokenId = String(tokenId);
  state.activeOwner = tokenMeta.owner || "";
  const traitsScript = tokenMeta.traitsScript || sharedTraitsScriptFromMetadata(tokenMeta.metadata);
  renderOwnerLine("");
  resetTraits();
  els.previewFrame.srcdoc = buildHtml({
    hash,
    tokenId,
    contractAddress: config.tokenAddress || "",
    chainId: config.chainId ? String(Number.parseInt(config.chainId, 16)) : "",
    minter: tokenMeta.minter || tokenMeta.owner || "",
    traitsScript,
  });

  if (tokenMeta.owner) {
    renderOwnerLine(await displayNameForAddress(tokenMeta.owner));
  } else if (isConcreteTokenId(tokenId)) {
    renderKnownTokenOwner(tokenId);
  }
}

function handleRendererMessage(event) {
  if (event.source !== els.previewFrame.contentWindow) return;
  if (event.data?.project !== "runners-standing-still") return;

  if (event.data.type === "initialized" || event.data.type === "complete") {
    renderTraits(event.data.features || {});
  }

  if (event.data.liveState) {
    renderLiveState(event.data.liveState);
  }
}

function resetTraits() {
  els.traits.forEach((trait) => {
    trait.textContent = "pending";
  });
  renderLiveState({ source: "pending", blockNumber: null, epoch: null });
}

function renderTraits(features) {
  els.traits.forEach((trait) => {
    const key = featureKeys[trait.dataset.trait] || trait.dataset.trait;
    const value = features[key] ?? features[trait.dataset.trait];
    const labels = featureLabels[key];
    trait.textContent = value === undefined || value === ""
      ? "none"
      : String(labels?.[value] ?? value);
  });
}

function renderLiveState(liveState) {
  const source = liveState?.source || "pending";
  els.liveSource.textContent = source;
  els.liveBlock.textContent = liveState?.blockNumber === null || liveState?.blockNumber === undefined
    ? "none"
    : String(liveState.blockNumber);
  els.liveEpoch.textContent = liveState?.epoch === null || liveState?.epoch === undefined
    ? "none"
    : String(liveState.epoch);
}

function renderSampleGrid() {
  els.sortButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sort === state.sortMode);
  });

  const samples = state.sortMode === "collector"
    ? [...state.collectorTokens].sort((a, b) => Number(b.id) - Number(a.id))
    : [...state.samples].sort((a, b) => {
      if (state.sortMode === "token") return Number(a.id) - Number(b.id);
      return Number(b.addedAt || 0) - Number(a.addedAt || 0) || Number(b.id) - Number(a.id);
    });

  if (!samples.length) {
    els.mintedGrid.innerHTML = "";
    const empty = document.createElement("p");
    empty.className = "empty-grid";
    empty.textContent = state.sortMode === "collector"
      ? collectorEmptyMessage()
      : liveMintEmptyMessage();
    els.mintedGrid.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  samples.forEach((sample) => {
    const button = document.createElement("button");
    const frameWrap = document.createElement("span");
    const label = document.createElement("span");
    const id = document.createElement("span");

    button.className = "mint-card";
    button.type = "button";
    frameWrap.className = "mint-card-frame";

    if (sample.image) {
      const image = document.createElement("img");
      image.src = versionedAssetUrl(sample.image, sample.thumbnailVersion || sample.hash || sample.id);
      image.alt = sample.name;
      image.loading = "lazy";
      image.decoding = "async";
      frameWrap.append(image);
    } else {
      const pending = document.createElement("span");
      pending.className = "pending-thumb";
      pending.textContent = "pending metadata";
      frameWrap.append(pending);
    }

    label.className = "mint-card-label";
    id.textContent = `#${sample.id}`;

    label.append(id);
    button.append(frameWrap, label);
    if (sample.hash) {
      button.addEventListener("click", () => {
        selectToken(sample);
      });
    }
    fragment.append(button);
  });

  els.mintedGrid.replaceChildren(fragment);
}

function selectToken(sample) {
  renderHash(sample.hash, sample.id, sample);
  els.previewShell.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function completeMintIntoModal(tokenId, pendingToken = {}) {
  updateMintModal({
    title: "Mint confirmed",
    status: "Loading metadata.",
    tokenId,
  });

  const tokenData = await loadTokenOnChainData(tokenId);
  const traitsScript = sharedTraitsScriptFromMetadata(tokenData.metadata);
  if (isZeroHash(tokenData.hash)) {
    throw new Error("Mint confirmed, but the stored seed is not available yet.");
  }

  const ownerLabel = await displayNameForAddress(tokenData.owner || state.account);
  updateMintModal({
    title: "Complete",
    status: "Iteration loaded.",
    tokenId,
    owner: ownerLabel,
    hash: tokenData.hash,
    html: buildHtml({
      hash: tokenData.hash,
      tokenId,
      contractAddress: config.tokenAddress || "",
      chainId: config.chainId ? String(Number.parseInt(config.chainId, 16)) : "",
      minter: tokenData.minter || tokenData.owner || "",
      traitsScript,
    }),
  });

  const mintedToken = {
    ...pendingToken,
    id: tokenId,
    name: tokenData.metadata?.name || `Runners Standing Still #${tokenId}`,
    image: tokenData.metadata?.image || "",
    metadata: tokenData.metadata,
    traitsScript,
    hash: tokenData.hash,
    owner: tokenData.owner,
    minter: tokenData.minter,
    thumbnailPending: false,
  };
  replaceMintedToken(mintedToken);
  return mintedToken;
}

async function ensureCollectorTokens() {
  if (!state.account || !config.tokenAddress || !config.rpcUrl) return;

  const scanKey = `${checksumlessAddress(state.account)}:${state.totalSupply}`;
  if (state.collectorScanKey === scanKey || state.collectorScanning) return;

  state.collectorScanning = true;
  state.collectorTokens = [];
  state.collectorScanKey = "";
  renderSampleGrid();

  try {
    await refreshTotalSupply();
    const currentScanKey = `${checksumlessAddress(state.account)}:${state.totalSupply}`;
    const tokenIds = Array.from({ length: state.totalSupply }, (_, index) => String(index + 1));
    const ownedIds = [];

    await mapWithConcurrency(tokenIds, 10, async (tokenId) => {
      try {
        const owner = await readRunner("ownerOf", tokenId);
        if (checksumlessAddress(owner) === checksumlessAddress(state.account)) {
          ownedIds.push(tokenId);
        }
      } catch {}
    });

    const ownedTokens = [];
    await mapWithConcurrency(ownedIds, 6, async (tokenId) => {
      try {
        const tokenData = await loadTokenOnChainData(tokenId);
        ownedTokens.push({
          id: tokenId,
          name: tokenData.metadata?.name || `Runners Standing Still #${tokenId}`,
          image: tokenData.metadata?.image || "",
          metadata: tokenData.metadata,
          traitsScript: sharedTraitsScriptFromMetadata(tokenData.metadata),
          hash: tokenData.hash,
          owner: tokenData.owner,
          minter: tokenData.minter,
          addedAt: Date.now(),
        });
      } catch {}
    });

    state.collectorTokens = ownedTokens.sort((a, b) => Number(b.id) - Number(a.id));
    state.collectorScanKey = currentScanKey;
  } finally {
    state.collectorScanning = false;
    if (state.sortMode === "collector") renderSampleGrid();
  }
}

async function ensureMintedTokens() {
  if (!config.tokenAddress || !config.rpcUrl) return;

  const scanKey = `${checksumlessAddress(config.tokenAddress)}:${state.totalSupply}`;
  if (state.sampleScanKey === scanKey || state.samplesScanning) return;

  state.samplesScanning = true;
  renderSampleGrid();

  try {
    await refreshTotalSupply();
    const currentScanKey = `${checksumlessAddress(config.tokenAddress)}:${state.totalSupply}`;
    const tokenIds = Array.from({ length: state.totalSupply }, (_, index) => String(index + 1));
    const liveTokens = [];

    await mapWithConcurrency(tokenIds, 6, async (tokenId) => {
      try {
        liveTokens.push(await loadMintedToken(tokenId));
      } catch (error) {
        console.warn(`Unable to load token #${tokenId}`, error);
      }
    });

    const imageByTokenHash = new Map(
      state.samples
        .filter((sample) => sample.image && sample.hash)
        .map((sample) => [`${sample.id}:${checksumlessAddress(sample.hash)}`, sample.image]),
    );

    state.samples = liveTokens
      .map((token) => ({
        ...token,
        image: token.image || imageByTokenHash.get(`${token.id}:${checksumlessAddress(token.hash)}`) || "",
      }))
      .sort((a, b) => Number(b.id) - Number(a.id));
    state.sampleScanKey = currentScanKey;
  } finally {
    state.samplesScanning = false;
    if (state.sortMode !== "collector") renderSampleGrid();
  }
}

async function loadMintedToken(tokenId) {
  const tokenData = await loadTokenOnChainData(tokenId);
  return {
    id: tokenId,
    name: tokenData.metadata?.name || `Runners Standing Still #${tokenId}`,
    image: tokenData.metadata?.image || "",
    metadata: tokenData.metadata,
    traitsScript: sharedTraitsScriptFromMetadata(tokenData.metadata),
    hash: tokenData.hash,
    owner: tokenData.owner,
    minter: tokenData.minter,
    addedAt: Number(tokenId),
  };
}

function invalidateTokenScans() {
  state.sampleScanKey = "";
  state.collectorScanKey = "";
}

function resetCollectorScan() {
  state.collectorTokens = [];
  state.collectorScanKey = "";
  state.collectorScanning = false;
}

function rememberCollectorToken(token) {
  if (checksumlessAddress(token.owner) !== checksumlessAddress(state.account)) return;

  state.collectorTokens = [
    token,
    ...state.collectorTokens.filter((existing) => String(existing.id) !== String(token.id)),
  ];
  state.collectorScanKey = `${checksumlessAddress(state.account)}:${state.totalSupply}`;
  if (state.sortMode === "collector") renderSampleGrid();
}

function rememberMintedToken(token) {
  state.samples = [
    token,
    ...state.samples.filter((existing) => String(existing.id) !== String(token.id)),
  ];
  rememberCollectorToken(token);
  state.sampleScanKey = `${checksumlessAddress(config.tokenAddress)}:${state.totalSupply}`;
  if (state.sortMode !== "collector") renderSampleGrid();
}

function replaceMintedToken(token) {
  state.samples = upsertToken(state.samples, token);
  state.collectorTokens = upsertToken(state.collectorTokens, token);
  renderSampleGrid();
}

function upsertToken(tokens, token) {
  const nextTokens = tokens.map((sample) => (
    String(sample.id) === String(token.id) ? token : sample
  ));
  if (!nextTokens.some((sample) => String(sample.id) === String(token.id))) {
    nextTokens.unshift(token);
  }
  return nextTokens;
}

function collectorEmptyMessage() {
  if (!state.account) return "Connect wallet to view your mints.";
  if (state.collectorScanning) return "Checking tokens...";
  return "No mints found for this wallet yet.";
}

function liveMintEmptyMessage() {
  if (state.samplesScanning) return "Loading minted iterations...";
  if (!config.tokenAddress || !config.rpcUrl) return "Contract configuration pending.";
  return "No iterations minted yet.";
}

function buildHtml(input) {
  const { traitsScript: rawTraitsScript, ...renderInput } = input;
  const renderInputJson = JSON.stringify(renderInput);
  const traitsScript = typeof rawTraitsScript === "string" ? rawTraitsScript : "";
  const staticPreview = input.staticPreview === true
    || input.disableLive === true
    || input.thumbnail === true
    || input.mode === "thumbnail"
    || input.mode === "static";
  const staticPreviewScript = staticPreview
    ? 'window.__RUNNER_STATIC_PREVIEW=true;window.addEventListener("runners-standing-still:complete",()=>{const noop=()=>0;window.fetch=()=>Promise.reject(new Error("static preview disables live RPC"));window.setInterval=noop;window.requestAnimationFrame=noop;},{once:true});'
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Runners Standing Still Preview</title><style>html,body{width:100%;height:100%;margin:0;background:#f5f5f2}body{display:grid;place-items:center;overflow:hidden}canvas{display:block;max-width:100vw;max-height:100vh}</style></head><body><canvas></canvas><script>window.renderInput=${renderInputJson};window.tokenData=window.renderInput;${traitsScript}${staticPreviewScript}function notifyParent(type,event){parent.postMessage({project:"runners-standing-still",type,features:window.$features||{},liveState:event?.detail?.liveState||window.__textureMelt?.liveState||null},"*")}window.addEventListener("runners-standing-still:initialized",event=>notifyParent("initialized",event));window.addEventListener("runners-standing-still:complete",event=>notifyParent("complete",event));window.addEventListener("runners-standing-still:live-block",event=>notifyParent("live-block",event));</script><script>${state.rendererScript}</script></body></html>`;
}

function versionedAssetUrl(url, version) {
  if (url.startsWith("data:")) return url;
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

function openMintModal({ title = "Minting", status = "", txHash = "", tokenId = "", owner = "", hash = "" } = {}) {
  resetMintModal();
  updateMintModal({ title, status, txHash, tokenId, owner, hash, html: "" });
  if (!els.mintModal.open) {
    els.mintModal.showModal();
  }
}

function closeMintModal() {
  els.mintModal.close();
}

function updateMintModal({ title, status, txHash, tokenId, owner, hash, html } = {}) {
  if (title) els.mintModalTitle.textContent = title;
  if (status) els.mintModalStatus.textContent = status;
  if (txHash) els.mintModalTx.textContent = shortHash(txHash);
  if (tokenId) els.mintModalToken.textContent = `#${tokenId}`;
  if (owner) els.mintModalOwner.textContent = owner.startsWith("0x") ? shortAddress(owner) : owner;
  if (hash) els.mintModalHash.textContent = hash;
  if (html !== undefined) {
    if (html) {
      els.mintModalPreview.srcdoc = html;
      els.mintModalPreviewWrap.hidden = false;
    } else {
      els.mintModalPreview.removeAttribute("srcdoc");
      els.mintModalPreviewWrap.hidden = true;
    }
  }
}

function resetMintModal() {
  els.mintModalTitle.textContent = "Minting";
  els.mintModalStatus.textContent = "Waiting for wallet confirmation.";
  els.mintModalTx.textContent = "pending";
  els.mintModalToken.textContent = "pending";
  els.mintModalOwner.textContent = "pending";
  els.mintModalHash.textContent = "pending";
  els.mintModalPreview.removeAttribute("srcdoc");
  els.mintModalPreviewWrap.hidden = true;
}

async function renderKnownTokenOwner(tokenId) {
  try {
    const { owner } = await loadTokenOnChainData(tokenId, { seed: false, minter: false });
    if (String(tokenId) !== activeTokenId()) return;
    renderOwnerLine(await displayNameForAddress(owner));
  } catch {
    if (String(tokenId) !== activeTokenId()) return;
    renderOwnerLine("");
  }
}

function renderOwnerLine(ownerLabel) {
  if (!ownerLabel) {
    els.tokenOwner.hidden = true;
    els.tokenOwnerValue.textContent = "";
    return;
  }
  els.tokenOwner.hidden = false;
  els.tokenOwnerValue.textContent = ownerLabel;
}

function activeTokenId() {
  return state.activeTokenId;
}

async function loadTokenOnChainData(tokenId, options = {}) {
  const { owner = true, seed = true, minter = true, metadata = true } = options;
  const [ownerAddress, seedHash, minterAddress] = await Promise.all([
    owner ? readRunner("ownerOf", tokenId) : Promise.resolve(""),
    seed ? readRunner("tokenSeed", tokenId) : Promise.resolve(""),
    minter ? readRunner("tokenMinter", tokenId) : Promise.resolve(""),
  ]);
  const tokenMetadata = metadata && !isZeroHash(seedHash)
    ? await loadTokenMetadata(tokenId)
    : null;

  return {
    owner: ownerAddress,
    hash: seedHash,
    minter: minterAddress,
    metadata: tokenMetadata,
  };
}

async function loadTokenMetadata(tokenId) {
  try {
    const tokenUri = await readRunner("tokenURI", tokenId);
    return decodeTokenMetadata(tokenUri);
  } catch (error) {
    console.warn(`Unable to load tokenURI for #${tokenId}`, error);
    return null;
  }
}

async function sendRunnerTransaction(method, args = [], options = {}) {
  const spec = runnerContract.writes[method];
  if (!spec) throw new Error(`Unknown RUNNER write: ${method}`);
  return window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: state.account,
      to: config.tokenAddress,
      value: options.value || "0x0",
      data: `${spec.selector}${encodeArgs(spec.args || [], args)}`,
    }],
  });
}

async function readRunner(method, ...args) {
  const spec = runnerContract.reads[method];
  if (!spec) throw new Error(`Unknown RUNNER read: ${method}`);
  const result = await ethCall(`${spec.selector}${encodeArgs(spec.args || [], args)}`);
  return decodeContractValue(result, spec.returns);
}

async function ethCall(data) {
  if (!config.tokenAddress || !config.rpcUrl) throw new Error("Missing contract configuration.");
  return rpcRequest("eth_call", [{ to: config.tokenAddress, data }, "latest"]);
}

async function rpcRequest(method, params) {
  const response = await fetch(config.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || `${method} failed.`);
  return payload.result;
}

async function waitForTransactionReceipt(txHash) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const receipt = await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt) return receipt;
    await delay(1000);
  }
  throw new Error("Timed out waiting for transaction confirmation.");
}

function tokenIdFromTransferReceipt(receipt) {
  const contractAddress = checksumlessAddress(config.tokenAddress || "");
  const log = receipt?.logs?.find((entry) => (
    checksumlessAddress(entry.address) === contractAddress
    && entry.topics?.[0]?.toLowerCase() === runnerContract.events.transfer
    && entry.topics?.[3]
  ));
  return log ? String(BigInt(log.topics[3])) : "";
}

async function displayNameForAddress(address) {
  if (!address) return "";
  const short = shortAddress(address);
  const name = await resolveEnsName(address);
  return name || short;
}

async function resolveEnsName(address) {
  if (!address || config.chainId !== "0x1") return "";
  if (typeof config.resolveName === "function") {
    try {
      return await config.resolveName(address);
    } catch {}
  }
  if (config.ensLookupUrl) {
    try {
      const response = await fetch(`${config.ensLookupUrl}${encodeURIComponent(address)}`, { cache: "no-store" });
      if (!response.ok) return "";
      const payload = await response.json();
      return payload.name || payload.ens || "";
    } catch {}
  }
  return "";
}

function uint256Hex(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function encodeArgs(types, values) {
  if (types.length !== values.length) throw new Error("Contract argument length mismatch.");
  return types.map((type, index) => {
    if (type === "uint256") return uint256Hex(values[index]);
    throw new Error(`Unsupported contract argument type: ${type}`);
  }).join("");
}

function decodeContractValue(result, type) {
  if (!result || result === "0x") return type === "bool" ? false : "";
  if (type === "uint256") return BigInt(result);
  if (type === "bool") return BigInt(result) !== 0n;
  if (type === "address") return checksumlessAddress(`0x${result.slice(-40)}`);
  if (type === "bytes32") return result;
  if (type === "string") return decodeAbiString(result);
  throw new Error(`Unsupported contract return type: ${type}`);
}

function decodeAbiString(result) {
  const clean = String(result || "").replace(/^0x/, "");
  if (!clean) return "";
  const offset = Number.parseInt(clean.slice(0, 64), 16) * 2;
  const length = Number.parseInt(clean.slice(offset, offset + 64), 16);
  const hex = clean.slice(offset + 64, offset + 64 + length * 2);
  const bytes = hex.match(/.{1,2}/g)?.map((pair) => Number.parseInt(pair, 16)) || [];
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function decodeTokenMetadata(tokenUri) {
  const json = decodeDataUri(tokenUri);
  return JSON.parse(json);
}

function sharedTraitsScriptFromMetadata(metadata) {
  const animationHtml = decodeDataUri(metadata?.animation_url || "");
  if (typeof animationHtml !== "string" || !animationHtml) return "";

  const match = animationHtml.match(/window\.__runnerTraits=\{[A-Za-z0-9_:".,-]+\};/);
  return match ? match[0] : "";
}

function decodeDataUri(uri) {
  const match = String(uri || "").match(/^data:([^,]*),(.*)$/s);
  if (!match) return uri;
  const metadata = match[1] || "";
  const body = match[2] || "";
  if (metadata.endsWith(";base64")) {
    return atob(body);
  }
  return decodeURIComponent(body);
}

function checksumlessAddress(address) {
  return String(address || "").toLowerCase();
}

function isConcreteTokenId(tokenId) {
  return /^\d+$/.test(String(tokenId)) && BigInt(tokenId) > 0n;
}

function isZeroHash(hash) {
  return !hash || /^0x0{64}$/i.test(hash);
}

function readableWalletError(error) {
  if (error?.code === 4001) return "Transaction cancelled in wallet.";
  return error?.message || "Transaction failed.";
}

function shortHash(hash) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrency(items, concurrency, callback) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await callback(item);
    }
  });
  await Promise.all(workers);
}

function randomHash() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
