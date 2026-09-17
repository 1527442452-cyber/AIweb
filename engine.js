(function () {
  const store = window.NEXUS_STORE;
  const priorityWeight = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  const riskWeight = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function percent(completed, total) {
    if (!total) return 0;
    return Math.round((completed / total) * 100);
  }

  function getMissionState(mission, now = new Date()) {
    if (!mission) return "pending";
    if (mission.status === "completed") return "completed";
    if (store.daysRemaining(mission.deadline, now) < 0) return "overdue";
    return mission.status || "pending";
  }

  function missionProgress(missions) {
    if (!missions.length) return 0;
    const completed = missions.filter(
      (mission) => mission.status === "completed",
    ).length;
    return percent(completed, missions.length);
  }

  function getMilestoneMissions(state, milestoneId) {
    return state.missions.filter(
      (mission) => mission.milestoneId === milestoneId,
    );
  }

  function getProjectMissions(state, projectId) {
    return state.missions.filter(
      (mission) => mission.projectId === projectId,
    );
  }

  function getProjectMilestones(state, projectId) {
    return state.milestones
      .filter((milestone) => milestone.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }

  function calculateMilestoneProgress(state, milestoneId, now = new Date()) {
    const missions = getMilestoneMissions(state, milestoneId);
    const progress = missionProgress(missions);
    const completed = missions.filter(
      (mission) => mission.status === "completed",
    ).length;
    let status = "pending";
    if (missions.length && completed === missions.length) {
      status = "completed";
    } else if (
      progress > 0 ||
      missions.some((mission) => getMissionState(mission, now) === "overdue")
    ) {
      status = "in_progress";
    }
    return { progress, completed, total: missions.length, status };
  }

  function calculateProjectProgress(state, projectId, now = new Date()) {
    const missions = getProjectMissions(state, projectId);
    const progress = missionProgress(missions);
    const completed = missions.filter(
      (mission) => mission.status === "completed",
    ).length;
    const inProgress = missions.filter(
      (mission) => mission.status === "in_progress",
    ).length;
    return {
      progress,
      completed,
      inProgress,
      total: missions.length,
      pending: missions.length - completed - inProgress,
      overdue: missions.filter(
        (mission) => getMissionState(mission, now) === "overdue",
      ).length,
    };
  }

  function calculateObjectiveProgress(state, objectiveId) {
    const objective = state.objectives.find(
      (item) => item.id === objectiveId,
    );
    if (!objective) return 0;
    const projects = state.projects.filter(
      (project) => objective.projectIds.includes(project.id),
    );
    if (!projects.length) return 0;
    return Math.round(
      projects.reduce((total, project) => total + project.progress, 0) /
        projects.length,
    );
  }

  function calculateRisk(state, project, now = new Date()) {
    if (!project) {
      return {
        level: "low",
        score: 0,
        reason: "尚无项目数据。",
        suggestions: ["创建一个项目，AI 将开始持续分析。"],
        metrics: {},
      };
    }
    if (project.status === "completed") {
      return {
        level: "low",
        score: 0,
        reason: "项目已完成，当前不存在执行风险。",
        suggestions: ["进入 Archive 完成项目复盘。"],
        metrics: { progress: project.progress, remainingDays: 0 },
      };
    }

    const missions = getProjectMissions(state, project.id);
    const stats = calculateProjectProgress(state, project.id, now);
    const remainingMinutes = missions
      .filter((mission) => mission.status !== "completed")
      .reduce(
        (total, mission) => total + Number(mission.estimatedMinutes || 0),
        0,
      );
    const highPriorityOpen = missions.filter(
      (mission) =>
        mission.status !== "completed" &&
        ["high", "critical"].includes(mission.priority),
    ).length;
    const days = store.daysRemaining(project.deadline, now);
    const incompleteRatio = stats.total
      ? (stats.total - stats.completed) / stats.total
      : 0;
    const capacity = Math.max(
      60,
      Number(state.settings.dailyCapacityMinutes) || 360,
    );
    const availableMinutes = Math.max(capacity, days * capacity);
    const workloadRatio = remainingMinutes / Math.max(1, availableMinutes);
    let score = 0;

    if (days < 0) score += 5;
    else if (days <= 2) score += 4;
    else if (days <= 5) score += 3;
    else if (days <= 10) score += 2;
    else if (days <= 16) score += 1;

    if (incompleteRatio > 0.75) score += 3;
    else if (incompleteRatio > 0.5) score += 2;
    else if (incompleteRatio > 0.25) score += 1;

    if (stats.overdue) score += Math.min(3, 1 + stats.overdue * 0.35);
    if (highPriorityOpen > 5) score += 2;
    else if (highPriorityOpen > 2) score += 1;
    if (workloadRatio > 1.65) score += 3;
    else if (workloadRatio > 1.1) score += 2;
    else if (workloadRatio > 0.82) score += 1;
    if (stats.progress >= 75) score -= 1;
    if (!stats.total) score += 1;

    let level = "low";
    if (score >= 9 || days < 0) level = "critical";
    else if (score >= 6) level = "high";
    else if (score >= 3) level = "medium";

    const reasonParts = [
      `当前完成度 ${stats.progress}%`,
      days < 0
        ? `已超过截止日期 ${Math.abs(days)} 天`
        : days === 0
          ? "今天到期"
          : `距离截止日期还有 ${days} 天`,
      `仍有 ${stats.total - stats.completed} 个任务未完成`,
    ];
    if (stats.overdue) reasonParts.push(`${stats.overdue} 个任务已延期`);

    const suggestions = [];
    if (stats.overdue) {
      suggestions.push("先处理已经延期的任务，重新确认它们是否仍属于核心范围。");
    }
    if (highPriorityOpen > 2) {
      suggestions.push(
        `当前有 ${highPriorityOpen} 个高优先级任务，优先完成 AI 核心与可演示功能。`,
      );
    }
    if (workloadRatio > 0.82) {
      suggestions.push("压缩非核心功能，并按今日容量重排剩余任务。");
    }
    if (!suggestions.length) {
      suggestions.push("保持当前节奏，并优先推进关键阶段任务。");
    }

    return {
      level,
      score: Math.round(score * 10) / 10,
      reason: `${reasonParts.join("，")}。`,
      suggestions,
      metrics: {
        progress: stats.progress,
        remainingDays: days,
        openMissions: stats.total - stats.completed,
        overdueMissions: stats.overdue,
        highPriorityOpen,
        remainingMinutes,
        workloadRatio: Math.round(workloadRatio * 100) / 100,
      },
    };
  }

  function recalculateState(state) {
    state.milestones.forEach((milestone) => {
      const milestoneStats = calculateMilestoneProgress(state, milestone.id);
      milestone.progress = milestoneStats.progress;
      milestone.status = milestoneStats.status;
      milestone.taskIds = getMilestoneMissions(state, milestone.id).map(
        (mission) => mission.id,
      );
    });
    state.projects.forEach((project) => {
      const projectStats = calculateProjectProgress(state, project.id);
      const allMissionsComplete =
        projectStats.total > 0 && projectStats.completed === projectStats.total;
      project.progress = projectStats.progress;
      project.riskLevel = calculateRisk(state, project).level;
      project.milestoneIds = getProjectMilestones(state, project.id).map(
        (milestone) => milestone.id,
      );
      if (allMissionsComplete && project.status !== "completed") {
        project.status = "completed";
        project.completionMode = "automatic";
        project.completedAt = store.nowISO();
        project.updatedAt = project.completedAt;
        if (
          !state.reviews.some((review) => review.projectId === project.id)
        ) {
          const review = reviewProject(state, project.id);
          if (review) state.reviews.unshift(review);
        }
      } else if (
        !allMissionsComplete &&
        project.status === "completed" &&
        project.completionMode === "automatic"
      ) {
        project.status = "active";
        project.completionMode = null;
        project.completedAt = null;
      }
    });
    state.objectives.forEach((objective) => {
      objective.progress = calculateObjectiveProgress(state, objective.id);
      const projects = state.projects.filter((project) =>
        objective.projectIds.includes(project.id),
      );
      if (
        projects.length &&
        projects.every((project) => project.status === "completed")
      ) {
        objective.status = "completed";
      } else if (objective.status === "completed") {
        objective.status = "active";
      }
    });
    return state;
  }

  function analyzeProject(state, projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return null;
    const risk = calculateRisk(state, project);
    const stats = calculateProjectProgress(state, projectId);
    const missions = getProjectMissions(state, projectId);
    const overdue = missions.filter(
      (mission) => getMissionState(mission) === "overdue",
    );
    const nextMission = generateTodayMissions(state, { limit: 1 })[0] || null;
    const report = {
      projectId,
      type: "risk",
      riskLevel: risk.level,
      summary: `项目风险：${
        {
          low: "低风险",
          medium: "中风险",
          high: "高风险",
          critical: "严重风险",
        }[risk.level] || "需要关注"
      }`,
      reason: risk.reason,
      suggestions: risk.suggestions,
      nextAction: nextMission
        ? `下一步执行：${nextMission.title}`
        : "所有任务已完成，可以进入项目复盘。",
      stats: {
        ...stats,
        overdue: overdue.length,
        progress: project.progress,
        riskScore: risk.score,
      },
      createdAt: store.nowISO(),
    };
    return report;
  }

  function scoreTodayMission(state, mission, now = new Date()) {
    const project = state.projects.find(
      (item) => item.id === mission.projectId,
    );
    const days = store.daysRemaining(mission.deadline, now);
    const riskLevel = project ? calculateRisk(state, project).level : "medium";
    let score = priorityWeight[mission.priority] * 12;
    score += riskWeight[riskLevel] * 10;
    if (days < 0) score += 120;
    else if (days === 0) score += 95;
    else if (days === 1) score += 75;
    else if (days <= 3) score += 55;
    else if (days <= 7) score += 30;
    else score += Math.max(0, 18 - days);
    if (mission.status === "in_progress") score += 26;
    if (mission.aiGenerated) score += 4;
    score -= Math.min(18, Number(mission.estimatedMinutes || 60) / 18);
    return score;
  }

  function generateTodayMissions(state, options = {}) {
    const limit = options.limit || 5;
    const now = options.now || new Date();
    const completedToday = new Set(
      state.missions
        .filter((mission) => {
          if (!mission.completedAt) return false;
          return store.toISODate(mission.completedAt) === store.toISODate(now);
        })
        .map((mission) => mission.id),
    );
    return state.missions
      .filter((mission) => {
        const project = state.projects.find(
          (item) => item.id === mission.projectId,
        );
        return (
          mission.status !== "completed" &&
          project &&
          project.status !== "completed" &&
          !completedToday.has(mission.id)
        );
      })
      .map((mission) => ({
        ...mission,
        computedStatus: getMissionState(mission, now),
        dayScore: scoreTodayMission(state, mission, now),
      }))
      .sort((a, b) => b.dayScore - a.dayScore)
      .slice(0, limit);
  }

  function todayLoad(missions) {
    const minutes = missions.reduce(
      (total, mission) => total + Number(mission.estimatedMinutes || 0),
      0,
    );
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!minutes) return "0 分钟";
    if (!hours) return `${rest} 分钟`;
    if (!rest) return `${hours} 小时`;
    return `${hours} 小时 ${rest} 分钟`;
  }

  function getNotifications(state, now = new Date()) {
    const notifications = [];
    const overdue = state.missions.filter(
      (mission) =>
        mission.status !== "completed" &&
        store.daysRemaining(mission.deadline, now) < 0,
    );
    if (overdue.length) {
      notifications.push({
        level: "critical",
        title: "任务已延期",
        message: `${overdue.length} 个任务已经延期。`,
      });
    }

    const dueSoonHigh = state.missions.filter(
      (mission) =>
        mission.status !== "completed" &&
        ["high", "critical"].includes(mission.priority) &&
        store.daysRemaining(mission.deadline, now) >= 0 &&
        store.daysRemaining(mission.deadline, now) <= 3,
    );
    if (dueSoonHigh.length) {
      notifications.push({
        level: "high",
        title: "高优先级任务临近截止",
        message: `${dueSoonHigh.length} 个高优先级任务将在 3 天内到期。`,
      });
    }

    state.projects.forEach((project) => {
      const risk = calculateRisk(state, project, now);
      if (["high", "critical"].includes(risk.level)) {
        notifications.push({
          level: risk.level,
          title: `${project.title} / ${
            risk.level === "critical" ? "严重风险" : "高风险"
          }`,
          message: risk.reason,
        });
      }
      const updated = store.parseDate(project.updatedAt);
      if (
        project.status === "active" &&
        updated &&
        (now.getTime() - updated.getTime()) / (24 * 60 * 60 * 1000) >= 3
      ) {
        notifications.push({
          level: "medium",
          title: "项目长期未更新",
          message: `${project.title} 已连续 3 天没有更新。`,
        });
      }
    });
    return notifications.slice(0, 4);
  }

  function inferProjectTitle(prompt) {
    const quoted = prompt.match(/[「“"]([^」”"]{2,40})[」”"]/);
    if (quoted) return quoted[1].trim();
    if (/失物|招领/.test(prompt)) return "AI 智能失物匹配";
    if (/学习|课程/.test(prompt)) return "AI 学习系统";
    if (/比赛|竞赛|iCAN/i.test(prompt)) return "AI 竞赛项目";
    if (/校园/.test(prompt)) return "校园 AI 项目";
    if (/网站|web|应用/i.test(prompt)) return "AI Web 应用";
    return "AI 新目标项目";
  }

  function extractDays(prompt, fallback = 21) {
    const match =
      prompt.match(/(?:还有|剩|在|于|第)?\s*(\d{1,3})\s*天(?:后|内)?/) ||
      prompt.match(/(\d{1,3})\s*DAYS?/i);
    if (!match) return fallback;
    return clamp(Number(match[1]), 1, 365);
  }

  function extractObjective(prompt) {
    const clean = prompt
      .replace(/\s+/g, " ")
      .replace(/^我想|^我要|^需要|^计划/, "")
      .trim();
    return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean;
  }

  function buildDefaultPhases(title, deadline) {
    const days = Math.max(7, store.daysRemaining(deadline));
    const phaseNames = [
      ["idea", "构思", "确认真实问题、目标用户与产品边界。", 0.14, ["确定用户痛点", "确定目标用户", "完成产品定位"]],
      ["design", "设计", "建立产品结构、原型和核心视觉。", 0.3, ["完成产品原型", "定义核心流程", "完成界面设计"]],
      ["build", "搭建", "实现产品与 AI 核心能力。", 0.58, ["搭建基础工程", "实现核心功能", "接入 AI 能力"]],
      ["test", "测试", "验证核心流程并修复高风险问题。", 0.76, ["测试核心流程", "完成用户测试", "修复阻塞问题"]],
      ["demo", "演示", "压缩价值叙事并完成演示准备。", 0.9, [`完成 ${title} 演示`, "准备路演脚本"]],
      ["submit", "提交", "完成提交、答辩材料与最终检查。", 1, ["提交项目材料", "准备答辩材料"]],
    ];
    return phaseNames.map(([key, title, description, ratio, tasks]) => ({
      title,
      description,
      deadline: store.addDays(
        new Date(),
        Math.max(1, Math.round(days * ratio)),
      ),
      tasks: tasks.map((task, index) => ({
        title: task,
        estimatedMinutes: index === 0 ? 120 : 90,
        priority:
          key === "build" || key === "submit" ? "critical" : "high",
      })),
    }));
  }

  function parseProjectPrompt(prompt, now = new Date()) {
    const normalized = String(prompt || "").trim();
    const days = extractDays(normalized);
    const deadline = store.addDays(now, days);
    const title = inferProjectTitle(normalized);
    const objective = extractObjective(normalized) || `完成 ${title}`;
    return {
      title,
      description: objective,
      objectiveTitle: objective,
      deadline,
      startDate: store.toISODate(now),
      priority: days <= 20 ? "critical" : "high",
      phases: buildDefaultPhases(title, deadline),
      sourcePrompt: normalized,
    };
  }

  function breakdownGoal(input, project) {
    const goal = String(input || "").trim();
    const isCompetition = /比赛|竞赛|demo|答辩/i.test(goal);
    const isWebsite = /网站|web|平台|应用/i.test(goal);
    const tasks = isCompetition
      ? [
          ["确定项目方向", 90, "critical"],
          ["确定目标用户", 60, "high"],
          ["完成产品定位", 90, "high"],
          ["完成 UI 原型", 150, "high"],
          ["搭建首页", 180, "critical"],
          ["搭建项目系统", 210, "critical"],
          ["接入 AI", 240, "critical"],
          ["测试核心流程", 150, "high"],
          ["修复问题", 120, "high"],
          ["完成 Demo", 180, "critical"],
          ["准备答辩材料", 120, "high"],
        ]
      : isWebsite
        ? [
            ["明确页面结构", 90, "high"],
            ["完成核心视觉原型", 120, "high"],
            ["搭建前端页面", 180, "critical"],
            ["实现核心交互", 180, "critical"],
            ["接入 AI 或数据逻辑", 210, "critical"],
            ["测试与修复", 150, "high"],
            ["准备交付说明", 90, "medium"],
          ]
        : [
            [`明确：${goal}`, 60, "high"],
            ["拆分最终交付物", 90, "high"],
            ["完成关键路径", 180, "critical"],
            ["验证结果", 120, "high"],
            ["整理与提交", 90, "medium"],
          ];

    const milestones = getProjectMilestones(
      store.getState(),
      project ? project.id : "",
    );
    const safeDeadline =
      milestones[milestones.length - 1]?.deadline ||
      (project ? project.deadline : store.addDays(new Date(), 14));
    const today = new Date();
    const totalDays = Math.max(1, store.daysRemaining(safeDeadline, today));
    return tasks.map(([title, estimatedMinutes, priority], index) => ({
      title,
      description: `由 AI 从“${goal}”拆解生成。`,
      estimatedMinutes,
      priority,
      milestoneId:
        milestones[
          Math.min(
            milestones.length - 1,
            Math.floor((index / tasks.length) * milestones.length),
          )
        ]?.id || null,
      deadline: store.addDays(
        today,
        Math.max(1, Math.round(totalDays * ((index + 1) / tasks.length))),
      ),
      aiGenerated: true,
    }));
  }

  function criticalAnalysis(idea, options = {}) {
    const text = String(idea || "").trim();
    const requestedRound = Number(options.round) || 1;
    const round = ((requestedRound - 1) % 3 + 3) % 3 + 1;
    const problems = [];
    if (!/AI|人工智能|模型|匹配|识别|分析/i.test(text)) {
      problems.push("AI 没有进入核心业务流程，更像附加的功能标签。");
    }
    if (!/学生|用户|教师|社团|用户群/.test(text)) {
      problems.push("目标用户还不够明确，无法判断问题是否真实高频。");
    }
    if (/网站|平台|应用|系统/.test(text) && !/智能|自动|匹配|分析/.test(text)) {
      problems.push("当前方案以信息展示为主，现有工具可能已经可以替代。");
    }
    if (/积分|社区|聊天|商城|排行榜/.test(text)) {
      problems.push("扩展功能过多，会稀释核心价值并压缩可完成时间。");
    }
    const isLostAndFound = /失物|招领/.test(text);
    const variants = [
      {
        problems: [
          "核心价值仍停留在功能描述，没有证明用户会因此改变原有做法。",
          "需要拿出真实用户证据，证明方案明显优于微信群等现有替代方案。",
        ],
        critique:
          "先验证问题是否真实高频。如果现有工具已经足够，产品必须展示 AI 带来的结果差异，而不是增加一个新的信息入口。",
        improvedIdea: isLostAndFound
          ? "通过 AI 自动分析失物图片、地点和描述，实现失物与招领信息的智能匹配，并将匹配结果转化为可执行的认领流程。"
          : `把“${text || "当前想法"}”重写为：围绕一个明确用户和一个高频问题，让 AI 负责判断、匹配或生成，而不是只承担展示与聊天。`,
        principles: [
          "只保留一个核心用户和一条主流程。",
          "AI 必须影响结果，而不是停留在交互表面。",
          "用截止时间反推范围，先保证完整可演示。",
        ],
      },
      {
        problems: [
          "当前方案范围偏大，尚不足以证明可以在现有时间内完成并稳定演示。",
          "关键用户路径没有被定义为可测量的完成标准，容易把“做完页面”误当成“解决任务”。",
        ],
        critique:
          "按交付时间反推范围。先砍掉非核心模块，只保留从输入、AI 处理到结果落地的闭环，并为每一步设置可验证结果。",
        improvedIdea: isLostAndFound
          ? "在有限时间内只完成一条闭环：用户上传失物信息，AI 返回候选匹配与理由，用户完成确认或关闭匹配。"
          : `把“${text || "当前想法"}”压缩为一个可在期限内完成的最小闭环：一次输入、一次 AI 处理、一个可验证结果。`,
        principles: [
          "每个阶段都必须有可以演示的产物。",
          "优先完成决定成败的一条主链路。",
          "未被验证的扩展功能全部延后。",
        ],
      },
      {
        problems: [
          "项目缺少明确的数据反馈，无法持续证明 AI 比简单规则或人工处理更有效。",
          "创新性不能被一句概念说明替代，必须体现在判断质量、处理速度或完成结果上。",
        ],
        critique:
          "把项目改写成一个可验证假设：哪类用户在什么场景使用后，哪个关键指标得到改善。AI 的价值必须用结果而不是功能数量证明。",
        improvedIdea: isLostAndFound
          ? "以匹配准确率、认领完成率和平均找回时间为核心指标，构建 AI 失物匹配闭环，并用真实样本持续校正结果。"
          : `把“${text || "当前想法"}”改写为可验证假设：目标用户在特定场景使用后，AI 应明显改善一个核心结果指标。`,
        principles: [
          "每个核心功能都对应一个结果指标。",
          "只保留用户必须完成的关键决策。",
          "用真实样本验证 AI 输出，而非依赖主观判断。",
        ],
      },
    ];
    const variant = variants[round - 1];
    return {
      round,
      currentIdea: text || "尚未输入项目想法。",
      problems: [...variant.problems, ...problems].slice(0, 5),
      critique: variant.critique,
      improvedIdea: variant.improvedIdea,
      principles: variant.principles,
    };
  }

  function normalizeTaskTitle(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/[\s/_-]+/g, "")
      .replace(/完成|实现|搭建|进行/g, "");
  }

  function regeneratePlan(state, projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return null;
    const missions = getProjectMissions(state, projectId);
    const open = missions.filter((mission) => mission.status !== "completed");
    const lowValuePattern =
      /社区|积分|排行榜|商城|聊天|非核心|动画|美化|皮肤|扩展/;
    const corePattern =
      /AI|分析|匹配|核心|项目|任务|目标|测试|Demo|答辩|提交/i;
    const removed = [];
    const kept = [];
    const seen = new Map();

    open.forEach((mission) => {
      if (
        lowValuePattern.test(mission.title) &&
        !corePattern.test(mission.title)
      ) {
        removed.push({ ...mission });
        return;
      }
      const key = normalizeTaskTitle(mission.title);
      if (seen.has(key)) {
        removed.push({
          ...mission,
          mergedInto: seen.get(key).title,
        });
        return;
      }
      const copy = { ...mission };
      seen.set(key, copy);
      kept.push(copy);
    });

    kept.sort((a, b) => {
      const coreDelta =
        Number(corePattern.test(b.title)) - Number(corePattern.test(a.title));
      if (coreDelta) return coreDelta;
      const priorityDelta =
        priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDelta) return priorityDelta;
      return (
        store.parseDate(a.deadline).getTime() -
        store.parseDate(b.deadline).getTime()
      );
    });

    const planned = kept.map((mission, index) => {
      const ratio = kept.length <= 1 ? 1 : index / (kept.length - 1);
      const days = Math.max(0, store.daysRemaining(project.deadline));
      return {
        id: mission.id,
        title: mission.title,
        newDeadline: store.addDays(
          new Date(),
          Math.max(0, Math.round(days * ratio)),
        ),
        newPriority: corePattern.test(mission.title) ? "critical" : mission.priority,
        estimatedMinutes: Math.min(
          180,
          Math.max(45, Number(mission.estimatedMinutes || 60)),
        ),
      };
    });

    const originalMinutes = open.reduce(
      (total, mission) => total + Number(mission.estimatedMinutes || 0),
      0,
    );
    const nextMinutes = planned.reduce(
      (total, mission) => total + mission.estimatedMinutes,
      0,
    );
    const capacity = Math.max(
      60,
      Number(state.settings.dailyCapacityMinutes) || 360,
    );
    const days = Math.max(1, store.daysRemaining(project.deadline));
    const probability = clamp(
      Math.round(
        100 -
          (nextMinutes / (days * capacity)) * 35 -
          removed.length * 2 -
          (store.daysRemaining(project.deadline) < 0 ? 25 : 0),
      ),
      20,
      96,
    );

    return {
      projectId,
      removed,
      planned,
      summary: {
        originalTaskCount: open.length,
        nextTaskCount: planned.length,
        originalMinutes,
        nextMinutes,
        completionProbability: probability,
      },
      rationale: [
        removed.length
          ? `移除了 ${removed.length} 个低价值或重复任务。`
          : "当前没有需要删除的低价值任务。",
        "提高核心任务的优先级，并按剩余天数重新分配截止时间。",
        "保留 AI、项目执行、测试、Demo 与提交链路。",
      ],
      generatedAt: store.nowISO(),
    };
  }

  function applyPlan(plan) {
    if (!plan || !plan.projectId) return false;
    plan.removed.forEach((mission) => store.deleteMission(mission.id));
    plan.planned.forEach((item) => {
      store.updateMission(item.id, {
        deadline: item.newDeadline,
        priority: item.newPriority,
        estimatedMinutes: item.estimatedMinutes,
      });
    });
    return true;
  }

  function reviewProject(state, projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return null;
    const stats = calculateProjectProgress(state, projectId);
    const risk = calculateRisk(state, project);
    const missions = getProjectMissions(state, projectId);
    const aiRatio = missions.length
      ? missions.filter((mission) => mission.aiGenerated).length /
        missions.length
      : 0;
    const titleSignal = /AI|智能|匹配|分析|自动化/i.test(
      `${project.title} ${project.description}`,
    )
      ? 12
      : 0;
    const innovation = clamp(
      Math.round(58 + titleSignal + stats.progress * 0.18 - (risk.score || 0)),
      42,
      94,
    );
    const technology = clamp(
      Math.round(48 + stats.progress * 0.38 + aiRatio * 10),
      45,
      95,
    );
    const practicalValue = clamp(
      Math.round(66 + stats.progress * 0.22),
      50,
      94,
    );
    const userExperience = clamp(
      Math.round(58 + stats.progress * 0.28),
      48,
      93,
    );
    const presentation = clamp(
      Math.round(
        46 +
          (missions.filter((mission) => mission.status === "completed").length /
            Math.max(1, missions.length)) *
            34,
      ),
      40,
      92,
    );
    const scores = {
      innovation,
      technology,
      practicalValue,
      userExperience,
      presentation,
    };
    const total = Math.round(
      (innovation * 0.22 +
        technology * 0.24 +
        practicalValue * 0.2 +
        userExperience * 0.18 +
        presentation * 0.16),
    );
    const overdue = missions.filter(
      (mission) => getMissionState(mission) === "overdue",
    ).length;
    const biggestAdvantage =
      aiRatio >= 0.6
        ? "AI 已进入项目拆解、风险分析与执行规划等核心流程。"
        : "项目已经形成从目标到任务执行的基本结构。";
    const biggestProblem =
      risk.level === "critical" || risk.level === "high"
        ? "剩余任务与当前时间不匹配，交付风险偏高。"
        : presentation < 70
          ? "功能已经形成，但展示价值和完整叙事仍不够集中。"
          : "创新点和技术价值还需通过真实用户证据进一步验证。";
    return {
      projectId,
      scores,
      total,
      biggestAdvantage,
      biggestProblem,
      improvements: [
        "用一条完整用户流程证明 AI 确实改变了结果，而不是增加一个入口。",
        "把演示范围压缩到最关键的三步，并准备稳定演示数据。",
        risk.level === "high" || risk.level === "critical"
          ? "删除低价值任务，优先保证核心链路按时可演示。"
          : "补充真实用户测试结果，强化项目的实际价值证据。",
      ],
      progress: project.progress,
      riskLevel: risk.level,
      completedMissions: stats.completed,
      overdueMissions: overdue,
      conclusion:
        total >= 82
          ? "项目整体完成度较高，已经具备清晰的技术与展示基础。"
          : total >= 70
            ? "项目框架完整，但 AI 与真实业务价值的结合仍需加强。"
            : "当前项目仍处于结构验证阶段，应先保证核心流程完整闭环。",
      createdAt: store.nowISO(),
    };
  }

  function durationDays(project) {
    const start = store.parseDate(project.startDate);
    const end = store.parseDate(project.deadline);
    if (!start || !end) return 0;
    return Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
    );
  }

  function archiveReview(state, projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return null;
    const existing = state.reviews.find(
      (review) => review.projectId === projectId,
    );
    const evaluation = existing || reviewProject(state, projectId);
    const stats = calculateProjectProgress(state, projectId);
    const missions = getProjectMissions(state, projectId);
    const overdue = missions.filter(
      (mission) => getMissionState(mission) === "overdue",
    ).length;
    return {
      projectId,
      projectTitle: project.title,
      completedAt: project.completedAt || project.updatedAt || store.nowISO(),
      originalObjective:
        state.objectives.find((objective) => objective.id === project.objectiveId)
          ?.description || project.description,
      finalProgress: project.progress,
      completedMissions: stats.completed,
      overdueMissions: overdue,
      aiScore: evaluation?.total || 0,
      durationDays: durationDays(project),
      whatWentWell: [
        `${stats.completed} 个任务已经完成，并形成了可追踪的执行记录。`,
        "AI 已经参与任务拆解、风险判断和执行优先级排序。",
      ],
      whatWentWrong: overdue
        ? [`有 ${overdue} 个任务延期，说明早期时间估算和范围控制需要收紧。`]
        : ["项目未出现任务延期，但后期展示与验证时间仍可进一步压缩。"],
      whatYouLearned: [
        "目标必须转化为有截止时间和预计耗时的可执行任务。",
        "项目风险不是主观判断，而是进度、时间和剩余工作量的共同结果。",
      ],
      nextRecommendation:
        "下一个项目从更小的核心用户问题开始，先验证 AI 对结果的决定性作用，再扩展功能。",
    };
  }

  function getDashboard(state) {
    const activeObjective =
      state.objectives.find((objective) => objective.status === "active") ||
      state.objectives[0] ||
      null;
    const activeProjects = state.projects.filter(
      (project) => project.status === "active",
    );
    const primaryProject =
      activeProjects.find((project) =>
        activeObjective
          ? activeObjective.projectIds.includes(project.id)
          : true,
      ) ||
      activeProjects[0] ||
      state.projects[0] ||
      null;
    const today = generateTodayMissions(state, { limit: 5 });
    const risk = primaryProject
      ? calculateRisk(state, primaryProject)
      : calculateRisk(state, null);
    return {
      activeObjective,
      primaryProject,
      activeProjectCount: activeProjects.length,
      today,
      todayLoad: todayLoad(today),
      risk,
      notifications: getNotifications(state),
    };
  }

  window.NEXUS_ENGINE = {
    priorityWeight,
    clamp,
    percent,
    getMissionState,
    getMilestoneMissions,
    getProjectMissions,
    getProjectMilestones,
    calculateMilestoneProgress,
    calculateProjectProgress,
    calculateObjectiveProgress,
    calculateRisk,
    recalculateState,
    analyzeProject,
    generateTodayMissions,
    todayLoad,
    getNotifications,
    parseProjectPrompt,
    breakdownGoal,
    criticalAnalysis,
    regeneratePlan,
    applyPlan,
    reviewProject,
    archiveReview,
    getDashboard,
    durationDays,
  };
})();
