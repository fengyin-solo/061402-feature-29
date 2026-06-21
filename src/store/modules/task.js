import { defineStore } from 'pinia';
import { ElMessage } from 'element-plus';

const generateId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  return `${remainingSeconds}秒`;
};

const checkResources = (resources, cost) => {
  for (const [resource, amount] of Object.entries(cost)) {
    if ((resources[resource] || 0) < amount) {
      return false;
    }
  }
  return true;
};

const consumeResources = (resources, cost) => {
  const newResources = { ...resources };
  for (const [resource, amount] of Object.entries(cost)) {
    newResources[resource] = (newResources[resource] || 0) - amount;
  }
  return newResources;
};

const addResources = (resources, gain) => {
  const newResources = { ...resources };
  for (const [resource, amount] of Object.entries(gain)) {
    newResources[resource] = (newResources[resource] || 0) + amount;
  }
  return newResources;
};

export default defineStore('task', {
  state: () => ({
    taskQueue: [],
    currentTask: null,
    completedTasks: [],
    isClockRunning: false,
    globalTime: 0,
    tickInterval: 100,
    clockTimer: null,
    resources: {
      food: 100,
      water: 100,
      wood: 100,
      stone: 100
    },
    messageLog: [],
    onTaskComplete: null,
    onResourcesUpdate: null,
    onMessageAdd: null
  }),

  getters: {
    queuedTasks: (state) => state.taskQueue.filter(t => t.status === 'queued'),
    runningTask: (state) => state.currentTask,
    hasActiveTask: (state) => state.currentTask !== null,
    queueLength: (state) => state.taskQueue.filter(t => t.status === 'queued').length,
    totalTaskCount: (state) => state.taskQueue.length + (state.currentTask ? 1 : 0),
    estimatedTotalTime: (state) => {
      let total = 0;
      if (state.currentTask) {
        total += state.currentTask.duration * (1 - state.currentTask.progress / 100);
      }
      state.taskQueue
        .filter(t => t.status === 'queued')
        .forEach(t => { total += t.duration; });
      return total;
    }
  },

  actions: {
    setResources(resources) {
      this.resources = { ...resources };
    },

    setCallbacks({ onTaskComplete, onResourcesUpdate, onMessageAdd }) {
      this.onTaskComplete = onTaskComplete;
      this.onResourcesUpdate = onResourcesUpdate;
      this.onMessageAdd = onMessageAdd;
    },

    addMessage(content) {
      if (this.onMessageAdd) {
        this.onMessageAdd(content);
      }
    },

    updateResources(resources) {
      this.resources = { ...resources };
      if (this.onResourcesUpdate) {
        this.onResourcesUpdate(this.resources);
      }
    },

    checkConflicts(taskConfig) {
      const conflicts = [];
      if (this.currentTask) {
        if (taskConfig.conflicts.includes(this.currentTask.name) ||
            this.currentTask.conflicts.includes(taskConfig.name)) {
          conflicts.push(this.currentTask.name);
        }
      }
      this.taskQueue
        .filter(t => t.status === 'queued')
        .forEach(t => {
          if (taskConfig.conflicts.includes(t.name) || t.conflicts.includes(taskConfig.name)) {
            if (!conflicts.includes(t.name)) {
              conflicts.push(t.name);
            }
          }
        });
      return conflicts;
    },

    canAddTask(taskConfig) {
      if (!checkResources(this.resources, taskConfig.cost)) {
        return { canAdd: false, reason: '资源不足' };
      }
      const conflicts = this.checkConflicts(taskConfig);
      if (conflicts.length > 0) {
        return { canAdd: false, reason: `与以下任务冲突: ${conflicts.join('、')}` };
      }
      return { canAdd: true };
    },

    addTask(taskConfig) {
      const check = this.canAddTask(taskConfig);
      if (!check.canAdd) {
        ElMessage.error(check.reason);
        return null;
      }

      const newResources = consumeResources(this.resources, taskConfig.cost);
      this.updateResources(newResources);

      const task = {
        id: generateId(),
        ...taskConfig,
        status: 'queued',
        progress: 0,
        queuePosition: this.taskQueue.filter(t => t.status === 'queued').length + 1,
        createdAt: Date.now()
      };

      this.taskQueue.push(task);
      this.addMessage(`任务「${task.name}」已加入队列，排在第${task.queuePosition}位`);

      if (!this.currentTask) {
        this.processNextTask();
      }

      return task;
    },

    processNextTask() {
      const queued = this.taskQueue.filter(t => t.status === 'queued');
      if (queued.length === 0) {
        this.currentTask = null;
        this.stopClock();
        return;
      }

      const nextTask = queued.sort((a, b) => a.queuePosition - b.queuePosition)[0];
      nextTask.status = 'running';
      nextTask.progress = 0;
      nextTask.startedAt = Date.now();
      this.currentTask = nextTask;

      this.addMessage(`开始执行「${nextTask.name}」，预计耗时${formatDuration(nextTask.duration)}`);
      this.startClock();
    },

    startClock() {
      if (this.isClockRunning) return;
      this.isClockRunning = true;
      this.clockTimer = setInterval(() => {
        this.tick();
      }, this.tickInterval);
    },

    stopClock() {
      if (this.clockTimer) {
        clearInterval(this.clockTimer);
        this.clockTimer = null;
      }
      this.isClockRunning = false;
    },

    tick() {
      this.globalTime += this.tickInterval;

      if (this.currentTask) {
        const elapsed = Date.now() - this.currentTask.startedAt;
        const progress = Math.min(100, (elapsed / this.currentTask.duration) * 100);
        this.currentTask.progress = progress;

        if (progress >= 100) {
          this.completeCurrentTask();
        }
      }
    },

    completeCurrentTask() {
      if (!this.currentTask) return;

      const task = this.currentTask;
      task.status = 'completed';
      task.progress = 100;
      task.completedAt = Date.now();

      const newResources = addResources(this.resources, task.gain);
      this.updateResources(newResources);

      this.completedTasks.push(task);
      this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);

      const gainText = Object.entries(task.gain)
        .map(([k, v]) => `${v}${this.getResourceName(k)}`)
        .join('、') || '无';

      this.addMessage(`「${task.name}」完成！获得: ${gainText}`);
      ElMessage.success(`「${task.name}」完成！`);

      if (this.onTaskComplete) {
        this.onTaskComplete(task, this.resources);
      }

      this.taskQueue
        .filter(t => t.status === 'queued')
        .forEach((t, index) => {
          t.queuePosition = index + 1;
        });

      this.currentTask = null;
      this.processNextTask();
    },

    cancelTask(taskId) {
      const taskIndex = this.taskQueue.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return false;

      const task = this.taskQueue[taskIndex];

      if (task.status === 'running') {
        ElMessage.error('无法取消正在执行的任务');
        return false;
      }

      if (task.status === 'queued') {
        const refundResources = addResources(this.resources, task.cost);
        this.updateResources(refundResources);

        task.status = 'cancelled';
        this.taskQueue.splice(taskIndex, 1);

        this.taskQueue
          .filter(t => t.status === 'queued')
          .forEach((t, index) => {
            t.queuePosition = index + 1;
          });

        this.addMessage(`已取消「${task.name}」，消耗的资源已退还`);
        return true;
      }

      return false;
    },

    clearCompleted() {
      this.completedTasks = [];
    },

    getResourceName(type) {
      const names = {
        food: '食物',
        water: '淡水',
        wood: '木材',
        stone: '石头'
      };
      return names[type] || type;
    },

    reset() {
      this.stopClock();
      this.taskQueue = [];
      this.currentTask = null;
      this.completedTasks = [];
      this.globalTime = 0;
    }
  }
});
