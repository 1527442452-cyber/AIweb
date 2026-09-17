(function () {
  const STORAGE_KEY = "nexus:v1:state";
  const VERSION = 1;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const listeners = new Set();

  function uid(prefix) {
    const random =
      window.crypto && typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now().toString(36)}_${random}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getTime());
    const parts = String(value).slice(0, 10).split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date(value);
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function toISODate(value) {
    const date = parseDate(value) || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function addDays(value, amount) {
    const date = parseDate(value) || new Date();
    date.setDate(date.getDate() + Number(amount || 0));
    return toISODate(date);
  }

  function startOfDay(value) {
    const date = parseDate(value) || new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function daysRemaining(deadline, now = new Date()) {
    const target = startOfDay(deadline);
    if (!target) return 0;
    return Math.ceil((target.getTime() - startOfDay(now).getTime()) / DAY_MS);
  }

  function remainingLabel(deadline, status) {
    if (status === "completed") return "已完成";
    if (status === "paused") return "已暂停";
    const days = daysRemaining(deadline);
    if (days < 0) return `已延期 ${Math.abs(days)} 天`;
    if (days === 0) return "今天截止";
    return `剩余 ${days} 天`;
  }

  function makeMilestone(projectId, order, title, description, deadline) {
    return {
      id: uid("milestone"),
      projectId,
      order,
      title,
      description,
      deadline,
      status: "pending",
      progress: 0,
      taskIds: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
  }

  function makeMission(projectId, milestoneId, input) {
    return {
      id: input.id || uid("mission"),
      projectId,
      milestoneId,
      title: input.title || "Untitled mission",
      description: input.description || "",
      deadline: input.deadline || toISODate(new Date()),
      estimatedMinutes: Math.max(5, Number(input.estimatedMinutes) || 60),
      priority: input.priority || "medium",
      status: input.status || "pending",
      completedAt: input.completedAt || null,
      createdAt: input.createdAt || nowISO(),
      updatedAt: nowISO(),
      aiGenerated: Boolean(input.aiGenerated),
    };
  }

  function seedState() {
    const createdAt = nowISO();
    const objectiveId = "objective_ican";
    const projectId = "project_ican_ai";
    const phaseDefinitions = [
      ["构思", "确定问题、用户与产品方向。", "2026-09-12"],
      ["设计", "完成产品结构、视觉原型与核心流程。", "2026-09-16"],
      ["搭建", "搭建可运行产品并接入 AI 核心能力。", "2026-09-20"],
      ["测试", "完成真实用户测试和核心流程验证。", "2026-09-23"],
      ["演示", "完成演示脚本、数据和展示材料。", "2026-09-25"],
      ["提交", "完成提交材料与答辩准备。", "2026-09-27"],
    ];
    const milestones = phaseDefinitions.map((definition, index) =>
      makeMilestone(projectId, index + 1, ...definition),
    );

    const missionSeed = [
      [0, "确定用户痛点", "访谈目标用户并记录真实问题。", "2026-09-11", 90, "high", "completed", true],
      [0, "确定产品定位", "用一句话定义产品、用户与价值。", "2026-09-12", 60, "high", "completed", true],
      [1, "完成产品原型", "绘制核心流程和页面结构。", "2026-09-14", 180, "critical", "completed", true],
      [1, "完成首页 UI", "完成首页主视觉和关键交互。", "2026-09-16", 120, "high", "in_progress", true],
      [1, "完成项目系统界面", "完成项目、阶段和任务的信息结构。", "2026-09-17", 160, "high", "pending", true],
      [2, "搭建网站基础", "建立可部署的前端工程。", "2026-09-17", 180, "critical", "completed", true],
      [2, "接入 AI 分析", "连接目标拆解、风险分析和重新规划逻辑。", "2026-09-19", 240, "critical", "in_progress", true],
      [2, "实现任务数据联动", "打通任务、阶段、项目与目标进度。", "2026-09-19", 180, "critical", "pending", true],
      [2, "配置本地持久化", "保证刷新后所有项目数据不丢失。", "2026-09-20", 60, "medium", "pending", true],
      [2, "修复关键界面问题", "完成交互走查并修复阻塞问题。", "2026-09-20", 120, "high", "pending", false],
      [3, "测试核心流程", "覆盖创建、执行、分析和复盘流程。", "2026-09-21", 150, "high", "pending", true],
      [3, "完成用户测试", "邀请目标用户完成一轮可用性测试。", "2026-09-22", 120, "medium", "pending", false],
      [3, "修复测试问题", "优先处理高频和阻塞问题。", "2026-09-23", 150, "high", "pending", false],
      [4, "完成 Demo", "整理稳定演示路径与演示数据。", "2026-09-24", 180, "critical", "pending", false],
      [4, "准备路演脚本", "压缩为 3 分钟可演示的价值叙事。", "2026-09-25", 90, "high", "pending", false],
      [5, "提交比赛材料", "检查作品、说明文档和报名信息。", "2026-09-26", 90, "critical", "pending", false],
      [5, "准备答辩材料", "准备关键问题、数据与回答。", "2026-09-27", 120, "high", "pending", false],
    ];

    const missions = missionSeed.map((seed) => {
      const [milestoneIndex, title, description, deadline, minutes, priority, status, aiGenerated] = seed;
      const milestone = milestones[milestoneIndex];
      const mission = makeMission(projectId, milestone.id, {
        title,
        description,
        deadline,
        estimatedMinutes: minutes,
        priority,
        status,
        aiGenerated,
        completedAt:
          status === "completed"
            ? `${deadline}T20:00:00.000Z`
            : null,
      });
      milestone.taskIds.push(mission.id);
      return mission;
    });

    return {
      version: VERSION,
      objectives: [
        {
          id: objectiveId,
          title: "完成 iCAN AI 比赛作品",
          description: "完成一个可运行的 AI 无代码 Web 应用，并完成比赛展示。",
          deadline: "2026-09-27",
          createdAt,
          status: "active",
          progress: 0,
          projectIds: [projectId],
        },
      ],
      projects: [
        {
          id: projectId,
          title: "iCAN AI PROJECT",
          description:
            "完成一个可运行的 AI 无代码 Web 应用，并完成比赛展示。",
          objectiveId,
          startDate: "2026-09-10",
          deadline: "2026-09-27",
          status: "active",
          progress: 0,
          priority: "critical",
          riskLevel: "high",
          milestoneIds: milestones.map((milestone) => milestone.id),
          createdAt,
          updatedAt: createdAt,
        },
      ],
      milestones,
      missions,
      aiReports: [],
      reviews: [],
      settings: {
        notificationsEnabled: true,
        dailyCapacityMinutes: 360,
        helpSeen: false,
        lastOpenedAt: createdAt,
        lastActivityAt: createdAt,
      },
      meta: {
        seededAt: createdAt,
        updatedAt: createdAt,
      },
    };
  }

  function isPlainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeState(candidate) {
    const fallback = seedState();
    const state = isPlainObject(candidate) ? candidate : fallback;
    state.version = VERSION;
    state.objectives = Array.isArray(state.objectives) ? state.objectives : [];
    state.projects = Array.isArray(state.projects) ? state.projects : [];
    state.milestones = Array.isArray(state.milestones) ? state.milestones : [];
    state.missions = Array.isArray(state.missions) ? state.missions : [];
    state.aiReports = Array.isArray(state.aiReports) ? state.aiReports : [];
    state.reviews = Array.isArray(state.reviews) ? state.reviews : [];
    state.settings = {
      ...fallback.settings,
      ...(isPlainObject(state.settings) ? state.settings : {}),
    };
    state.meta = {
      ...fallback.meta,
      ...(isPlainObject(state.meta) ? state.meta : {}),
    };

    state.milestones.forEach((milestone, milestoneIndex) => {
      milestone.title = (
        {
          IDEA: "构思",
          DESIGN: "设计",
          BUILD: "搭建",
          TEST: "测试",
          DEMO: "演示",
          SUBMIT: "提交",
        }[milestone.title] || milestone.title
      );
      milestone.order = Number(milestone.order) || milestoneIndex + 1;
      milestone.taskIds = Array.isArray(milestone.taskIds)
        ? milestone.taskIds
        : state.missions
            .filter((mission) => mission.milestoneId === milestone.id)
            .map((mission) => mission.id);
    });
    state.projects.forEach((project) => {
      project.milestoneIds = Array.isArray(project.milestoneIds)
        ? project.milestoneIds
        : state.milestones
            .filter((milestone) => milestone.projectId === project.id)
            .map((milestone) => milestone.id);
    });
    state.objectives.forEach((objective) => {
      objective.projectIds = Array.isArray(objective.projectIds)
        ? objective.projectIds
        : state.projects
            .filter((project) => project.objectiveId === objective.id)
            .map((project) => project.id);
    });
    return state;
  }

  let state = load();

  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : seedState();
    } catch {
      return seedState();
    }
  }

  function persist() {
    state.meta.updatedAt = nowISO();
    state.settings.lastActivityAt = nowISO();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The app remains usable in-memory if storage is unavailable.
    }
    listeners.forEach((listener) => listener(clone(state)));
  }

  function commit() {
    recalculate();
    persist();
    return clone(state);
  }

  function recalculate() {
    if (window.NEXUS_ENGINE && window.NEXUS_ENGINE.recalculateState) {
      window.NEXUS_ENGINE.recalculateState(state);
    }
  }

  function getState() {
    recalculate();
    return clone(state);
  }

  function getObjective(id) {
    return state.objectives.find((objective) => objective.id === id) || null;
  }

  function getProject(id) {
    return state.projects.find((project) => project.id === id) || null;
  }

  function getMilestone(id) {
    return state.milestones.find((milestone) => milestone.id === id) || null;
  }

  function getMission(id) {
    return state.missions.find((mission) => mission.id === id) || null;
  }

  function createObjective(input) {
    const objective = {
      id: uid("objective"),
      title: String(input.title || "Untitled objective").trim(),
      description: String(input.description || "").trim(),
      deadline: input.deadline || addDays(toISODate(new Date()), 30),
      createdAt: nowISO(),
      status: input.status || "active",
      progress: 0,
      projectIds: [],
    };
    state.objectives.push(objective);
    commit();
    return clone(objective);
  }

  function updateObjective(id, patch) {
    const objective = getObjective(id);
    if (!objective) return null;
    Object.assign(objective, patch, { id: objective.id });
    commit();
    return clone(objective);
  }

  function createProject(input, plan) {
    const project = {
      id: input.id || uid("project"),
      title: String(input.title || "Untitled project").trim(),
      description: String(input.description || "").trim(),
      objectiveId: input.objectiveId || null,
      startDate: input.startDate || toISODate(new Date()),
      deadline: input.deadline || addDays(toISODate(new Date()), 30),
      status: input.status || "active",
      progress: 0,
      priority: input.priority || "medium",
      riskLevel: input.riskLevel || "low",
      completionMode: null,
      completedAt: null,
      milestoneIds: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    state.projects.push(project);

    let objective = project.objectiveId ? getObjective(project.objectiveId) : null;
    if (!objective) {
      objective = {
        id: uid("objective"),
        title: project.title,
        description: project.description,
        deadline: project.deadline,
        createdAt: nowISO(),
        status: "active",
        progress: 0,
        projectIds: [project.id],
      };
      state.objectives.push(objective);
      project.objectiveId = objective.id;
    }
    if (!objective.projectIds.includes(project.id)) {
      objective.projectIds.push(project.id);
    }

    const phases =
      plan && Array.isArray(plan.milestones) && plan.milestones.length
        ? plan.milestones
        : [
            {
              title: "IDEA",
              description: "确认问题、目标用户与项目边界。",
              tasks: ["明确项目目标", "确认目标用户"],
            },
            {
              title: "BUILD",
              description: "完成核心产品与 AI 能力。",
              tasks: ["实现核心功能", "接入 AI 逻辑"],
            },
            {
              title: "SUBMIT",
              description: "完成测试、演示与提交。",
              tasks: ["测试核心流程", "完成演示材料"],
            },
          ];

    const totalProjectDays = Math.max(
      1,
      Math.round(
        (parseDate(project.deadline).getTime() -
          parseDate(project.startDate).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );
    phases.forEach((phase, index) => {
      const ratio = phases.length === 1 ? 1 : index / (phases.length - 1);
      const milestoneDeadline =
        phase.deadline ||
        addDays(
          project.startDate,
          Math.max(1, Math.round(totalProjectDays * ratio)),
        );
      const milestone = makeMilestone(
        project.id,
        index + 1,
        phase.title || `PHASE ${index + 1}`,
        phase.description || "",
        milestoneDeadline,
      );
      state.milestones.push(milestone);
      project.milestoneIds.push(milestone.id);

      const tasks =
        Array.isArray(phase.tasks) && phase.tasks.length
          ? phase.tasks
          : [{ title: `${milestone.title} 核心任务` }];
      tasks.forEach((task, taskIndex) => {
        const taskInput = typeof task === "string" ? { title: task } : task;
        const mission = makeMission(project.id, milestone.id, {
          title: taskInput.title,
          description: taskInput.description || "",
          deadline:
            taskInput.deadline ||
            addDays(
              project.startDate,
              Math.max(
                1,
                Math.round(
                  totalProjectDays *
                    ((index + (taskIndex + 1) / tasks.length) / phases.length),
                ),
              ),
            ),
          estimatedMinutes: taskInput.estimatedMinutes || 90,
          priority: taskInput.priority || (index === 0 ? "high" : "medium"),
          aiGenerated: true,
        });
        state.missions.push(mission);
        milestone.taskIds.push(mission.id);
      });
    });

    commit();
    return clone(project);
  }

  function updateProject(id, patch) {
    const project = getProject(id);
    if (!project) return null;
    Object.assign(project, patch, { id: project.id });
    if (project.status === "completed") {
      project.completionMode = patch.completionMode || project.completionMode || "manual";
      project.completedAt = project.completedAt || nowISO();
    } else if (patch.status && patch.status !== "completed") {
      project.completionMode = null;
      project.completedAt = null;
    }
    project.updatedAt = nowISO();
    commit();
    return clone(project);
  }

  function deleteProject(id) {
    const project = getProject(id);
    if (!project) return false;
    const objective = getObjective(project.objectiveId);
    if (objective) {
      objective.projectIds = objective.projectIds.filter(
        (projectId) => projectId !== id,
      );
    }
    state.projects = state.projects.filter((item) => item.id !== id);
    state.milestones = state.milestones.filter(
      (milestone) => milestone.projectId !== id,
    );
    state.missions = state.missions.filter(
      (mission) => mission.projectId !== id,
    );
    state.reviews = state.reviews.filter((review) => review.projectId !== id);
    commit();
    return true;
  }

  function createMilestone(projectId, input) {
    const project = getProject(projectId);
    if (!project) return null;
    const milestone = makeMilestone(
      projectId,
      project.milestoneIds.length + 1,
      input.title || "NEW PHASE",
      input.description || "",
      input.deadline || project.deadline,
    );
    state.milestones.push(milestone);
    project.milestoneIds.push(milestone.id);
    project.updatedAt = nowISO();
    commit();
    return clone(milestone);
  }

  function updateMilestone(id, patch) {
    const milestone = getMilestone(id);
    if (!milestone) return null;
    Object.assign(milestone, patch, { id: milestone.id });
    milestone.updatedAt = nowISO();
    commit();
    return clone(milestone);
  }

  function deleteMilestone(id) {
    const milestone = getMilestone(id);
    if (!milestone) return false;
    const project = getProject(milestone.projectId);
    if (project) {
      project.milestoneIds = project.milestoneIds.filter(
        (milestoneId) => milestoneId !== id,
      );
    }
    state.missions = state.missions.filter(
      (mission) => mission.milestoneId !== id,
    );
    state.milestones = state.milestones.filter((item) => item.id !== id);
    commit();
    return true;
  }

  function createMission(input) {
    const project = getProject(input.projectId);
    if (!project) return null;
    let milestone = getMilestone(input.milestoneId);
    if (!milestone || milestone.projectId !== project.id) {
      milestone = state.milestones.find(
        (item) => item.projectId === project.id,
      );
    }
    if (!milestone) {
      milestone = createMilestone(project.id, {
        title: "EXECUTION",
        deadline: project.deadline,
      });
    }
    const mission = makeMission(project.id, milestone.id, input);
    state.missions.push(mission);
    if (!milestone.taskIds.includes(mission.id)) {
      milestone.taskIds.push(mission.id);
    }
    project.updatedAt = nowISO();
    commit();
    return clone(mission);
  }

  function updateMission(id, patch) {
    const mission = getMission(id);
    if (!mission) return null;
    const previousMilestoneId = mission.milestoneId;
    Object.assign(mission, patch, { id: mission.id });
    mission.estimatedMinutes = Math.max(
      5,
      Number(mission.estimatedMinutes) || 5,
    );
    mission.updatedAt = nowISO();
    if (mission.status === "completed" && !mission.completedAt) {
      mission.completedAt = nowISO();
    }
    if (mission.status !== "completed") {
      mission.completedAt = null;
    }
    if (
      patch.milestoneId &&
      patch.milestoneId !== previousMilestoneId
    ) {
      const previousMilestone = getMilestone(previousMilestoneId);
      if (previousMilestone) {
        previousMilestone.taskIds = previousMilestone.taskIds.filter(
          (missionId) => missionId !== id,
        );
      }
      const nextMilestone = getMilestone(mission.milestoneId);
      if (nextMilestone && !nextMilestone.taskIds.includes(id)) {
        nextMilestone.taskIds.push(id);
      }
    }
    const project = getProject(mission.projectId);
    if (project) project.updatedAt = nowISO();
    commit();
    return clone(mission);
  }

  function toggleMission(id) {
    const mission = getMission(id);
    if (!mission) return null;
    return updateMission(id, {
      status: mission.status === "completed" ? "pending" : "completed",
    });
  }

  function deleteMission(id) {
    const mission = getMission(id);
    if (!mission) return false;
    const milestone = getMilestone(mission.milestoneId);
    if (milestone) {
      milestone.taskIds = milestone.taskIds.filter(
        (missionId) => missionId !== id,
      );
    }
    state.missions = state.missions.filter((item) => item.id !== id);
    commit();
    return true;
  }

  function saveAiReport(report) {
    state.aiReports.unshift({
      id: report.id || uid("report"),
      ...report,
      createdAt: report.createdAt || nowISO(),
    });
    state.aiReports = state.aiReports.slice(0, 40);
    commit();
    return clone(state.aiReports[0]);
  }

  function saveReview(review) {
    const existingIndex = state.reviews.findIndex(
      (item) => item.projectId === review.projectId,
    );
    const nextReview = {
      id: review.id || uid("review"),
      ...review,
      createdAt: review.createdAt || nowISO(),
    };
    if (existingIndex >= 0) {
      state.reviews[existingIndex] = nextReview;
    } else {
      state.reviews.unshift(nextReview);
    }
    const project = getProject(review.projectId);
    if (project) project.updatedAt = nowISO();
    commit();
    return clone(nextReview);
  }

  function updateSettings(patch) {
    Object.assign(state.settings, patch);
    commit();
    return clone(state.settings);
  }

  function replaceState(nextState) {
    state = normalizeState(nextState);
    commit();
    return clone(state);
  }

  function resetDemo() {
    state = seedState();
    commit();
    return clone(state);
  }

  function clearAll() {
    state = normalizeState({
      ...seedState(),
      objectives: [],
      projects: [],
      milestones: [],
      missions: [],
      aiReports: [],
      reviews: [],
    });
    commit();
    return clone(state);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  window.NEXUS_STORE = {
    STORAGE_KEY,
    VERSION,
    uid,
    clone,
    parseDate,
    toISODate,
    nowISO,
    addDays,
    daysRemaining,
    remainingLabel,
    getState,
    subscribe,
    createObjective,
    updateObjective,
    getObjective,
    createProject,
    updateProject,
    deleteProject,
    getProject,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    getMilestone,
    createMission,
    updateMission,
    toggleMission,
    deleteMission,
    getMission,
    saveAiReport,
    saveReview,
    updateSettings,
    replaceState,
    resetDemo,
    clearAll,
  };
})();
