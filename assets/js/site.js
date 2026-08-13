/* All handlers are delegated from the document so sections rendered later by
   content.js stay interactive without rebinding. */
(() => {
  "use strict";

  const body = document.body;
  const MOBILE = "(max-width: 980px)";

  /* ------------------------------------------------------------ mobile nav */
  function nav() { return document.querySelector("[data-site-nav]"); }
  function navToggle() { return document.querySelector("[data-nav-toggle]"); }

  function setNavState(open) {
    const list = nav();
    const toggle = navToggle();
    if (!list || !toggle) return;
    const mobile = window.matchMedia(MOBILE).matches;
    const visible = mobile && open;
    list.classList.toggle("is-open", visible);
    toggle.setAttribute("aria-expanded", String(visible));
    toggle.setAttribute("aria-label", visible ? "메뉴 닫기" : "메뉴 열기");
    body.classList.toggle("nav-open", visible);
    list.inert = mobile && !visible;
    if (mobile && !visible) list.setAttribute("aria-hidden", "true");
    else list.removeAttribute("aria-hidden");
    list.querySelectorAll("a").forEach((link) => {
      if (mobile && !visible) link.setAttribute("tabindex", "-1");
      else link.removeAttribute("tabindex");
    });
  }

  function closeNav() { setNavState(false); }

  window.addEventListener("resize", closeNav);
  document.addEventListener("content:ready", closeNav);
  setNavState(false);

  /* --------------------------------------------------------------- clicks */
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target.closest) return;

    if (target.closest("[data-nav-toggle]")) {
      const toggle = navToggle();
      setNavState(toggle.getAttribute("aria-expanded") !== "true");
      return;
    }

    if (target.closest("[data-site-nav] a") && window.matchMedia(MOBILE).matches) {
      closeNav();
    }

    const filterButton = target.closest("[data-filter]");
    if (filterButton) { runFilter(filterButton); return; }

    const lightbox = target.closest("[data-lightbox]");
    if (lightbox) { openModal(lightbox); return; }

    if (target.closest("[data-modal-close]")) {
      const modal = target.closest("dialog");
      if (modal) modal.close();
      return;
    }

    const tab = target.closest("[role='tab']");
    if (tab) { activateTab(tab); return; }

    const copyButton = target.closest("[data-copy-form]");
    if (copyButton) { copyForm(copyButton.closest("form")); return; }

    const previewButton = target.closest("[data-preview-form]");
    if (previewButton) { previewForm(previewButton.closest("form")); return; }

    const sendButton = target.closest("[data-send-form]");
    if (sendButton) { sendForm(sendButton.closest("form"), sendButton); }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
      document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
      return;
    }
    const tab = event.target.closest && event.target.closest("[role='tab']");
    if (!tab) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...tab.closest("[role='tablist']").querySelectorAll("[role='tab']")];
    const index = tabs.indexOf(tab);
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    activateTab(tabs[next]);
    tabs[next].focus();
  });

  /* -------------------------------------------------------------- filters */
  function runFilter(button) {
    const group = button.closest("[data-filter-group]");
    if (!group) return;
    const selector = group.dataset.filterTarget;
    if (!selector) return;
    const filter = button.dataset.filter || "all";
    group.querySelectorAll("[data-filter]").forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle("is-active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll(selector).forEach((item) => {
      const tags = (item.dataset.tags || "").split(/[\s,]+/);
      item.hidden = filter !== "all" && !tags.includes(filter);
    });
  }

  /* ---------------------------------------------------------------- modal */
  function openModal(button) {
    const modal = document.querySelector("[data-lightbox-modal]");
    if (!modal || typeof modal.showModal !== "function") return;
    const image = modal.querySelector("[data-modal-image]");
    const title = modal.querySelector("[data-modal-title]");
    const copy = modal.querySelector("[data-modal-copy]");
    if (image) {
      image.removeAttribute("width");
      image.removeAttribute("height");
      image.src = button.dataset.image || "";
      image.alt = button.dataset.title || "포트폴리오 확대 이미지";
      image.setAttribute("referrerpolicy", "no-referrer");
      image.hidden = false;
    }
    if (title) title.textContent = button.dataset.title || "포트폴리오";
    if (copy) copy.textContent = button.dataset.description || "";
    modal.showModal();
  }

  document.addEventListener("click", (event) => {
    const modal = event.target.closest && event.target.closest("dialog[data-lightbox-modal]");
    if (!modal || event.target !== modal) return;
    const rect = modal.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) modal.close();
  });

  /* ----------------------------------------------------------------- tabs */
  function activateTab(button) {
    const list = button.closest("[role='tablist']");
    if (!list) return;
    const tabs = [...list.querySelectorAll("[role='tab']")];
    tabs.forEach((candidate) => {
      const selected = candidate === button;
      candidate.setAttribute("aria-selected", String(selected));
      candidate.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(candidate.getAttribute("aria-controls") || "");
      if (panel) panel.hidden = !selected;
    });
  }

  /* ------------------------------------------------------- inquiry forms */
  function fieldValue(field) {
    if (field.type === "checkbox") return field.checked ? "예" : "아니요";
    if (field.type === "file") {
      const names = [...field.files].map((file) => file.name);
      return names.length ? names.join(", ") : "선택 안 함";
    }
    return field.value.trim() || "미작성";
  }

  function inquiryText(form) {
    const title = form.dataset.formTitle || "문의서";
    const rows = ["[INAB " + title + "]", ""];
    form.querySelectorAll("[data-copy-field]").forEach((field) => {
      rows.push((field.dataset.label || "항목") + ": " + fieldValue(field));
    });
    rows.push("", "※ 작성 내용을 확인한 뒤 사용 중인 문의 채널에 붙여넣어 주세요.");
    return rows.join("\n");
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) throw new Error("copy rejected");
  }

  function status(form, message) {
    const node = form.querySelector("[data-copy-status]");
    if (node) node.textContent = message;
  }

  async function copyForm(form) {
    if (!form) return;
    try {
      await copyText(inquiryText(form));
      status(form, "문의 내용이 복사되었습니다.");
    } catch {
      status(form, "복사하지 못했습니다. 미리보기에서 직접 선택해 주세요.");
    }
  }

  function previewForm(form) {
    if (!form) return;
    const preview = form.querySelector("[data-form-preview]");
    if (!preview) return;
    preview.value = inquiryText(form);
    preview.hidden = false;
    preview.focus();
    preview.select();
    status(form, "아래 미리보기에서 내용을 확인할 수 있습니다.");
  }

  async function sendForm(form, button) {
    if (!form) return;
    const contact = form.querySelector("[data-contact]");
    const value = contact ? contact.value.trim() : "";
    if (!value) {
      status(form, "연락받을 곳을 먼저 적어주세요.");
      if (contact) contact.focus();
      return;
    }
    if (typeof insertRow !== "function") {
      status(form, "지금은 전송할 수 없습니다. 복사해서 보내주세요.");
      return;
    }
    button.disabled = true;
    const sent = await insertRow("inquiries", {
      contact: value,
      form_title: form.dataset.formTitle || "문의서",
      message: inquiryText(form)
    });
    button.disabled = false;
    if (sent) {
      status(form, "문의가 전달되었습니다. 답변은 적어주신 연락처로 드립니다.");
      if (typeof showToast === "function") showToast("문의가 전달되었습니다.");
    } else {
      status(form, "전송에 실패했습니다. 복사해서 보내주세요.");
    }
  }

  /* ------------------------------------------------------------ faq search */
  function updateFaq() {
    const search = document.querySelector("[data-faq-search]");
    if (!search) return;
    const items = [...document.querySelectorAll("[data-faq-item]")];
    const count = document.querySelector("[data-faq-count]");
    const empty = document.querySelector("[data-faq-empty]");
    const query = search.value.trim().toLocaleLowerCase("ko-KR");
    let visible = 0;
    items.forEach((item) => {
      const match = !query || item.textContent.toLocaleLowerCase("ko-KR").includes(query);
      item.hidden = !match;
      if (match) visible += 1;
    });
    if (count) count.textContent = visible + "개";
    if (empty) empty.hidden = visible !== 0;
  }

  document.addEventListener("input", (event) => {
    if (event.target.matches && event.target.matches("[data-faq-search]")) updateFaq();
  });
  document.addEventListener("content:ready", updateFaq);
  updateFaq();

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll("[data-c-year]").forEach((node) => {
    node.textContent = node.textContent.replace(/\{year\}/g, String(new Date().getFullYear()));
  });
})();
