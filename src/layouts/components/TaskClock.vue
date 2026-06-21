<template>
  <div class="task-clock-container">
    <div class="clock-header">
      <div class="clock-icon">
        <i class="el-icon-time" :class="{ 'clock-pulse': taskStore.isClockRunning }" />
      </div>
      <div class="clock-info">
        <h3>任务时钟</h3>
        <p class="clock-status">
          <el-tag v-if="taskStore.isClockRunning" type="success" size="small">运行中</el-tag>
          <el-tag v-else type="info" size="small">空闲</el-tag>
          <span class="total-time">总耗时: {{ formatTotalTime(taskStore.globalTime) }}</span>
        </p>
      </div>
      <div class="clock-stats">
        <div class="stat-item">
          <span class="stat-label">队列</span>
          <span class="stat-value">{{ taskStore.queueLength }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">剩余</span>
          <span class="stat-value">{{ formatDuration(taskStore.estimatedTotalTime) }}</span>
        </div>
      </div>
    </div>

    <div v-if="taskStore.currentTask" class="current-task">
      <div class="task-header">
        <div class="task-icon">{{ taskStore.currentTask.icon }}</div>
        <div class="task-info">
          <h4>{{ taskStore.currentTask.name }}</h4>
          <p class="task-desc">{{ taskStore.currentTask.description }}</p>
        </div>
        <el-tag type="primary" size="small" effect="dark">执行中</el-tag>
      </div>
      <div class="task-progress">
        <el-progress
          :percentage="Math.floor(taskStore.currentTask.progress)"
          :status="taskStore.currentTask.progress >= 100 ? 'success' : ''"
          :stroke-width="8"
          :show-text="true"
        />
        <div class="progress-info">
          <span>已执行: {{ formatDuration(getElapsedTime(taskStore.currentTask)) }}</span>
          <span>剩余: {{ formatDuration(getRemainingTime(taskStore.currentTask)) }}</span>
        </div>
      </div>
      <div class="task-resources">
        <span class="resource-gain">
          <i class="el-icon-circle-plus" />
          预期获得: {{ formatResources(taskStore.currentTask.gain) }}
        </span>
      </div>
    </div>

    <div v-else class="no-task">
      <i class="el-icon-circle-check" />
      <span>当前没有执行中的任务</span>
    </div>

    <div v-if="taskStore.queuedTasks.length > 0" class="queue-section">
      <div class="queue-header">
        <h4>
          <i class="el-icon-s-unfold" />
          排队队列 ({{ taskStore.queuedTasks.length }})
        </h4>
      </div>
      <div class="queue-list">
        <div
          v-for="task in sortedQueuedTasks"
          :key="task.id"
          class="queue-item"
        >
          <div class="queue-position">{{ task.queuePosition }}</div>
          <div class="queue-icon">{{ task.icon }}</div>
          <div class="queue-info">
            <div class="queue-name">{{ task.name }}</div>
            <div class="queue-meta">
              <span><i class="el-icon-clock" /> {{ formatDuration(task.duration) }}</span>
              <span v-if="task.conflicts.length > 0" class="conflict-badge">
                <i class="el-icon-warning" /> 冲突: {{ task.conflicts.join('、') }}
              </span>
            </div>
          </div>
          <div class="queue-actions">
            <el-button
              type="danger"
              size="small"
              text
              @click="cancelTask(task.id)"
            >
              取消
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="taskStore.completedTasks.length > 0" class="completed-section">
      <div class="completed-header">
        <h4>
          <i class="el-icon-check" />
          已完成 ({{ taskStore.completedTasks.length }})
        </h4>
        <el-button type="text" size="small" @click="taskStore.clearCompleted()">
          清空
        </el-button>
      </div>
      <div class="completed-list">
        <div
          v-for="task in recentCompleted"
          :key="task.id"
          class="completed-item"
        >
          <span class="completed-icon">{{ task.icon }}</span>
          <span class="completed-name">{{ task.name }}</span>
          <el-tag type="success" size="small">完成</el-tag>
          <span class="completed-time">{{ formatTime(task.completedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTaskStore } from '../../store';
import { ElMessageBox } from 'element-plus';

const taskStore = useTaskStore();

const sortedQueuedTasks = computed(() => {
  return [...taskStore.queuedTasks].sort((a, b) => a.queuePosition - b.queuePosition);
});

const recentCompleted = computed(() => {
  return [...taskStore.completedTasks].reverse().slice(0, 5);
});

const formatDuration = (ms) => {
  if (ms <= 0) return '0秒';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
};

const formatTotalTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}时${minutes}分${seconds}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

const formatResources = (resources) => {
  const names = {
    food: '食物',
    water: '淡水',
    wood: '木材',
    stone: '石头'
  };
  return Object.entries(resources)
    .map(([k, v]) => `${v}${names[k] || k}`)
    .join('、') || '无';
};

const getElapsedTime = (task) => {
  if (!task.startedAt) return 0;
  return Date.now() - task.startedAt;
};

const getRemainingTime = (task) => {
  const elapsed = getElapsedTime(task);
  return Math.max(0, task.duration - elapsed);
};

const cancelTask = (taskId) => {
  ElMessageBox.confirm(
    '确定要取消这个任务吗？已消耗的资源将被退还。',
    '取消任务',
    {
      confirmButtonText: '确定',
      cancelButtonText: '再想想',
      type: 'warning'
    }
  ).then(() => {
    taskStore.cancelTask(taskId);
  }).catch(() => {});
};
</script>

<style scoped>
.task-clock-container {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 20px;
  color: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.clock-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.clock-icon {
  font-size: 36px;
  color: #409eff;
}

.clock-pulse {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

.clock-info {
  flex: 1;
}

.clock-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  color: #fff;
}

.clock-status {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.total-time {
  font-family: monospace;
}

.clock-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2px;
}

.stat-value {
  display: block;
  font-size: 14px;
  font-weight: bold;
  color: #409eff;
}

.current-task {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(64, 158, 255, 0.3);
}

.task-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.task-icon {
  font-size: 32px;
}

.task-info {
  flex: 1;
}

.task-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #fff;
}

.task-desc {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.task-progress {
  margin-bottom: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8px;
}

.task-resources {
  font-size: 13px;
}

.resource-gain {
  color: #67c23a;
  display: flex;
  align-items: center;
  gap: 4px;
}

.no-task {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 16px;
}

.no-task i {
  font-size: 24px;
  margin-right: 8px;
}

.queue-section,
.completed-section {
  margin-bottom: 16px;
}

.queue-header,
.completed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.queue-header h4,
.completed-header h4 {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  gap: 6px;
}

.queue-list {
  max-height: 200px;
  overflow-y: auto;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.queue-position {
  width: 24px;
  height: 24px;
  background: #e6a23c;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
}

.queue-icon {
  font-size: 20px;
}

.queue-info {
  flex: 1;
}

.queue-name {
  font-size: 13px;
  color: #fff;
  margin-bottom: 2px;
}

.queue-meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  gap: 12px;
}

.queue-meta span {
  display: flex;
  align-items: center;
  gap: 3px;
}

.conflict-badge {
  color: #f56c6c !important;
}

.completed-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.completed-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(103, 194, 58, 0.1);
  border-radius: 4px;
  font-size: 12px;
}

.completed-icon {
  font-size: 16px;
}

.completed-name {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
}

.completed-time {
  color: rgba(255, 255, 255, 0.4);
  font-family: monospace;
}

.queue-list::-webkit-scrollbar {
  width: 4px;
}

.queue-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.queue-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}
</style>
