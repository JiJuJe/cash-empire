"use strict";

// Presentation-only shell: move the existing controls without replacing their IDs or game state.
(() => {
  const columns = document.querySelector(".columns");
  const play = document.querySelector(".play-column");
  const page = document.querySelector(".content-column");
  const world = document.querySelector(".world-panel");
  const market = document.querySelector(".store-column");
  const tabs = document.querySelector(".tabs");
  const feature = document.getElementById("featureBackdrop");
  if (!columns || !play || !page || !world || !market || !tabs || !feature) return;

  document.documentElement.classList.add("v2");
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    return el;
  };

  const nav = node("aside", "v2-nav");
  nav.setAttribute("aria-label", "Game navigation");
  const brand = node("div", "v2-brand");
  brand.append(play.querySelector(".brand-mark"), play.querySelector(".brand-copy"));
  const navHeading = node("span", "v2-nav-heading", "YOUR EMPIRE");
  tabs.classList.add("v2-nav-list");
  const homeButton = node("button", "tab active", "HOME");
  homeButton.type = "button";
  homeButton.dataset.tab = "home";
  tabs.prepend(homeButton);
  const order = ["home", "upgrades", "prestige", "boosters", "achievements", "leaderboard", "store", "stats", "cosmetics"];
  const labels = {prestige:"REBIRTH"};
  const icons = {home:"⌂",upgrades:"✦",prestige:"↗",boosters:"◆",achievements:"★",leaderboard:"▥",store:"▣",stats:"◫",cosmetics:"◈"};
  for (const key of order) {
    const button = key === "home" ? homeButton : tabs.querySelector(`[data-tab="${key}"], [data-feature="${key}"]`);
    if (!button) continue;
    button.classList.remove("active");
    button.setAttribute("aria-label", labels[key] || button.textContent.trim());
    const text = node("span", "v2-nav-text", labels[key] || button.textContent.trim());
    const icon = node("span", "v2-nav-icon", icons[key]);
    icon.setAttribute("aria-hidden", "true");
    button.replaceChildren(icon, text);
    tabs.append(button);
  }
  homeButton.classList.add("active");
  const navFoot = node("p", "v2-nav-foot", "BUILD YOUR FORTUNE");
  nav.append(brand, navHeading, tabs, navFoot);

  const main = node("div", "v2-main");
  const home = node("div", "v2-home");
  home.id = "v2Home";
  const center = node("div", "v2-home-center");
  const right = node("aside", "v2-right");
  right.setAttribute("aria-label", "Active boosters and events");
  right.append(node("div", "v2-status-panel v2-boost-panel"), node("div", "v2-status-panel v2-event-panel"));
  center.append(play, world);
  home.append(center, right);
  main.append(home, page);
  columns.replaceChildren(nav, main);

  // The existing business market still renders for the current purchase code;
  // the new world also exposes the same purchases directly.
  market.classList.add("v2-market-source");
  page.append(market);
  page.append(feature);
  page.hidden = true;
  page.querySelector(".progress-area").hidden = true;
  feature.hidden = true;

  const buyRow = market.querySelector(".buy-row");
  if (buyRow) world.querySelector(".owned-heading").after(buyRow);
  play.querySelector(".play-header").prepend(node("span", "v2-click-kicker", "TAP TO COLLECT"));
  const worldTitle = world.querySelector(".owned-heading h2");
  if (worldTitle) worldTitle.textContent = "Your business world";
})();
