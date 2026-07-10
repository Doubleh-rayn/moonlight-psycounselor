// js/render.js
// data/content.js 의 CONTENT 객체를 읽어 화면을 자동으로 그립니다.
// 이 파일은 수정할 필요가 없습니다. 내용을 바꾸려면 data/content.js를 수정하세요.

(function () {
  "use strict";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderSite() {
    const { site } = CONTENT;
    document.title = site.name + " | " + site.role;
    setText("heroRole", site.role);
    setText("heroName", site.name);
    setText("heroTagline", site.tagline);
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value || "";
  }

  // 아웃라인 아이콘 세트 (18x18, stroke=currentColor) — 사이드바 메뉴 항목과 매칭
  const NAV_ICONS = {
    "#about":
      '<svg class="nav-icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><circle cx="9" cy="6" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 15.2c1-3.2 3-4.7 5.5-4.7s4.5 1.5 5.5 4.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    "#approach":
      '<svg class="nav-icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M9 4.6c-1.4-1-3.3-1.3-4.8-1v9.6c1.5-.3 3.4 0 4.8 1 1.4-1 3.3-1.3 4.8-1V3.6c-1.5-.3-3.4 0-4.8 1z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9 4.6v9.6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    "#works":
      '<svg class="nav-icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M3.5 5A1.5 1.5 0 0 1 5 3.5h8A1.5 1.5 0 0 1 14.5 5v6a1.5 1.5 0 0 1-1.5 1.5H8l-3 2.3v-2.3H5A1.5 1.5 0 0 1 3.5 11V5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    "#contact":
      '<svg class="nav-icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><rect x="3" y="4.5" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 5.5l5.5 4.3 5.5-4.3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function renderNav() {
    const list = document.getElementById("navList");
    if (!list || !CONTENT.nav) return;
    CONTENT.nav.forEach((item) => {
      const li = el("li");
      const a = document.createElement("a");
      a.href = item.href;
      if (NAV_ICONS[item.href]) a.innerHTML = NAV_ICONS[item.href];
      a.appendChild(el("span", null, item.label));
      li.appendChild(a);
      list.appendChild(li);
    });

    const navLinks = Array.from(list.querySelectorAll("a"));

    // 모바일 사이드바(드로어) 토글
    const toggle = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("scrim");

    function closeSidebar() {
      if (sidebar) sidebar.classList.remove("open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      if (scrim) scrim.hidden = true;
    }

    if (toggle && sidebar) {
      toggle.addEventListener("click", () => {
        const isOpen = sidebar.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        if (scrim) scrim.hidden = !isOpen;
      });
      navLinks.forEach((a) => a.addEventListener("click", closeSidebar));
      if (scrim) scrim.addEventListener("click", closeSidebar);
    }

    // 스크롤 위치에 따라 현재 섹션의 메뉴를 활성 표시
    const sections = CONTENT.nav
      .map((item) => document.querySelector(item.href))
      .filter(Boolean);

    if (sections.length && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((a) => {
              a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id);
            });
          });
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
      );
      sections.forEach((section) => observer.observe(section));
    }
  }

  function renderAbout() {
    const { about } = CONTENT;
    if (!about) return;

    setText("aboutIntro", about.intro);

    const photo = document.getElementById("aboutPhoto");
    if (photo) {
      if (about.photo) {
        photo.src = about.photo;
        photo.alt = CONTENT.site.name + "의 프로필 사진";
        photo.hidden = false;
      } else {
        photo.hidden = true;
      }
    }

    renderAboutList("aboutValuesSection", "aboutValues", about.values);
    renderAboutList("aboutStrengthsSection", "aboutStrengths", about.strengths);
    renderAboutList("aboutEducationSection", "aboutEducation", about.education);
    renderAboutList("aboutCareerSection", "aboutCareer", about.career);
    renderAboutList("aboutCertificationsSection", "aboutCertifications", about.certifications);
  }

  // 빈 문자열("")로 채워진 항목은 아직 확인되지 않은 정보이므로 화면에서 건너뜁니다.
  // 목록에 표시할 내용이 하나도 없으면 소제목까지 함께 숨겨 빈 섹션이 보이지 않게 합니다.
  function renderAboutList(sectionId, listId, items) {
    const section = document.getElementById(sectionId);
    const list = document.getElementById(listId);
    if (!section || !list) return;

    const visibleItems = Array.isArray(items) ? items.filter((v) => v && String(v).trim()) : [];

    if (visibleItems.length === 0) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    visibleItems.forEach((v) => list.appendChild(el("li", null, v)));
  }

  function renderCards(containerId, items, kindLabelKey) {
    const container = document.getElementById(containerId);
    if (!container || !Array.isArray(items)) return;

    items.forEach((item) => {
      const card = el("article", "card");
      if (item.tag === "변화의 도구") card.classList.add("accent-b");

      if (kindLabelKey && item[kindLabelKey]) {
        card.appendChild(el("span", "card-tag", item[kindLabelKey]));
      }

      card.appendChild(el("h3", "card-title", item.title));
      card.appendChild(el("p", "card-summary", item.summary));

      if (Array.isArray(item.merits) && item.merits.length) {
        const meritsList = el("ul", "card-merits");
        item.merits.forEach((m) => meritsList.appendChild(el("li", null, m)));
        card.appendChild(meritsList);
      }

      if (item.link) {
        const a = el("a", "card-link", "자세히 보기 →");
        a.href = item.link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        card.appendChild(a);
      }

      container.appendChild(card);
    });
  }

  function renderContact() {
    const { site, contact } = CONTENT;
    const emailLink = document.getElementById("contactEmailLink");
    if (emailLink) {
      emailLink.textContent = site.email;
      emailLink.href = "mailto:" + site.email;
    }
    setText("contactNotice", contact && contact.notice);

    const form = document.getElementById("contactForm");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = form.name.value.trim();
        const replyEmail = form.email.value.trim();
        const message = form.message.value.trim();

        const subject = "[홈페이지 문의] " + name;
        const body =
          message +
          "\n\n---\n회신받을 이메일: " +
          replyEmail;

        const mailtoUrl =
          "mailto:" +
          site.email +
          "?subject=" +
          encodeURIComponent(subject) +
          "&body=" +
          encodeURIComponent(body);

        window.location.href = mailtoUrl;
      });
    }
  }

  function renderFooter() {
    const { site, footer } = CONTENT;
    setText("footerText", footer && footer.copyright);
    const link = document.getElementById("footerEmailLink");
    if (link) {
      link.textContent = site.email;
      link.href = "mailto:" + site.email;
    }
  }

  function init() {
    if (typeof CONTENT === "undefined") {
      console.error("CONTENT를 찾을 수 없습니다. data/content.js가 먼저 로드되어야 합니다.");
      return;
    }
    renderSite();
    renderNav();
    renderAbout();
    setText("approachIntro", CONTENT.approachIntro);
    renderCards("approachCards", CONTENT.approaches, "tag");
    renderCards("worksCards", CONTENT.works, "type");
    renderContact();
    renderFooter();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
