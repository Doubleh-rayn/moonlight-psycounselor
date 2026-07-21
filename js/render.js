// js/render.js
// 콘텐츠(CONTENT)를 읽어 화면을 자동으로 그립니다.
// 이 파일은 수정할 필요가 없습니다. 내용을 바꾸려면 /admin 관리자 페이지에서 수정하세요.
//
// 콘텐츠는 다음 순서로 불러옵니다.
//   1) /api/content — Vercel에 배포되어 있으면 관리자 페이지에서 저장한 최신 내용을 받아옵니다.
//   2) data/content.json — 위 API를 쓸 수 없을 때(로컬 미리보기 등) 사용하는 기본값입니다.

(function () {
  "use strict";

  let CONTENT = null;

  async function loadContent() {
    try {
      const res = await fetch("/api/content", { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (err) {
      // /api 서버리스 함수가 없는 환경(로컬 정적 미리보기 등) — 기본 파일로 대체
    }
    const fallback = await fetch("data/content.json", { cache: "no-store" });
    return await fallback.json();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value || "";
  }

  function renderSite() {
    const { site } = CONTENT;
    document.title = site.name + " | " + site.role;

    const logo = document.getElementById("navLogo");
    if (logo) logo.textContent = site.name;

    setText("heroTag", site.tagline);
    setText("heroName", site.name);
    setText("heroRole", site.role);

    const heroBg = document.getElementById("heroBg");
    if (heroBg && site.heroImage) heroBg.src = site.heroImage;
  }

  function renderNav() {
    const menu = document.getElementById("navMenu");
    if (!menu || !CONTENT.nav) return;

    CONTENT.nav.forEach((item, index) => {
      const a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label;
      if (index === CONTENT.nav.length - 1) a.classList.add("nav__cta");
      menu.appendChild(a);
    });

    const navLinks = Array.from(menu.querySelectorAll("a"));
    const nav = document.getElementById("siteNav");
    const toggle = document.getElementById("navToggle");

    function closeMenu() {
      menu.classList.remove("open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }

    if (toggle) {
      toggle.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
      navLinks.forEach((a) => a.addEventListener("click", closeMenu));
    }

    // 히어로를 벗어나 스크롤하면 내비게이션을 흰 배경으로 전환
    if (nav) {
      const onScroll = () => {
        nav.classList.toggle("nav--scrolled", window.scrollY > 60);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
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
    renderAboutList("aboutCertificationsSection", "aboutCertifications", about.certifications);
    renderAboutList("aboutCareerSection", "aboutCareer", about.career);
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

  function renderActivities() {
    const section = document.getElementById("activitiesSection");
    const list = document.getElementById("activitiesList");
    if (!section || !list) return;

    const groups = Array.isArray(CONTENT.activities) ? CONTENT.activities : [];
    if (groups.length === 0) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    groups.forEach((group) => {
      const groupEl = el("div", "activity-group");
      groupEl.appendChild(el("span", "card-tag", group.category));

      const ul = el("ul", "activity-items");
      (group.items || []).forEach((item) => {
        const li = el("li");
        li.appendChild(el("strong", null, item.org));
        li.appendChild(document.createTextNode(" — " + item.desc));
        ul.appendChild(li);
      });
      groupEl.appendChild(ul);

      list.appendChild(groupEl);
    });
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
    setText("contactNote", contact && contact.note);

    const emailLink = document.getElementById("contactEmailLink");
    if (emailLink) {
      emailLink.textContent = site.email;
      emailLink.href = "mailto:" + site.email;
    }
  }

  function renderFooter() {
    const { footer } = CONTENT;
    setText("footerText", footer && footer.copyright);
  }

  // 섹션이 화면에 들어오면 페이드+살짝 위로 등장. 모션에 민감한 사용자는 존중(reduce-motion).
  function initReveal() {
    const targets = document.querySelectorAll(".reveal");
    if (!targets.length) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("reveal--visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach((t) => observer.observe(t));
  }

  async function init() {
    try {
      CONTENT = await loadContent();
    } catch (err) {
      console.error("콘텐츠를 불러오지 못했습니다.", err);
      return;
    }
    renderSite();
    renderNav();
    renderAbout();
    renderActivities();
    setText("approachIntro", CONTENT.approachIntro);
    renderCards("approachCards", CONTENT.approaches, "tag");
    renderCards("worksCards", CONTENT.works, "type");
    renderContact();
    renderFooter();
    initReveal();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
