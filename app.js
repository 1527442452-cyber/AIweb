const shell = document.querySelector(".page-shell");
const navItems = [...document.querySelectorAll(".nav-item")];
const counter = document.querySelector("[data-counter-active]");
const copyPanel = document.querySelector(".copy-panel");
const copyEyebrow = document.querySelector("[data-copy-eyebrow]");
const titleLines = [...document.querySelectorAll("[data-title-line]")];
const copyBody = document.querySelector("[data-copy-body]");
const copyCta = document.querySelector("[data-copy-cta]");
const visualArt = document.querySelector(".visual-stage__art");
const visualImpact = document.querySelector(".visual-stage__impact");
const visualCode = document.querySelector("[data-visual-code]");
const visualLabel = document.querySelector("[data-visual-label]");
const caption = document.querySelector("[data-caption]");
const moreLink = document.querySelector(".more-link");
const helpRibbon = document.querySelector("[data-help-open]");
const note = document.querySelector(".interaction-note");
const detailView = document.querySelector("[data-detail-view]");
const detailClose = document.querySelector("[data-detail-close]");
const detailIndex = document.querySelector("[data-detail-index]");
const detailCode = document.querySelector("[data-detail-code]");
const detailEyebrow = document.querySelector("[data-detail-eyebrow]");
const detailTitleLines = [
  ...document.querySelectorAll("[data-detail-title-line]"),
];
const detailLede = document.querySelector("[data-detail-lede]");
const detailBlock = document.querySelector(".detail-block");
const detailServices = document.querySelector("[data-detail-services]");
const detailMeta = document.querySelector("[data-detail-meta]");
const detailAction = document.querySelector("[data-detail-action]");
const detailActionLabel = document.querySelector("[data-detail-action-label]");
const detailFooter = document.querySelector("[data-detail-footer]");
const detailApp = document.querySelector("[data-detail-app]");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

const store = window.NEXUS_STORE;
const engine = window.NEXUS_ENGINE;

const sections = {
  home: {
    index: "01",
    eyebrow: "NEXUS / 行动中心",
    title: ["把模糊目标", "拆成每天", "能做的事"],
    cta: "进入行动中心",
    visualLabel: "行动 / 实时",
  },
  projects: {
    index: "02",
    eyebrow: "项目 / 控制台",
    title: ["项目进度", "风险与任务", "集中管理"],
    cta: "查看所有项目",
    visualLabel: "项目 / 总览",
  },
  about: {
    index: "03",
    eyebrow: "目标 / 路线图",
    title: ["先定目标", "再让项目", "持续向前"],
    cta: "管理目标",
    visualLabel: "目标 / 系统",
  },
  blog: {
    index: "04",
    eyebrow: "复盘 / 记录",
    title: ["做完项目", "留下经验", "进入复盘"],
    cta: "查看项目复盘",
    visualLabel: "复盘 / 档案",
  },
  contact: {
    index: "05",
    eyebrow: "AI / 分析室",
    title: ["先让 AI", "质疑想法", "再开始开发"],
    cta: "进入 AI 分析室",
    visualLabel: "AI / 质疑",
  },
  help: {
    index: "06",
    eyebrow: "NEXUS / 使用教学",
    title: ["三步上手", "从目标到", "今日行动"],
    cta: "开始使用",
    visualLabel: "帮助 / 流程",
  },
};

const uiState = {
  page: "home",
  projectId: null,
  projectFilter: "active",
  objectiveId: null,
  missionEditorId: null,
  missionCreateOpen: false,
  objectiveCreateOpen: false,
  projectCreateOpen: false,
  breakdownOpen: false,
  analysis: null,
  planPreview: null,
  criticalResult: null,
  criticalSource: "",
  criticalRound: 1,
  review: null,
};

let activeSection = "home";
let noteTimer = 0;
let transitionToken = 0;
let hoverTimer = 0;
let detailTimer = 0;
let detailReturnFocus = null;
let visualGhost = null;
let visualGhostAnimation = null;

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value).replaceAll("\n", " ");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function percent(value) {
  return `${clamp(Math.round(Number(value) || 0), 0, 100)}%`;
}

function priorityLabel(value) {
  return (
    {
      low: "低优先级",
      medium: "中优先级",
      high: "高优先级",
      critical: "紧急",
    }[value] || value
  );
}

function riskLabel(value) {
  return (
    {
      low: "低风险",
      medium: "中风险",
      high: "高风险",
      critical: "严重风险",
    }[value] || value
  );
}

function statusLabel(value) {
  return (
    {
      active: "进行中",
      paused: "已暂停",
      completed: "已完成",
      pending: "待开始",
      in_progress: "进行中",
      overdue: "已延期",
    }[value] || value
  );
}

function noticeLevelLabel(value) {
  return (
    {
      info: "提示",
      warning: "注意",
      critical: "紧急",
      high: "重要",
      medium: "提醒",
      low: "信息",
    }[value] || value
  );
}

function remainingLabel(value, status = "") {
  if (status === "completed") return "已完成";
  if (status === "paused") return "已暂停";
  const days = store.daysRemaining(value);
  if (days < 0) return `已延期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天截止";
  return `剩余 ${days} 天`;
}

function formatMinutes(minutes) {
  const safe = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (!hours) return `${rest} 分钟`;
  if (!rest) return `${hours} 小时`;
  return `${hours} 小时 ${rest} 分钟`;
}

function formatDate(value) {
  const date = store.parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return "未设置日期";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value) {
  const date = store.parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return "未设置时间";
  return new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function currentState() {
  return store.getState();
}

function getPreview(key) {
  const state = currentState();
  const dashboard = engine.getDashboard(state);
  const base = sections[key];
  if (key === "home") {
    const objective =
      dashboard.activeObjective?.title || "还没有进行中的目标";
    const remaining = dashboard.activeObjective
      ? remainingLabel(dashboard.activeObjective.deadline)
      : "先创建一个目标";
    return {
      ...base,
      body: `${escapeHTML(objective)}<br />${remaining} · 当前项目完成度 ${dashboard.primaryProject?.progress ?? 0}%`,
    };
  }
  if (key === "projects") {
    return {
      ...base,
      body: `${dashboard.activeProjectCount} 个进行中项目<br />今日安排 ${dashboard.today.length} 个任务`,
    };
  }
  if (key === "about") {
    const active = state.objectives.filter(
      (objective) => objective.status === "active",
    ).length;
    return {
      ...base,
      body: `${active} 个进行中目标<br />关联 ${state.projects.length} 个项目`,
    };
  }
  if (key === "blog") {
    const completed = state.projects.filter(
      (project) => project.status === "completed",
    ).length;
    return {
      ...base,
      body: `${completed} 个已归档项目<br />保存 ${state.reviews.length} 份 AI 复盘`,
    };
  }
  return {
    ...base,
    body: "让 AI 先质疑项目想法<br />再把有效建议变成可执行计划",
  };
}

function showNote(message) {
  window.clearTimeout(noteTimer);
  note.textContent = message;
  note.classList.remove("is-visible");
  void note.offsetWidth;
  note.classList.add("is-visible");

  noteTimer = window.setTimeout(() => {
    note.classList.remove("is-visible");
  }, prefersReducedMotion.matches ? 500 : 1650);
}

function syncHelpRibbon() {
  const helpSeen = Boolean(currentState().settings.helpSeen);
  shell.dataset.help = helpSeen ? "collapsed" : "expanded";
  helpRibbon.setAttribute(
    "aria-label",
    helpSeen ? "打开使用帮助" : "查看使用帮助",
  );
}

function paintCopy(key) {
  const section = getPreview(key);
  copyEyebrow.textContent = section.eyebrow;
  titleLines.forEach((line, index) => {
    line.textContent = section.title[index];
  });
  copyBody.innerHTML = section.body;
  copyCta.textContent = section.cta;
  counter.textContent = section.index;
  document.title = `NEXUS / ${section.eyebrow}`;
}

function paintVisual(key) {
  const section = sections[key];
  visualCode.textContent = section.index;
  visualLabel.textContent = section.visualLabel;
  caption.textContent = `VISUAL / ${section.index}`;
  shell.dataset.active = key;
  visualArt.dataset.visual = key;
}

function replayVisualMeta() {
  visualImpact.classList.remove("is-switching");
  caption.classList.remove("is-updating");
  void visualImpact.offsetWidth;
  visualImpact.classList.add("is-switching");
  caption.classList.add("is-updating");

  window.setTimeout(() => {
    visualImpact.classList.remove("is-switching");
    caption.classList.remove("is-updating");
  }, prefersReducedMotion.matches ? 0 : 760);
}

function createVisualGhost() {
  if (visualGhostAnimation) {
    visualGhostAnimation.cancel();
    visualGhostAnimation = null;
  }
  if (visualGhost) {
    visualGhost.remove();
    visualGhost = null;
  }

  const artStyle = getComputedStyle(visualArt);
  const image = visualArt.querySelector("img");
  const imageStyle = getComputedStyle(image);
  const ghost = visualArt.cloneNode(true);

  ghost.classList.remove("is-entering", "is-leaving", "is-active");
  ghost.classList.add("is-ghost");
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.clipPath = artStyle.clipPath;
  ghost.style.filter = artStyle.filter;
  ghost.style.opacity = artStyle.opacity;
  ghost.style.transform = artStyle.transform;
  ghost.style.transition = "none";

  const ghostImage = ghost.querySelector("img");
  ghostImage.style.objectPosition = imageStyle.objectPosition;
  ghostImage.style.transform = imageStyle.transform;
  ghostImage.style.transition = "none";

  visualArt.parentElement.insertBefore(ghost, visualArt);
  visualGhost = ghost;

  const exit = ghost.animate(
    [
      {
        opacity: Number(artStyle.opacity),
        transform: artStyle.transform,
        offset: 0,
      },
      {
        opacity: 0.42,
        transform: `${artStyle.transform} translate3d(-6%, 3%, -120px) rotateY(-17deg) rotateZ(-2deg) scale(0.94)`,
        offset: 0.62,
      },
      {
        opacity: 0,
        transform: `${artStyle.transform} translate3d(-11%, 5%, -260px) rotateY(-34deg) rotateZ(-4deg) scale(0.84)`,
        offset: 1,
      },
    ],
    {
      duration: prefersReducedMotion.matches ? 1 : 880,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    },
  );

  visualGhostAnimation = exit;
  exit
    .finished.then(() => {
      if (visualGhost !== ghost) return;
      ghost.remove();
      visualGhost = null;
      visualGhostAnimation = null;
    })
    .catch(() => {});
}

function playVisualIn() {
  visualArt.classList.remove("is-entering");
  void visualArt.offsetWidth;
  visualArt.classList.add("is-entering");

  const token = transitionToken;
  window.setTimeout(() => {
    if (token === transitionToken) {
      visualArt.classList.remove("is-entering");
    }
  }, prefersReducedMotion.matches ? 0 : 920);
}

function replayContentIn() {
  copyPanel.classList.remove("is-entering");
  void copyPanel.offsetWidth;
  copyPanel.classList.add("is-entering");

  window.setTimeout(() => {
    copyPanel.classList.remove("is-entering");
  }, prefersReducedMotion.matches ? 0 : 720);
}

function activateSection(key, button, { announce = false } = {}) {
  if (key === activeSection) {
    if (announce) showNote(`${sections[key]?.eyebrow || "当前栏目"} / 当前`);
    return;
  }

  activeSection = key;
  const token = ++transitionToken;

  navItems.forEach((item) => {
    const isActive = item === button;
    item.classList.toggle("is-active", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  if (prefersReducedMotion.matches) {
    paintCopy(key);
    paintVisual(key);
    replayContentIn();
    replayVisualMeta();
    if (announce) showNote(`${sections[key]?.eyebrow || "当前栏目"} / 预览`);
    return;
  }

  copyPanel.classList.add("is-switching");
  createVisualGhost();
  paintVisual(key);
  playVisualIn();
  replayVisualMeta();

  window.setTimeout(() => {
    if (token !== transitionToken) return;
    paintCopy(key);
    copyPanel.classList.remove("is-switching");
    replayContentIn();
    if (announce) showNote(`${sections[key]?.eyebrow || "当前栏目"} / 预览`);
  }, 150);
}

function projectStatusLabel(project) {
  const days = store.daysRemaining(project.deadline);
  if (project.status === "completed") return "已完成";
  if (project.status === "paused") return "已暂停";
  if (days < 0) return "已延期";
  return remainingLabel(project.deadline);
}

function missionStatusLabel(mission) {
  const status = engine.getMissionState(mission);
  return statusLabel(status);
}

function metric(label, value, meta = "") {
  return `
    <div class="app-metric">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
      ${meta ? `<small>${escapeHTML(meta)}</small>` : ""}
    </div>
  `;
}

function progressBar(value, level = "") {
  return `
    <span class="app-progress ${level ? `is-${escapeAttr(level)}` : ""}" aria-label="${escapeAttr(percent(value))}">
      <i style="width:${escapeAttr(percent(value))}"></i>
    </span>
  `;
}

function sectionHead(kicker, title, action = "") {
  return `
    <div class="app-section__head">
      <div>
        <span>${escapeHTML(kicker)}</span>
        <h3>${escapeHTML(title)}</h3>
      </div>
      ${action}
    </div>
  `;
}

function missionRow(mission, options = {}) {
  const status = engine.getMissionState(mission);
  const interactive = options.interactive !== false;
  const compact = Boolean(options.compact);
  const isEditing = uiState.missionEditorId === mission.id;
  const state = currentState();
  const project = state.projects.find((item) => item.id === mission.projectId);
  const milestone = state.milestones.find(
    (item) => item.id === mission.milestoneId,
  );

  if (isEditing && interactive) {
    const milestoneOptions = engine
      .getProjectMilestones(state, mission.projectId)
      .map(
        (item) => `
          <option value="${escapeAttr(item.id)}" ${
            item.id === mission.milestoneId ? "selected" : ""
          }>${escapeHTML(item.title)}</option>
        `,
      )
      .join("");
    return `
      <form class="app-mission app-mission--editor" data-form="mission-update">
        <input type="hidden" name="id" value="${escapeAttr(mission.id)}" />
        <label class="app-field app-field--wide">
          <span>任务名称</span>
          <input name="title" value="${escapeAttr(mission.title)}" required maxlength="100" />
        </label>
        <label class="app-field app-field--wide">
          <span>任务说明</span>
          <textarea name="description" rows="3" maxlength="500">${escapeHTML(mission.description || "")}</textarea>
        </label>
        <label class="app-field">
          <span>截止日期</span>
          <input name="deadline" type="date" value="${escapeAttr(mission.deadline)}" required />
        </label>
        <label class="app-field">
          <span>预计耗时（分钟）</span>
          <input name="estimatedMinutes" type="number" min="5" step="5" value="${escapeAttr(mission.estimatedMinutes)}" required />
        </label>
        <label class="app-field">
          <span>优先级</span>
          <select name="priority">
            ${["low", "medium", "high", "critical"]
              .map(
                (priority) =>
                  `<option value="${priority}" ${
                    priority === mission.priority ? "selected" : ""
                  }>${priorityLabel(priority)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="app-field">
          <span>状态</span>
          <select name="status">
            ${["pending", "in_progress", "completed"]
              .map(
                (item) =>
                  `<option value="${item}" ${
                    item === mission.status ? "selected" : ""
                  }>${statusLabel(item)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="app-field app-field--wide">
          <span>所属阶段</span>
          <select name="milestoneId">${milestoneOptions}</select>
        </label>
        <div class="app-form__actions">
          <button class="app-button app-button--solid" type="submit">保存任务</button>
          <button class="app-button" type="button" data-action="cancel-mission-edit">取消</button>
        </div>
      </form>
    `;
  }

  return `
    <article class="app-mission ${status === "completed" ? "is-complete" : ""} ${status === "overdue" ? "is-overdue" : ""}">
      <button
        class="app-check"
        type="button"
        ${interactive ? `data-action="toggle-mission" data-id="${escapeAttr(mission.id)}"` : "disabled"}
        aria-label="${status === "completed" ? "取消完成" : "标记任务完成"}"
      >
        <span class="app-check__box" aria-hidden="true"></span>
        <span class="app-check__label">${status === "completed" ? "已完成" : "完成"}</span>
      </button>
      <div class="app-mission__body">
        <div class="app-mission__topline">
          <span>${escapeHTML(milestone?.title || "未分配阶段")}</span>
          <span class="is-${escapeAttr(status)}">${escapeHTML(missionStatusLabel(mission))}</span>
        </div>
        <strong>${escapeHTML(mission.title)}</strong>
        ${compact ? "" : `<p>${escapeHTML(mission.description || "未填写任务说明")}</p>`}
        <small>
          ${escapeHTML(formatDate(mission.deadline))}
          / ${escapeHTML(priorityLabel(mission.priority))}
          / ${escapeHTML(formatMinutes(mission.estimatedMinutes))}
          ${project ? `/ ${escapeHTML(project.title)}` : ""}
        </small>
      </div>
      ${
        interactive
          ? `
            <div class="app-mission__actions">
              <button type="button" data-action="edit-mission" data-id="${escapeAttr(mission.id)}">编辑</button>
              <button type="button" data-action="delete-mission" data-id="${escapeAttr(mission.id)}">删除</button>
            </div>
          `
          : ""
      }
    </article>
  `;
}

function objectiveList(state) {
  if (!state.objectives.length) {
    return `<div class="app-empty">还没有目标。先创建一个目标，再把目标交给 AI 拆解成项目。</div>`;
  }
  return state.objectives
    .map((objective) => {
      const projectCount = objective.projectIds.filter((id) =>
        state.projects.some((project) => project.id === id),
      ).length;
      return `
        <article class="app-objective">
          <div class="app-objective__top">
            <div>
              <span>${escapeHTML(statusLabel(objective.status))} / 目标</span>
              <h4>${escapeHTML(objective.title)}</h4>
            </div>
            <strong>${objective.progress}%</strong>
          </div>
          <p>${escapeHTML(objective.description || "未填写目标说明")}</p>
          ${progressBar(objective.progress, objective.status)}
          <div class="app-objective__meta">
            <span>${escapeHTML(formatDate(objective.deadline))}</span>
            <span>${escapeHTML(remainingLabel(objective.deadline, objective.status))}</span>
            <span>关联 ${projectCount} 个项目</span>
          </div>
          <button
            class="app-button app-button--solid"
            type="button"
            data-action="create-project-for-objective"
            data-id="${escapeAttr(objective.id)}"
          >用 AI 创建项目</button>
        </article>
      `;
    })
    .join("");
}

function renderCommandCenter(state) {
  const dashboard = engine.getDashboard(state);
  const objective = dashboard.activeObjective;
  const project = dashboard.primaryProject;
  const targetProjectId = project ? escapeAttr(project.id) : "";
  return `
    <section class="app-section">
      <div class="app-guide" aria-label="使用步骤">
        <div>
          <span>01</span>
          <strong>创建目标</strong>
          <small>写下你最终想完成的结果和截止时间。</small>
        </div>
        <div>
          <span>02</span>
          <strong>让 AI 拆成任务</strong>
          <small>系统自动生成项目阶段、任务、优先级和预计耗时。</small>
        </div>
        <div>
          <span>03</span>
          <strong>完成今日任务</strong>
          <small>点击任务左侧“完成”，项目进度和风险会自动更新。</small>
        </div>
      </div>

      <div class="app-metrics">
        ${metric("当前目标", objective?.title || "暂无目标", objective ? remainingLabel(objective.deadline) : "先创建一个目标")}
        ${metric("剩余时间", objective ? remainingLabel(objective.deadline) : "--")}
        ${metric("项目进度", `${project?.progress ?? 0}%`, project?.title || "暂无项目")}
        ${metric("进行中项目", String(dashboard.activeProjectCount), `今日 ${dashboard.today.length} 个任务`)}
        ${metric("项目风险", riskLabel(dashboard.risk.level), dashboard.risk.reason)}
        ${metric("AI 状态", state.aiReports.length ? "已分析" : "可用", dashboard.notifications[0]?.message || "当前数据正常")}
      </div>

      <div class="app-primary-actions">
        <button class="app-button app-button--solid" type="button" data-action="new-objective">+ 创建目标</button>
        <button class="app-button" type="button" data-action="new-project">+ AI 创建项目</button>
        ${
          project
            ? `<button class="app-button" type="button" data-action="add-mission-from-dashboard" data-id="${targetProjectId}">+ 添加任务</button>`
            : ""
        }
      </div>

      ${
        objective
          ? `
            <div class="app-focus">
              <div class="app-focus__head">
                <span>主目标</span>
                <strong>${escapeHTML(remainingLabel(objective.deadline, objective.status))}</strong>
              </div>
              <h3>${escapeHTML(objective.title)}</h3>
              <p>${escapeHTML(objective.description || "未填写目标说明")}</p>
              ${progressBar(objective.progress)}
              <div class="app-focus__footer">
                <span>已完成 ${objective.progress}%</span>
                <span>${escapeHTML(formatDate(objective.deadline))}</span>
              </div>
              ${
                project
                  ? `<button class="app-button app-button--solid" type="button" data-action="open-project" data-id="${targetProjectId}">进入项目详情，添加或完成任务</button>`
                  : ""
              }
            </div>
          `
          : `<div class="app-empty">还没有目标。先在下方创建一个目标。</div>`
      }

      <div class="app-two-col">
        <div>
          ${sectionHead(
            "今日行动",
            `优先任务 / ${dashboard.todayLoad}`,
          )}
          <div class="app-list">
            ${
              dashboard.today.length
                ? dashboard.today
                    .map((mission, index) =>
                      missionRow(
                        { ...mission, title: `${String(index + 1).padStart(2, "0")} ${mission.title}` },
                        { compact: true },
                      ),
                    )
                    .join("")
                : `<div class="app-empty">今天没有待执行任务。</div>`
            }
          </div>
        </div>
        <div>
          ${sectionHead("风险信号", "AI 分析")}
          <div class="app-analysis">
            <strong>${escapeHTML(riskLabel(dashboard.risk.level))}</strong>
            <p>${escapeHTML(dashboard.risk.reason)}</p>
            <ul>
              ${dashboard.risk.suggestions
                .map((item) => `<li>${escapeHTML(item)}</li>`)
                .join("")}
            </ul>
            ${
              project
                ? `<button class="app-button" type="button" data-action="analyze-project" data-id="${targetProjectId}">重新分析风险</button>`
                : ""
            }
          </div>
        </div>
      </div>

      ${
        dashboard.notifications.length
          ? `
            <div class="app-notifications">
              ${dashboard.notifications
                .map(
                  (item) => `
                    <div>
                      <span>${escapeHTML(noticeLevelLabel(item.level))}</span>
                      <strong>${escapeHTML(item.title)}</strong>
                      <small>${escapeHTML(item.message)}</small>
                    </div>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }

      <div class="app-actions">
        <button class="app-button app-button--solid" type="button" data-action="new-project">用 AI 创建项目</button>
        <button class="app-button" type="button" data-action="open-projects">查看所有项目</button>
      </div>
    </section>
  `;
}

function renderProjects(state) {
  const filtered = state.projects.filter(
    (project) => project.status === uiState.projectFilter,
  );
  const counts = {
    active: state.projects.filter((project) => project.status === "active").length,
    paused: state.projects.filter((project) => project.status === "paused").length,
    completed: state.projects.filter((project) => project.status === "completed")
      .length,
  };
  return `
    <section class="app-section">
      ${sectionHead(
        "项目总览",
        `${filtered.length} 个${statusLabel(uiState.projectFilter)}项目`,
        `<button class="app-button app-button--solid" type="button" data-action="new-project">+ AI 创建项目</button>`,
      )}
      <div class="app-segmented">
        ${["active", "paused", "completed"]
          .map(
            (status) => `
              <button
                class="${status === uiState.projectFilter ? "is-active" : ""}"
                type="button"
                data-action="project-filter"
                data-filter="${status}"
              >${statusLabel(status)} / ${counts[status]}</button>
            `,
          )
          .join("")}
      </div>

      ${
        uiState.projectCreateOpen
          ? renderProjectCreateForm(state)
          : ""
      }

      <div class="app-projects">
        ${
          filtered.length
            ? filtered
                .map((project) => {
                  const stats = engine.calculateProjectProgress(
                    state,
                    project.id,
                  );
                  const risk = engine.calculateRisk(state, project);
                  return `
                    <article class="app-project">
                      <button
                        class="app-project__hit"
                        type="button"
                        data-action="open-project"
                        data-id="${escapeAttr(project.id)}"
                        aria-label="打开项目：${escapeAttr(project.title)}"
                      ></button>
                      <div class="app-project__top">
                        <div>
                          <span>${escapeHTML(priorityLabel(project.priority))} / ${escapeHTML(statusLabel(project.status))}</span>
                          <h4>${escapeHTML(project.title)}</h4>
                        </div>
                        <strong>${project.progress}%</strong>
                      </div>
                      <p>${escapeHTML(project.description || "未填写项目说明")}</p>
                      ${progressBar(project.progress, risk.level)}
                      <div class="app-project__stats">
                        <span>${escapeHTML(projectStatusLabel(project))}</span>
                        <span>已完成 ${stats.completed} / ${stats.total} 个任务</span>
                        <span class="is-${escapeAttr(risk.level)}">${escapeHTML(riskLabel(risk.level))}</span>
                        <span>${escapeHTML(formatDate(project.deadline))}</span>
                      </div>
                    </article>
                  `;
              })
              .join("")
            : `<div class="app-empty">当前没有${statusLabel(uiState.projectFilter)}项目。点击右上角创建新项目。</div>`
      }
      </div>
    </section>
  `;
}

function renderProjectCreateForm(state) {
  const objectiveOptions = state.objectives
    .map(
      (objective) => `
        <option value="${escapeAttr(objective.id)}" ${
          objective.id === uiState.objectiveId ? "selected" : ""
        }>${escapeHTML(objective.title)}</option>
      `,
    )
    .join("");
  return `
    <form class="app-form app-form--create" data-form="create-project">
      ${sectionHead("自然语言输入", "用 AI 创建项目")}
      <label class="app-field app-field--wide">
        <span>你想在多长时间内完成什么？</span>
        <textarea
          name="prompt"
          rows="4"
          required
          placeholder="例如：我想在 20 天后完成一个校园 AI 项目参加比赛。"
        ></textarea>
      </label>
      <label class="app-field app-field--wide">
        <span>关联已有目标（可选）</span>
        <select name="objectiveId">
          <option value="">同时创建一个新目标</option>
          ${objectiveOptions}
        </select>
      </label>
      <div class="app-form__actions">
        <button class="app-button app-button--solid" type="submit">生成完整项目计划</button>
        <button class="app-button" type="button" data-action="cancel-project-create">取消</button>
      </div>
    </form>
  `;
}

function renderTargets(state) {
  return `
    <section class="app-section">
      ${sectionHead(
        "目标路线图",
        "目标管理",
        `<button class="app-button app-button--solid" type="button" data-action="new-objective">+ 创建目标</button>`,
      )}
      ${
        uiState.objectiveCreateOpen
          ? `
            <form class="app-form app-form--create" data-form="create-objective">
              ${sectionHead("新目标", "定义想完成的结果")}
              <label class="app-field app-field--wide">
                <span>目标名称</span>
                <input name="title" required maxlength="100" />
              </label>
              <label class="app-field app-field--wide">
                <span>目标说明</span>
                <textarea name="description" rows="3" maxlength="240"></textarea>
              </label>
              <label class="app-field">
                <span>截止日期</span>
                <input name="deadline" type="date" value="${escapeAttr(store.addDays(new Date(), 30))}" required />
              </label>
              <div class="app-form__actions">
                <button class="app-button app-button--solid" type="submit">创建目标</button>
                <button class="app-button" type="button" data-action="cancel-objective-create">取消</button>
              </div>
            </form>
          `
          : ""
      }
      <div class="app-objectives">${objectiveList(state)}</div>
    </section>
  `;
}

function renderArchive(state) {
  const projects = state.projects.filter(
    (project) => project.status === "completed" || state.reviews.some((review) => review.projectId === project.id),
  );
  return `
    <section class="app-section">
      ${sectionHead(
        "项目记忆与复盘",
        "项目档案",
        `<button class="app-button" type="button" data-action="reset-demo">恢复演示数据</button>`,
      )}
      ${
        projects.length
          ? projects
              .map((project) => {
                const review = state.reviews.find(
                  (item) => item.projectId === project.id,
                );
                const archive = engine.archiveReview(state, project.id);
                return `
                  <article class="app-archive">
                    <div class="app-archive__top">
                      <div>
                        <span>归档于 ${escapeHTML(formatDate(archive.completedAt))}</span>
                        <h4>${escapeHTML(project.title)}</h4>
                      </div>
                      <strong>${review?.total ?? archive.aiScore}<small>AI 评分</small></strong>
                    </div>
                    <div class="app-metrics app-metrics--compact">
                      ${metric("最终进度", `${archive.finalProgress}%`)}
                      ${metric("完成任务", String(archive.completedMissions))}
                      ${metric("延期任务", String(archive.overdueMissions))}
                      ${metric("项目周期", `${archive.durationDays} 天`)}
                    </div>
                    ${
                      review
                        ? `
                          <div class="app-review">
                            <p>${escapeHTML(review.conclusion)}</p>
                            <dl>
                              <div><dt>创新性</dt><dd>${review.scores.innovation}</dd></div>
                              <div><dt>技术实现</dt><dd>${review.scores.technology}</dd></div>
                              <div><dt>实用价值</dt><dd>${review.scores.practicalValue}</dd></div>
                              <div><dt>用户体验</dt><dd>${review.scores.userExperience}</dd></div>
                              <div><dt>展示表达</dt><dd>${review.scores.presentation}</dd></div>
                            </dl>
                          </div>
                        `
                        : `<button class="app-button app-button--solid" type="button" data-action="generate-review" data-id="${escapeAttr(project.id)}">生成 AI 复盘</button>`
                    }
                    <div class="app-reflections">
                      <div>
                        <span>做得好的地方</span>
                        ${archive.whatWentWell.map((item) => `<p>${escapeHTML(item)}</p>`).join("")}
                      </div>
                      <div>
                        <span>出现的问题</span>
                        ${archive.whatWentWrong.map((item) => `<p>${escapeHTML(item)}</p>`).join("")}
                      </div>
                      <div>
                        <span>得到的经验</span>
                        ${archive.whatYouLearned.map((item) => `<p>${escapeHTML(item)}</p>`).join("")}
                      </div>
                      <div>
                        <span>下一次建议</span>
                        <p>${escapeHTML(archive.nextRecommendation)}</p>
                      </div>
                    </div>
                  </article>
                `;
              })
              .join("")
          : `<div class="app-empty">还没有归档项目。完成项目后，这里会自动保存复盘。</div>`
      }
      <div class="app-actions">
        <button class="app-button" type="button" data-action="clear-data">清空所有用户数据</button>
      </div>
    </section>
  `;
}

function renderAiStudio(state) {
  return `
    <section class="app-section">
      ${sectionHead("AI 反向质疑", "先检查想法，再开始开发")}
      <form class="app-form app-form--create" data-form="critical-analysis">
        <label class="app-field app-field--wide">
          <span>你的项目想法</span>
          <textarea
            name="idea"
            rows="4"
            required
            placeholder="例如：我要做一个校园失物招领网站。"
          >${escapeHTML(uiState.criticalSource)}</textarea>
        </label>
        <div class="app-form__actions">
          <button class="app-button app-button--solid" type="submit">开始质疑分析</button>
          ${
            uiState.criticalResult
              ? `<button class="app-button" type="button" data-action="regenerate-critique">重新生成分析</button>`
              : ""
          }
        </div>
      </form>
      ${
        uiState.criticalResult
          ? `
            <div class="app-ai-flow">
              <div>
                <span>当前想法</span>
                <p>${escapeHTML(uiState.criticalResult.currentIdea)}</p>
              </div>
              <div>
                <span>发现的问题</span>
                <ol>
                  ${uiState.criticalResult.problems
                    .map((item) => `<li>${escapeHTML(item)}</li>`)
                    .join("")}
                </ol>
              </div>
              <div>
                <span>AI 质疑 / 第 ${String(uiState.criticalRound).padStart(2, "0")} 轮</span>
                <p>${escapeHTML(uiState.criticalResult.critique)}</p>
              </div>
              <div class="is-solution">
                <span>改进后的想法</span>
                <p>${escapeHTML(uiState.criticalResult.improvedIdea)}</p>
              </div>
            </div>
            <div class="app-actions">
              <button class="app-button app-button--solid" type="button" data-action="accept-critique">接受建议并生成项目</button>
              <button class="app-button" type="button" data-action="new-project">改为手动创建项目</button>
            </div>
          `
          : `
            <div class="app-analysis app-analysis--intro">
              <strong>AI 不会直接赞同你的想法</strong>
              <p>AI 会检查问题真实性、目标用户、AI 必要性、替代方案、功能范围与当前时间可行性。</p>
              <ul>
                <li>输出问题、原因和改进方向。</li>
                <li>接受后直接生成可执行项目计划。</li>
                <li>所有判断都基于当前输入与时间约束。</li>
              </ul>
            </div>
          `
      }
    </section>
  `;
}

function renderProjectDetail(state) {
  const project = state.projects.find(
    (item) => item.id === uiState.projectId,
  );
  if (!project) {
    return `<div class="app-empty">没有找到这个项目，请返回项目列表。</div>`;
  }
  const stats = engine.calculateProjectProgress(state, project.id);
  const risk = engine.calculateRisk(state, project);
  const milestones = engine.getProjectMilestones(state, project.id);
  const missions = engine.getProjectMissions(state, project.id).sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    return store.parseDate(a.deadline) - store.parseDate(b.deadline);
  });
  const todayIds = new Set(
    engine
      .generateTodayMissions(state, { limit: 5 })
      .map((mission) => mission.id),
  );

  return `
    <section class="app-section app-project-detail">
      <div class="app-backline">
        <button type="button" data-action="open-projects">← 返回项目列表</button>
        <span>${escapeHTML(statusLabel(project.status))} / ${escapeHTML(priorityLabel(project.priority))}</span>
      </div>

      <div class="app-project-hero">
        <span>项目控制台 / ${escapeHTML(remainingLabel(project.deadline, project.status))}</span>
        <h3>${escapeHTML(project.title)}</h3>
        <p>${escapeHTML(project.description || "未填写项目说明")}</p>
      </div>

      <div class="app-primary-actions app-primary-actions--project">
        <button class="app-button app-button--solid" type="button" data-action="add-mission">+ 添加任务</button>
        <button class="app-button" type="button" data-action="breakdown-open">AI 拆解模糊任务</button>
        <button class="app-button" type="button" data-action="analyze-project" data-id="${escapeAttr(project.id)}">分析项目风险</button>
        <button class="app-button" type="button" data-action="optimize-project" data-id="${escapeAttr(project.id)}">优化当前计划</button>
      </div>

      <div class="app-metrics app-metrics--compact">
        ${metric("项目进度", `${project.progress}%`, `${stats.completed}/${stats.total} 个任务已完成`)}
        ${metric("风险等级", riskLabel(risk.level), `${risk.score} 风险分`)}
        ${metric("截止日期", formatDate(project.deadline), projectStatusLabel(project))}
        ${metric("未完成任务", `${stats.total - stats.completed}`, `${stats.overdue} 个已延期`)}
      </div>

      <div class="app-project-progress">${progressBar(project.progress, risk.level)}</div>

      ${sectionHead(
        "阶段路线图",
        "项目阶段",
        `<button class="app-button" type="button" data-action="add-phase">+ 添加阶段</button>`,
      )}
      <div class="app-milestones">
        ${milestones
          .map(
            (milestone, index) => `
              <article class="app-milestone is-${escapeAttr(milestone.status)}">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>${escapeHTML(milestone.title)}</strong>
                  <p>${escapeHTML(milestone.description || "未填写阶段说明")}</p>
                  <small>${escapeHTML(formatDate(milestone.deadline))} / ${milestone.progress}%</small>
                  ${progressBar(milestone.progress)}
                </div>
              </article>
            `,
          )
          .join("")}
      </div>

      ${sectionHead(
        "任务执行",
        `${missions.length} 个任务`,
        `<button class="app-button app-button--solid" type="button" data-action="add-mission">+ 添加任务</button>`,
      )}
      <p class="app-inline-hint">点击每个任务左侧的“完成”按钮即可更新阶段、项目和目标进度。</p>

      ${
        uiState.missionCreateOpen
          ? renderMissionCreateForm(state, project, milestones)
          : ""
      }
      ${
        uiState.breakdownOpen
          ? `
            <form class="app-form app-form--inline" data-form="breakdown-mission">
              <label class="app-field app-field--wide">
                <span>描述一个模糊目标，AI 会拆成可执行任务</span>
                <input name="goal" required placeholder="例如：完成比赛项目" />
              </label>
              <div class="app-form__actions">
                <button class="app-button app-button--solid" type="submit">生成任务清单</button>
                <button class="app-button" type="button" data-action="cancel-breakdown">取消</button>
              </div>
            </form>
          `
          : ""
      }

      <div class="app-list app-list--missions">
        ${
          missions.length
            ? missions
                .map((mission) =>
                  missionRow(mission, {
                    compact: false,
                  }),
                )
                .join("")
            : `<div class="app-empty">还没有任务。点击“添加任务”，或让 AI 把模糊目标拆成任务。</div>`
        }
      </div>

      <div class="app-project-tools">
        <button class="app-button" type="button" data-action="review-project" data-id="${escapeAttr(project.id)}">生成 AI 项目评审</button>
      </div>

      ${
        uiState.analysis
          ? renderAnalysisResult(uiState.analysis)
          : ""
      }
      ${
        uiState.planPreview
          ? renderPlanPreview(uiState.planPreview)
          : ""
      }
      ${
        uiState.review
          ? renderReviewResult(uiState.review)
          : ""
      }

      <details class="app-danger">
        <summary>项目设置</summary>
        <div>
          <button class="app-button" type="button" data-action="toggle-project-status" data-id="${escapeAttr(project.id)}">
            ${project.status === "paused" ? "恢复项目" : "暂停项目"}
          </button>
          <button class="app-button" type="button" data-action="complete-project" data-id="${escapeAttr(project.id)}">完成并归档项目</button>
          <button class="app-button app-button--danger" type="button" data-action="delete-project" data-id="${escapeAttr(project.id)}">删除项目</button>
        </div>
      </details>
    </section>
  `;
}

function renderMissionCreateForm(state, project, milestones) {
  return `
    <form class="app-form app-form--create" data-form="create-mission">
      <input type="hidden" name="projectId" value="${escapeAttr(project.id)}" />
      ${sectionHead("新任务", "添加一个可执行任务")}
      <label class="app-field app-field--wide">
        <span>任务名称</span>
        <input name="title" required maxlength="100" />
      </label>
      <label class="app-field app-field--wide">
        <span>任务说明</span>
        <textarea name="description" rows="2" maxlength="220"></textarea>
      </label>
      <label class="app-field">
        <span>所属阶段</span>
        <select name="milestoneId">
          ${milestones
            .map(
              (milestone) =>
                `<option value="${escapeAttr(milestone.id)}">${escapeHTML(milestone.title)}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label class="app-field">
        <span>截止日期</span>
        <input name="deadline" type="date" value="${escapeAttr(project.deadline)}" required />
      </label>
      <label class="app-field">
        <span>预计耗时（分钟）</span>
        <input name="estimatedMinutes" type="number" min="5" step="5" value="90" required />
      </label>
      <label class="app-field">
        <span>优先级</span>
        <select name="priority">
          <option value="medium">中优先级</option>
          <option value="high">高优先级</option>
          <option value="critical">紧急</option>
          <option value="low">低优先级</option>
        </select>
      </label>
      <div class="app-form__actions">
        <button class="app-button app-button--solid" type="submit">添加任务</button>
        <button class="app-button" type="button" data-action="cancel-mission-create">取消</button>
      </div>
    </form>
  `;
}

function renderAnalysisResult(analysis) {
  return `
    <div class="app-analysis app-analysis--result">
      <div class="app-analysis__title">
        <span>AI 风险分析</span>
        <strong class="is-${escapeAttr(analysis.riskLevel)}">${escapeHTML(riskLabel(analysis.riskLevel))}</strong>
      </div>
      <p>${escapeHTML(analysis.reason)}</p>
      <ul>
        ${analysis.suggestions
          .map((item) => `<li>${escapeHTML(item)}</li>`)
          .join("")}
      </ul>
      <small>${escapeHTML(analysis.nextAction)}</small>
      <button class="app-button" type="button" data-action="dismiss-analysis">收起分析</button>
    </div>
  `;
}

function renderPlanPreview(plan) {
  return `
    <div class="app-plan">
      <div class="app-plan__head">
        <span>AI 重新规划 / 预览</span>
        <strong>${plan.summary.completionProbability}%<small>预计按时完成概率</small></strong>
      </div>
      <div class="app-metrics app-metrics--compact">
        ${metric("任务数量", `${plan.summary.originalTaskCount} → ${plan.summary.nextTaskCount}`)}
        ${metric("预计工作量", `${formatMinutes(plan.summary.originalMinutes)} → ${formatMinutes(plan.summary.nextMinutes)}`)}
      </div>
      ${
        plan.removed.length
          ? `
            <div class="app-plan__block">
              <span>建议删除或合并</span>
              ${plan.removed
                .map(
                  (mission) => `
                    <p>${escapeHTML(mission.title)} <small>${
                      mission.mergedInto
                        ? `合并到：${escapeHTML(mission.mergedInto)}`
                        : "价值较低"
                    }</small></p>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }
      <ul>
        ${plan.rationale
          .map((item) => `<li>${escapeHTML(item)}</li>`)
          .join("")}
      </ul>
      <div class="app-form__actions">
        <button class="app-button app-button--solid" type="button" data-action="apply-plan">接受新计划</button>
        <button class="app-button" type="button" data-action="dismiss-plan">保留当前计划</button>
      </div>
    </div>
  `;
}

function renderReviewResult(review) {
  return `
    <div class="app-review app-review--result">
      <div class="app-review__hero">
        <span>AI 项目评审</span>
        <strong>${review.total}<small>/ 100 总分</small></strong>
      </div>
      <dl>
        <div><dt>创新性</dt><dd>${review.scores.innovation}</dd></div>
        <div><dt>技术实现</dt><dd>${review.scores.technology}</dd></div>
        <div><dt>实用价值</dt><dd>${review.scores.practicalValue}</dd></div>
        <div><dt>用户体验</dt><dd>${review.scores.userExperience}</dd></div>
        <div><dt>展示表达</dt><dd>${review.scores.presentation}</dd></div>
      </dl>
      <div class="app-review__text">
        <span>AI 总结</span>
        <p>${escapeHTML(review.conclusion)}</p>
      </div>
      <div class="app-review__text">
        <span>最大优势</span>
        <p>${escapeHTML(review.biggestAdvantage)}</p>
      </div>
      <div class="app-review__text">
        <span>最大问题</span>
        <p>${escapeHTML(review.biggestProblem)}</p>
      </div>
      <div class="app-review__text">
        <span>改进建议</span>
        <ol>
          ${review.improvements
            .map((item) => `<li>${escapeHTML(item)}</li>`)
            .join("")}
        </ol>
      </div>
      <div class="app-form__actions">
        <button class="app-button" type="button" data-action="open-archive">打开项目复盘</button>
        <button class="app-button app-button--solid" type="button" data-action="complete-project" data-id="${escapeAttr(review.projectId)}">完成并移入归档</button>
      </div>
    </div>
  `;
}

function renderHelpDocument() {
  return `
    <section class="app-section app-help-doc">
      <div class="app-help-hero">
        <span>NEXUS / 使用教学</span>
        <h3>先创建目标，再让 AI 安排每天该做的事。</h3>
        <p>NEXUS 负责把模糊目标拆成项目、阶段和任务。你只需要管理目标、补充真实任务，并完成今日行动。</p>
      </div>

      <div class="app-help-steps" aria-label="NEXUS 使用步骤">
        <article>
          <span>01</span>
          <div>
            <strong>创建目标</strong>
            <p>在“行动中心”点击“+ 创建目标”，填写最终结果、目标说明和截止日期。</p>
            <small>入口：行动中心 / + 创建目标</small>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <strong>让 AI 创建项目</strong>
            <p>用一句话描述项目，AI 会自动生成项目阶段、任务、优先级和预计耗时。</p>
            <small>入口：行动中心 / + AI 创建项目</small>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <strong>添加并完成任务</strong>
            <p>打开项目后，在顶部点击“+ 添加任务”；点击任务左侧“完成”即可推进项目进度。</p>
            <small>入口：项目详情 / 添加任务 / 完成</small>
          </div>
        </article>
      </div>

      <div class="app-help-flow" aria-label="NEXUS 核心流程">
        <span>目标</span>
        <i>→</i>
        <span>项目</span>
        <i>→</i>
        <span>阶段</span>
        <i>→</i>
        <span>任务</span>
        <i>→</i>
        <span>执行</span>
        <i>→</i>
        <span>AI 分析与调整</span>
      </div>

      <div class="app-help-notes">
        <div>
          <span>找不到添加任务的位置？</span>
          <p>进入项目详情后，页面顶部的第一个白色按钮就是“+ 添加任务”。</p>
        </div>
        <div>
          <span>怎么算完成任务？</span>
          <p>点击任务左侧的“完成”按钮。任务、阶段、项目和目标进度会自动更新。</p>
        </div>
        <div>
          <span>数据会丢失吗？</span>
          <p>不会。目标和项目数据会保存在当前浏览器中，刷新页面后仍然保留。</p>
        </div>
      </div>

      <div class="app-help-actions">
        <button class="app-button app-button--solid" type="button" data-action="help-start">开始使用</button>
        <button class="app-button" type="button" data-action="open-projects">查看项目总览</button>
      </div>
    </section>
  `;
}

function renderApp() {
  const state = currentState();
  if (uiState.page === "project") {
    detailApp.innerHTML = renderProjectDetail(state);
  } else if (uiState.page === "help") {
    detailApp.innerHTML = renderHelpDocument();
  } else if (uiState.page === "projects") {
    detailApp.innerHTML = renderProjects(state);
  } else if (uiState.page === "about") {
    detailApp.innerHTML = renderTargets(state);
  } else if (uiState.page === "blog") {
    detailApp.innerHTML = renderArchive(state);
  } else if (uiState.page === "contact") {
    detailApp.innerHTML = renderAiStudio(state);
  } else {
    detailApp.innerHTML = renderCommandCenter(state);
  }
}

function renderDetail(key) {
  const section = sections[key] || sections.home;
  detailView.dataset.detail = key;
  detailView.dataset.route = uiState.page;
  detailIndex.textContent = section.index;
  detailCode.textContent =
    uiState.page === "project" && uiState.projectId
      ? `项目 / ${uiState.projectId.slice(-6).toUpperCase()}`
      : section.visualLabel;
  detailEyebrow.textContent = section.eyebrow;
  detailTitleLines.forEach((line, index) => {
    line.textContent = section.title[index];
  });
  detailLede.textContent =
    key === "home"
      ? "NEXUS 把模糊目标拆成项目、阶段和每日任务。你只需完成今天最该做的事，进度和风险会自动更新。"
      : key === "help"
        ? "按照下面的三步操作，就能创建第一个目标、生成项目和任务，并开始每日执行。"
      : key === "projects"
        ? "在这里查看所有项目。打开项目后，可以在顶部直接添加任务，也可以完成、编辑或删除已有任务。"
        : key === "about"
          ? "先写清楚最终想完成的结果和截止时间，再把目标交给 AI 拆成可执行项目。"
          : key === "blog"
            ? "完成项目后，这里会保存最终进度、AI 评分、问题、经验与下一次建议。"
            : "输入一个项目想法，AI 会先指出问题、质疑可行性，再把有效建议转成可执行计划。";
  detailActionLabel.textContent = section.cta;
  detailFooter.textContent = `详情 / ${section.index}`;

  detailApp.hidden = false;
  document.querySelector(".detail-copy").classList.add("is-app");
  detailBlock.hidden = true;
  detailMeta.hidden = true;
  detailAction.hidden = true;
  renderApp();
}

function getRouteFromHash() {
  const projectMatch = window.location.hash.match(/^#\/project\/([^/]+)$/);
  if (projectMatch) {
    return {
      page: "project",
      key: "projects",
      projectId: decodeURIComponent(projectMatch[1]),
    };
  }
  const detailMatch = window.location.hash.match(/^#\/detail\/([a-z]+)$/);
  if (detailMatch && detailMatch[1] === "help") {
    return { page: "help", key: "home", projectId: null };
  }
  if (detailMatch && sections[detailMatch[1]]) {
    return { page: detailMatch[1], key: detailMatch[1], projectId: null };
  }
  return null;
}

function setRoute(page, key, { updateHistory = true, projectId = null } = {}) {
  uiState.page = page;
  uiState.projectId = projectId;
  uiState.missionEditorId = null;
  uiState.breakdownOpen = false;
  uiState.analysis = null;
  uiState.planPreview = null;
  uiState.review = null;
  if (page !== "projects") uiState.projectCreateOpen = false;

  const shellKey = page === "help" ? "home" : key;
  const detailKey = page === "help" ? "help" : key;
  const button = navItems.find((item) => item.dataset.section === shellKey);
  activateSection(shellKey, button);
  renderDetail(detailKey);
  window.clearTimeout(detailTimer);

  detailView.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-open");
  shell.inert = true;

  requestAnimationFrame(() => {
    detailView.classList.add("is-open");
    replayDetailIn();
    detailClose.focus({ preventScroll: true });
  });

  const hash =
    page === "project" && projectId
      ? `#/project/${encodeURIComponent(projectId)}`
      : page === "help"
        ? "#/detail/help"
        : `#/detail/${key}`;
  if (updateHistory && window.location.hash !== hash) {
    window.history.pushState({ page, key, projectId }, "", hash);
  }
}

function replayDetailIn() {
  detailView.classList.remove("is-entering");
  void detailView.offsetWidth;
  detailView.classList.add("is-entering");

  window.setTimeout(() => {
    detailView.classList.remove("is-entering");
  }, prefersReducedMotion.matches ? 0 : 940);
}

function showDetail(key, options = {}) {
  if (!sections[key]) return;
  const button = navItems.find((item) => item.dataset.section === key);
  if (!detailView.classList.contains("is-open")) {
    detailReturnFocus =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : button;
  }
  setRoute(key, key, {
    updateHistory: options.updateHistory !== false,
  });
}

function showProject(projectId, options = {}) {
  const state = currentState();
  if (!state.projects.some((project) => project.id === projectId)) return;
  setRoute("project", "projects", {
    updateHistory: options.updateHistory !== false,
    projectId,
  });
}

function showHelp() {
  detailReturnFocus = helpRibbon;
  if (!currentState().settings.helpSeen) {
    store.updateSettings({ helpSeen: true });
  }
  setRoute("help", "home", { updateHistory: true });
}

function hideDetail() {
  window.clearTimeout(detailTimer);
  detailView.classList.remove("is-open", "is-entering");
  detailView.setAttribute("aria-hidden", "true");
  document.body.classList.remove("detail-open");
  shell.inert = false;

  detailTimer = window.setTimeout(() => {
    if (!detailView.classList.contains("is-open")) {
      const fallback = navItems.find(
        (item) => item.dataset.section === detailView.dataset.detail,
      );
      const focusTarget = detailReturnFocus?.isConnected
        ? detailReturnFocus
        : fallback;
      focusTarget?.focus({ preventScroll: true });
      detailReturnFocus = null;
    }
  }, prefersReducedMotion.matches ? 0 : 800);
}

function closeDetail() {
  if (window.history.state?.page || window.history.state?.detail) {
    window.history.back();
    return;
  }
  hideDetail();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
}

function refreshFromStore() {
  syncHelpRibbon();
  paintCopy(activeSection);
  if (detailView.classList.contains("is-open")) renderApp();
}

function revealMissionCreateForm() {
  window.requestAnimationFrame(() => {
    const form = detailApp.querySelector('[data-form="create-mission"]');
    if (!form) return;
    form.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "center",
    });
    form.querySelector('input[name="title"]')?.focus({
      preventScroll: true,
    });
  });
}

function handleAppClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || !detailApp.contains(button)) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  const state = currentState();

  if (action === "open-projects") {
    showDetail("projects");
  } else if (action === "help-start") {
    closeDetail();
  } else if (action === "open-project") {
    showProject(id);
  } else if (action === "open-archive") {
    showDetail("blog");
  } else if (action === "project-filter") {
    uiState.projectFilter = button.dataset.filter;
    uiState.projectCreateOpen = false;
    renderApp();
  } else if (action === "new-project") {
    uiState.page = "projects";
    uiState.projectCreateOpen = true;
    activeSection = "projects";
    navItems.forEach((item) => {
      const active = item.dataset.section === "projects";
      item.classList.toggle("is-active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    renderDetail("projects");
    window.history.pushState(
      { page: "projects", key: "projects", projectId: null },
      "",
      "#/detail/projects",
    );
  } else if (action === "cancel-project-create") {
    uiState.projectCreateOpen = false;
    renderApp();
  } else if (action === "create-project-for-objective") {
    uiState.page = "projects";
    uiState.projectCreateOpen = true;
    uiState.objectiveId = id;
    renderDetail("projects");
    window.history.pushState(
      { page: "projects", key: "projects", projectId: null },
      "",
      "#/detail/projects",
    );
  } else if (action === "new-objective") {
    uiState.objectiveCreateOpen = true;
    renderApp();
  } else if (action === "cancel-objective-create") {
    uiState.objectiveCreateOpen = false;
    renderApp();
  } else if (action === "toggle-mission") {
    store.toggleMission(id);
    showNote("任务状态已更新");
  } else if (action === "edit-mission") {
    uiState.missionEditorId = id;
    renderApp();
  } else if (action === "cancel-mission-edit") {
    uiState.missionEditorId = null;
    renderApp();
  } else if (action === "delete-mission") {
    if (window.confirm("确定删除这个任务吗？")) {
      store.deleteMission(id);
      showNote("任务已删除");
    }
  } else if (action === "add-mission") {
    uiState.missionCreateOpen = true;
    renderApp();
    revealMissionCreateForm();
  } else if (action === "add-mission-from-dashboard") {
    uiState.missionCreateOpen = true;
    showProject(id);
    revealMissionCreateForm();
  } else if (action === "cancel-mission-create") {
    uiState.missionCreateOpen = false;
    renderApp();
  } else if (action === "add-phase") {
    const title = window.prompt("新阶段名称：", "新阶段");
    if (title) {
      store.createMilestone(uiState.projectId, {
        title,
        description: "用户自定义项目阶段。",
      });
      showNote("阶段已创建");
    }
  } else if (action === "breakdown-open") {
    uiState.breakdownOpen = true;
    renderApp();
  } else if (action === "cancel-breakdown") {
    uiState.breakdownOpen = false;
    renderApp();
  } else if (action === "analyze-project") {
    const analysis = engine.analyzeProject(state, id);
    if (analysis) {
      store.saveAiReport(analysis);
      uiState.analysis = analysis;
      renderApp();
      showNote("AI 风险分析已更新");
    }
  } else if (action === "dismiss-analysis") {
    uiState.analysis = null;
    renderApp();
  } else if (action === "optimize-project") {
    uiState.planPreview = engine.regeneratePlan(state, id);
    renderApp();
  } else if (action === "dismiss-plan") {
    uiState.planPreview = null;
    renderApp();
  } else if (action === "apply-plan") {
    if (uiState.planPreview) {
      engine.applyPlan(uiState.planPreview);
      uiState.planPreview = null;
      uiState.analysis = null;
      showNote("新计划已应用");
    }
  } else if (action === "review-project") {
    const review = engine.reviewProject(state, id);
    if (review) {
      store.saveReview(review);
      uiState.review = review;
      renderApp();
      showNote("AI 项目评审已生成");
    }
  } else if (action === "generate-review") {
    const review = engine.reviewProject(state, id);
    if (review) {
      store.saveReview(review);
      uiState.review = review;
      renderApp();
      showNote("项目复盘已保存");
    }
  } else if (action === "toggle-project-status") {
    const project = state.projects.find((item) => item.id === id);
    if (project) {
      store.updateProject(id, {
        status: project.status === "paused" ? "active" : "paused",
      });
      showNote("项目状态已更新");
    }
  } else if (action === "complete-project") {
    if (window.confirm("确定完成项目并移入项目复盘吗？")) {
      const project = state.projects.find((item) => item.id === id);
      if (project) {
        const stats = engine.calculateProjectProgress(state, id);
        const review = engine.reviewProject(state, id);
        if (review) store.saveReview(review);
        store.updateProject(id, { status: "completed" });
        uiState.page = "blog";
        uiState.projectId = null;
        uiState.review = null;
        renderDetail("blog");
        window.history.pushState(
          { page: "blog", key: "blog", projectId: null },
          "",
          "#/detail/blog",
        );
        showNote(
          stats.completed === stats.total
            ? "项目已完成并归档"
            : "项目已关闭并生成复盘",
        );
      }
    }
  } else if (action === "delete-project") {
    if (window.confirm("确定删除这个项目及其全部任务吗？")) {
      store.deleteProject(id);
      uiState.page = "projects";
      uiState.projectId = null;
      renderDetail("projects");
      window.history.pushState(
        { page: "projects", key: "projects", projectId: null },
        "",
        "#/detail/projects",
      );
      showNote("项目已删除");
    }
  } else if (action === "regenerate-critique") {
    uiState.criticalRound = uiState.criticalRound >= 3 ? 1 : uiState.criticalRound + 1;
    uiState.criticalResult = engine.criticalAnalysis(uiState.criticalSource, {
      round: uiState.criticalRound,
    });
    renderApp();
    showNote("AI 质疑分析已重新生成");
  } else if (action === "accept-critique") {
    const result = uiState.criticalResult;
    if (result) {
      const plan = engine.parseProjectPrompt(
        `我想在 20 天后完成 ${result.improvedIdea}`,
      );
      const project = store.createProject(
        {
          title: plan.title,
          description: result.improvedIdea,
          objectiveId: null,
          startDate: plan.startDate,
          deadline: plan.deadline,
          priority: "high",
        },
        { milestones: plan.phases },
      );
      showProject(project.id);
      showNote("已根据改进想法创建项目");
    }
  } else if (action === "reset-demo") {
    if (window.confirm("确定恢复演示数据吗？当前用户数据会被替换。")) {
      store.resetDemo();
      uiState.page = "home";
      uiState.projectId = null;
      renderDetail("home");
      window.history.pushState(
        { page: "home", key: "home", projectId: null },
        "",
        "#/detail/home",
      );
      showNote("演示数据已恢复");
    }
  } else if (action === "clear-data") {
    if (window.confirm("确定清空所有用户数据吗？")) {
      store.clearAll();
      uiState.page = "home";
      uiState.projectId = null;
      renderDetail("home");
      window.history.pushState(
        { page: "home", key: "home", projectId: null },
        "",
        "#/detail/home",
      );
      showNote("所有用户数据已清空");
    }
  }
}

function handleAppSubmit(event) {
  const form = event.target.closest("[data-form]");
  if (!form || !detailApp.contains(form)) return;
  event.preventDefault();
  const data = new FormData(form);
  const formName = form.dataset.form;

  if (formName === "create-project") {
    const prompt = String(data.get("prompt") || "").trim();
    if (!prompt) return;
    const parsed = engine.parseProjectPrompt(prompt);
    const objectiveId = String(data.get("objectiveId") || "");
    const project = store.createProject(
      {
        title: parsed.title,
        description: parsed.description,
        objectiveId: objectiveId || null,
        startDate: parsed.startDate,
        deadline: parsed.deadline,
        priority: parsed.priority,
      },
      { milestones: parsed.phases },
    );
    uiState.projectCreateOpen = false;
    uiState.objectiveId = null;
    showProject(project.id);
    showNote("AI 项目已创建");
    return;
  }

  if (formName === "create-objective") {
    const objective = store.createObjective({
      title: data.get("title"),
      description: data.get("description"),
      deadline: data.get("deadline"),
    });
    uiState.objectiveCreateOpen = false;
    renderApp();
    showNote(`目标已创建：${objective.title}`);
    return;
  }

  if (formName === "mission-update") {
    const id = String(data.get("id") || "");
    store.updateMission(id, {
      title: data.get("title"),
      description: data.get("description"),
      deadline: data.get("deadline"),
      estimatedMinutes: data.get("estimatedMinutes"),
      priority: data.get("priority"),
      status: data.get("status"),
      milestoneId: data.get("milestoneId"),
    });
    uiState.missionEditorId = null;
    renderApp();
    showNote("任务已保存");
    return;
  }

  if (formName === "create-mission") {
    store.createMission({
      projectId: data.get("projectId"),
      milestoneId: data.get("milestoneId"),
      title: data.get("title"),
      description: data.get("description"),
      deadline: data.get("deadline"),
      estimatedMinutes: data.get("estimatedMinutes"),
      priority: data.get("priority"),
      status: "pending",
      aiGenerated: false,
    });
    uiState.missionCreateOpen = false;
    renderApp();
    showNote("任务已添加");
    return;
  }

  if (formName === "breakdown-mission") {
    const project = currentState().projects.find(
      (item) => item.id === uiState.projectId,
    );
    const goal = String(data.get("goal") || "").trim();
    if (!project || !goal) return;
    const missions = engine.breakdownGoal(goal, project);
    missions.forEach((mission) => {
      store.createMission({
        projectId: project.id,
        milestoneId: mission.milestoneId,
        title: mission.title,
        description: mission.description,
        deadline: mission.deadline,
        estimatedMinutes: mission.estimatedMinutes,
        priority: mission.priority,
        status: "pending",
        aiGenerated: true,
      });
    });
    uiState.breakdownOpen = false;
    renderApp();
    showNote(`AI 已生成 ${missions.length} 个任务`);
    return;
  }

  if (formName === "critical-analysis") {
    const idea = String(data.get("idea") || "").trim();
    uiState.criticalSource = idea;
    uiState.criticalRound = 1;
    uiState.criticalResult = engine.criticalAnalysis(idea, {
      round: uiState.criticalRound,
    });
    renderApp();
    showNote("AI 质疑分析已生成");
  }
}

navItems.forEach((item) => {
  item.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") return;
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => {
      activateSection(item.dataset.section, item);
    }, prefersReducedMotion.matches ? 0 : 70);
  });

  item.addEventListener("pointerleave", () => {
    window.clearTimeout(hoverTimer);
  });

  item.addEventListener("focus", () => {
    activateSection(item.dataset.section, item);
  });

  item.addEventListener("click", () => {
    window.clearTimeout(hoverTimer);
    showDetail(item.dataset.section);
  });
});

moreLink.addEventListener("click", () => {
  showDetail(activeSection);
});

helpRibbon.addEventListener("click", showHelp);
detailClose.addEventListener("click", closeDetail);
detailApp.addEventListener("click", handleAppClick);
detailApp.addEventListener("submit", handleAppSubmit);

detailAction.addEventListener("click", () => {
  showNote(`${sections[detailView.dataset.detail].cta} / 已就绪`);
});

window.addEventListener("popstate", () => {
  const route = getRouteFromHash();
  if (route) {
    setRoute(route.page, route.key, {
      updateHistory: false,
      projectId: route.projectId,
    });
  } else {
    hideDetail();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && detailView.classList.contains("is-open")) {
    closeDetail();
  }
});

store.subscribe(() => {
  refreshFromStore();
});

syncHelpRibbon();

window.addEventListener(
  "load",
  () => {
    requestAnimationFrame(() => {
      document.body.classList.add("is-ready");
      const route = getRouteFromHash();
      if (route) {
        setRoute(route.page, route.key, {
          updateHistory: false,
          projectId: route.projectId,
        });
      } else {
        paintCopy(activeSection);
        paintVisual(activeSection);
      }
    });
  },
  { once: true },
);

window.NEXUS_APP = {
  getState: currentState,
  showDetail,
  showProject,
  renderApp,
  getUiState: () => ({ ...uiState }),
  createProjectFromPrompt(prompt) {
    const parsed = engine.parseProjectPrompt(prompt);
    return store.createProject(
      {
        title: parsed.title,
        description: parsed.description,
        deadline: parsed.deadline,
        priority: parsed.priority,
      },
      { milestones: parsed.phases },
    );
  },
};
