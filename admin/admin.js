// admin/admin.js
// 관리자 로그인과 콘텐츠 편집 폼을 담당합니다.

(function () {
  "use strict";

  // ── 작은 DOM 헬퍼 ───────────────────────────

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function section(title) {
    const wrap = el("section", "editor-section");
    wrap.appendChild(el("h2", "editor-section-title", title));
    return wrap;
  }

  // 텍스트 한 줄 입력 필드. { node, getValue }를 반환합니다.
  function field(label, value) {
    const wrap = el("div", "field-row");
    const labelEl = el("label", "field-label", label);
    const input = document.createElement("input");
    input.type = "text";
    input.className = "field-input";
    input.value = value || "";
    labelEl.appendChild(input);
    wrap.appendChild(labelEl);
    return { node: wrap, getValue: () => input.value };
  }

  // 여러 줄 텍스트 입력. { node, getValue }를 반환합니다.
  function textareaField(label, value, rows) {
    const wrap = el("div", "field-row");
    const labelEl = el("label", "field-label", label);
    const textarea = document.createElement("textarea");
    textarea.className = "field-textarea";
    textarea.rows = rows || 4;
    textarea.value = value || "";
    labelEl.appendChild(textarea);
    wrap.appendChild(labelEl);
    return { node: wrap, getValue: () => textarea.value };
  }

  // 선택형(드롭다운) 필드. { node, getValue }를 반환합니다.
  function selectField(label, value, options) {
    const wrap = el("div", "field-row");
    const labelEl = el("label", "field-label", label);
    const select = document.createElement("select");
    select.className = "field-input";
    options.forEach((opt) => {
      const optionEl = document.createElement("option");
      optionEl.value = opt;
      optionEl.textContent = opt;
      if (opt === value) optionEl.selected = true;
      select.appendChild(optionEl);
    });
    labelEl.appendChild(select);
    wrap.appendChild(labelEl);
    return { node: wrap, getValue: () => select.value };
  }

  // 추가/삭제가 가능한 목록 편집기.
  // renderItem(value) => { node, getValue }  한 행을 만드는 함수
  // createNew() => 새 행의 기본값
  // 반환값: { node, getValues() }
  function listEditor(items, renderItem, createNew, addLabel) {
    const wrap = el("div", "editor-list");
    const rows = [];

    function addRow(value) {
      const rowWrap = el("div", "editor-list-row");
      const item = renderItem(value);
      rowWrap.appendChild(item.node);

      const removeBtn = el("button", "editor-remove-btn", "삭제");
      removeBtn.type = "button";
      removeBtn.addEventListener("click", () => {
        rowWrap.remove();
        const idx = rows.indexOf(entry);
        if (idx !== -1) rows.splice(idx, 1);
      });
      rowWrap.appendChild(removeBtn);

      wrap.insertBefore(rowWrap, addBtn);
      const entry = { getValue: item.getValue };
      rows.push(entry);
    }

    const addBtn = el("button", "editor-add-btn", addLabel || "+ 항목 추가");
    addBtn.type = "button";
    addBtn.addEventListener("click", () => addRow(createNew()));

    wrap.appendChild(addBtn);
    (items || []).forEach(addRow);

    return { node: wrap, getValues: () => rows.map((r) => r.getValue()) };
  }

  // 문자열 목록(가치관·강점·학력 등)을 위한 간단한 한 줄 입력 목록
  function stringListEditor(items) {
    return listEditor(
      items,
      (value) => {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "field-input list-input";
        input.value = value || "";
        return { node: input, getValue: () => input.value };
      },
      () => "",
      "+ 항목 추가"
    );
  }

  // ── 섹션 빌더 ───────────────────────────────

  function buildSiteSection(site) {
    const wrap = section("사이트 정보");
    const name = field("이름", site.name);
    const role = field("직함", site.role);
    const tagline = field("한 줄 소개(히어로 문구)", site.tagline);
    const email = field("이메일", site.email);
    const heroImage = field("히어로 배경 이미지 경로", site.heroImage);
    [name, role, tagline, email, heroImage].forEach((f) => wrap.appendChild(f.node));

    return {
      node: wrap,
      getValue: () => ({
        name: name.getValue(),
        role: role.getValue(),
        tagline: tagline.getValue(),
        email: email.getValue(),
        heroImage: heroImage.getValue(),
      }),
    };
  }

  function buildNavSection(nav) {
    const wrap = section("상단 메뉴 (문구만 수정 가능)");
    const fields = nav.map((item) => field(item.href, item.label));
    fields.forEach((f) => wrap.appendChild(f.node));

    return {
      node: wrap,
      getValue: () => nav.map((item, i) => ({ label: fields[i].getValue(), href: item.href })),
    };
  }

  function buildAboutSection(about) {
    const wrap = section("상담사 소개");

    const intro = textareaField("소개 문단", about.intro, 4);
    const photo = field("프로필 사진 경로", about.photo);
    wrap.appendChild(intro.node);
    wrap.appendChild(photo.node);

    function subList(title, items) {
      wrap.appendChild(el("h3", "editor-subtitle", title));
      const editor = stringListEditor(items);
      wrap.appendChild(editor.node);
      return editor;
    }

    const values = subList("가치관", about.values);
    const strengths = subList("강점", about.strengths);
    const education = subList("학력", about.education);
    const certifications = subList("자격", about.certifications);
    const career = subList("경력", about.career);

    return {
      node: wrap,
      getValue: () => ({
        intro: intro.getValue(),
        photo: photo.getValue(),
        values: values.getValues().filter((v) => v.trim()),
        strengths: strengths.getValues().filter((v) => v.trim()),
        education: education.getValues().filter((v) => v.trim()),
        certifications: certifications.getValues().filter((v) => v.trim()),
        career: career.getValues().filter((v) => v.trim()),
      }),
    };
  }

  function buildActivitiesSection(activities) {
    const wrap = section("활동 (범주별 강의·집단상담 이력)");

    function renderItemsEditor(items) {
      return listEditor(
        items,
        (value) => {
          const row = el("div", "activity-item-row");
          const org = field("기관", value && value.org);
          const desc = field("설명", value && value.desc);
          org.node.classList.add("activity-item-field");
          desc.node.classList.add("activity-item-field");
          row.appendChild(org.node);
          row.appendChild(desc.node);
          return { node: row, getValue: () => ({ org: org.getValue(), desc: desc.getValue() }) };
        },
        () => ({ org: "", desc: "" }),
        "+ 활동 추가"
      );
    }

    const groupsEditor = listEditor(
      activities,
      (group) => {
        const box = el("div", "activity-group-box");
        const category = field("범주명", group && group.category);
        box.appendChild(category.node);
        const itemsEditor = renderItemsEditor((group && group.items) || []);
        box.appendChild(itemsEditor.node);
        return {
          node: box,
          getValue: () => ({ category: category.getValue(), items: itemsEditor.getValues() }),
        };
      },
      () => ({ category: "", items: [] }),
      "+ 범주 추가"
    );

    wrap.appendChild(groupsEditor.node);

    return { node: wrap, getValue: () => groupsEditor.getValues() };
  }

  function buildApproachSection(content) {
    const wrap = section("주 상담기법");
    const intro = textareaField("소개 문구", content.approachIntro, 3);
    wrap.appendChild(intro.node);

    const cardsEditor = listEditor(
      content.approaches,
      (card) => {
        const box = el("div", "approach-card-box");
        const title = field("이름", card && card.title);
        const tag = selectField("분류", (card && card.tag) || "이해의 축", ["이해의 축", "변화의 도구"]);
        const summary = textareaField("설명", card && card.summary, 2);
        box.appendChild(title.node);
        box.appendChild(tag.node);
        box.appendChild(summary.node);
        box.appendChild(el("h3", "editor-subtitle", "장점"));
        const merits = stringListEditor((card && card.merits) || []);
        box.appendChild(merits.node);
        return {
          node: box,
          getValue: () => ({
            title: title.getValue(),
            tag: tag.getValue(),
            summary: summary.getValue(),
            merits: merits.getValues().filter((v) => v.trim()),
          }),
        };
      },
      () => ({ title: "", tag: "이해의 축", summary: "", merits: [] }),
      "+ 상담기법 추가"
    );
    wrap.appendChild(cardsEditor.node);

    return {
      node: wrap,
      getValue: () => ({ approachIntro: intro.getValue(), approaches: cardsEditor.getValues() }),
    };
  }

  function buildWorksSection(works) {
    const wrap = section("연구 및 칼럼");

    const editor = listEditor(
      works,
      (item) => {
        const box = el("div", "activity-group-box");
        const title = field("제목", item && item.title);
        const type = field("분류(챗봇/연구/칼럼 등)", item && item.type);
        const summary = textareaField("소개", item && item.summary, 2);
        const link = field("외부 링크(없으면 비워두기)", item && item.link);
        [title, type, summary, link].forEach((f) => box.appendChild(f.node));
        return {
          node: box,
          getValue: () => ({
            title: title.getValue(),
            type: type.getValue(),
            summary: summary.getValue(),
            link: link.getValue(),
          }),
        };
      },
      () => ({ title: "", type: "", summary: "", link: "" }),
      "+ 항목 추가"
    );
    wrap.appendChild(editor.node);

    return { node: wrap, getValue: () => editor.getValues() };
  }

  function buildContactSection(contact) {
    const wrap = section("문의 안내 문구");
    const note = textareaField("안내 문구", contact.note, 3);
    wrap.appendChild(note.node);
    return { node: wrap, getValue: () => ({ note: note.getValue() }) };
  }

  function buildFooterSection(footer) {
    const wrap = section("푸터");
    const copyright = field("저작권 문구", footer.copyright);
    wrap.appendChild(copyright.node);
    return { node: wrap, getValue: () => ({ copyright: copyright.getValue() }) };
  }

  // ── 전체 에디터 조립 ─────────────────────────

  function renderEditor(content) {
    const root = document.getElementById("editorRoot");
    root.innerHTML = "";

    const siteS = buildSiteSection(content.site);
    const navS = buildNavSection(content.nav);
    const aboutS = buildAboutSection(content.about);
    const activitiesS = buildActivitiesSection(content.activities || []);
    const approachS = buildApproachSection(content);
    const worksS = buildWorksSection(content.works || []);
    const contactS = buildContactSection(content.contact || {});
    const footerS = buildFooterSection(content.footer || {});

    [siteS, navS, aboutS, activitiesS, approachS, worksS, contactS, footerS].forEach((s) =>
      root.appendChild(s.node)
    );

    return () => ({
      site: siteS.getValue(),
      nav: navS.getValue(),
      about: aboutS.getValue(),
      activities: activitiesS.getValue(),
      approachIntro: approachS.getValue().approachIntro,
      approaches: approachS.getValue().approaches,
      works: worksS.getValue(),
      contact: contactS.getValue(),
      footer: footerS.getValue(),
    });
  }

  // ── 로그인 / 세션 / 저장 흐름 ─────────────────

  const loginScreen = document.getElementById("loginScreen");
  const editorScreen = document.getElementById("editorScreen");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const loginSubmit = document.getElementById("loginSubmit");
  const saveBtn = document.getElementById("saveBtn");
  const saveStatus = document.getElementById("saveStatus");
  const logoutBtn = document.getElementById("logoutBtn");

  let collectContent = null;

  function showLogin() {
    loginScreen.hidden = false;
    editorScreen.hidden = true;
  }

  async function showEditor() {
    loginScreen.hidden = true;
    editorScreen.hidden = false;
    saveStatus.textContent = "불러오는 중...";
    try {
      const res = await fetch("/api/content", { cache: "no-store" });
      const content = await res.json();
      collectContent = renderEditor(content);
      saveStatus.textContent = "";
    } catch (err) {
      saveStatus.textContent = "콘텐츠를 불러오지 못했습니다. 새로고침해 주세요.";
    }
  }

  async function checkSession() {
    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      if (data.authenticated) {
        await showEditor();
      } else {
        showLogin();
      }
    } catch (err) {
      showLogin();
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.hidden = true;
    loginSubmit.disabled = true;
    loginSubmit.textContent = "확인 중...";

    const password = document.getElementById("loginPassword").value;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        loginForm.reset();
        await showEditor();
      } else {
        loginError.textContent = data.error || "로그인에 실패했습니다.";
        loginError.hidden = false;
      }
    } catch (err) {
      loginError.textContent = "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
      loginError.hidden = false;
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = "로그인";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    showLogin();
  });

  saveBtn.addEventListener("click", async () => {
    if (!collectContent) return;
    saveBtn.disabled = true;
    saveStatus.textContent = "저장 중...";
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectContent()),
      });
      if (res.ok) {
        saveStatus.textContent = "저장되었습니다. 사이트에 바로 반영됩니다.";
      } else if (res.status === 401) {
        saveStatus.textContent = "로그인이 만료되었습니다. 새로고침 후 다시 로그인해 주세요.";
      } else {
        const data = await res.json().catch(() => ({}));
        saveStatus.textContent = data.error || "저장에 실패했습니다.";
      }
    } catch (err) {
      saveStatus.textContent = "저장 중 오류가 발생했습니다.";
    } finally {
      saveBtn.disabled = false;
    }
  });

  checkSession();
})();
