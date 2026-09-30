/* The persisted slot remains `pile`. Skins only affect this shared coin artwork. */
(() => {
  const skins = Object.freeze({
    emerald_pile: "emerald", diamond_pile: "diamond",
    pink_diamond_pile: "pink-diamond", obsidian_pile: "obsidian",
    luxury_pile: "luxury", cosmic_pile: "cosmic"
  });
  function apply(element, cosmeticId) {
    // Unknown saved IDs retain ownership and gracefully display the base coin.
    element.dataset.coinSkin = skins[cosmeticId] || "gold";
  }
  function create(cosmeticId) {
    const element = document.createElement("span");
    element.className = "coin-art";
    element.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.className = "coin-image";
    image.src = "assets/coins/base-coin.png";
    image.alt = "";
    image.width = 1024;
    image.height = 1024;
    image.draggable = false;
    element.append(image);
    apply(element, cosmeticId);
    return element;
  }
  window.ClickTheCashCoin = Object.freeze({ create, apply });
})();
